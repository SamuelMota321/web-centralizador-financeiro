"use server";

import { revalidatePath } from "next/cache";
import { ProblemDetailsError } from "@/lib/api/errors";
import { createPatrimony, getPatrimony, updatePatrimony } from "@/lib/patrimony/api";
import { changedFields, type FieldErrors, type FormValues, parsePatrimonyForm } from "@/lib/patrimony/form";
import {
  type InputByCollection,
  type ItemByCollection,
  PATRIMONY_COLLECTIONS,
  type PatrimonyCollection,
} from "@/lib/patrimony/types";
import { accessTokenOrNull, isAuthFailure } from "@/lib/session";

const PATH = "/patrimonio";
const REAUTH = "Sua sessão expirou. Entre novamente para continuar.";
const FIELDS = ["type", "description", "estimatedValue", "valuationDate", "source", "outstandingBalance", "assetId"] as const;

export type PatrimonyFormState =
  | { status: "idle" }
  | { status: "success"; at: number }
  | { status: "invalid"; values: FormValues; errors: FieldErrors; message?: string }
  | { status: "error"; values: FormValues; message: string; reauth?: boolean };

function readValues(formData: FormData): FormValues {
  const values: FormValues = {};
  for (const field of FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") values[field] = value;
  }
  return values;
}

function isCollection(value: string): value is PatrimonyCollection {
  return (PATRIMONY_COLLECTIONS as readonly string[]).includes(value);
}

/** Estado editável do item atual, no mesmo formato do formulário convertido. */
function editableState<C extends PatrimonyCollection>(item: ItemByCollection[C]): InputByCollection[C] {
  if (item.kind === "asset") {
    const { type, description, estimatedValue, valuationDate, source } = item;
    return { type, description, estimatedValue, valuationDate, source } as InputByCollection[C];
  }
  if (item.kind === "financing") {
    const { description, outstandingBalance, assetId } = item;
    return { description, outstandingBalance, assetId } as InputByCollection[C];
  }
  const { description, outstandingBalance } = item;
  return { description, outstandingBalance } as InputByCollection[C];
}

function failure(error: unknown, values: FormValues, fallback: string): PatrimonyFormState {
  if (isAuthFailure(error)) return { status: "error", values, message: REAUTH, reauth: true };
  if (error instanceof ProblemDetailsError) {
    if (error.status === 404) {
      return {
        status: "error",
        values,
        message: "Não encontramos este item ou o bem escolhido. Recarregue a página e tente de novo.",
      };
    }
    if (error.status === 400) {
      // O backend aponta o campo em `errors[].path`; o texto dele (inglês) nunca é exibido.
      const errors: FieldErrors = {};
      for (const item of error.problem.errors ?? []) {
        const field = item.path.split(/[./]/).filter(Boolean).at(-1);
        if (field && (FIELDS as readonly string[]).includes(field)) errors[field] = "O servidor recusou este valor. Revise o campo.";
      }
      return Object.keys(errors).length > 0
        ? { status: "invalid", values, errors }
        : { status: "error", values, message: `${fallback} Revise os dados e tente de novo.` };
    }
  }
  return { status: "error", values, message: `${fallback} Tente de novo.` };
}

export async function createPatrimonyAction(
  collection: PatrimonyCollection,
  _previous: PatrimonyFormState,
  formData: FormData,
): Promise<PatrimonyFormState> {
  const values = readValues(formData);
  if (!isCollection(collection)) return { status: "error", values, message: "Seção inválida." };
  const parsed = parsePatrimonyForm(collection, values);
  if (!parsed.ok) return { status: "invalid", values, errors: parsed.errors };

  const token = await accessTokenOrNull();
  if (!token) return { status: "error", values, message: REAUTH, reauth: true };

  try {
    await createPatrimony(collection, parsed.input, { accessToken: token });
  } catch (error) {
    return failure(error, values, "Não foi possível salvar.");
  }
  revalidatePath(PATH);
  return { status: "success", at: Date.now() };
}

/** `id` chega via `.bind` no cliente: o backend reconfere dono e existência. */
export async function updatePatrimonyAction(
  collection: PatrimonyCollection,
  id: string,
  _previous: PatrimonyFormState,
  formData: FormData,
): Promise<PatrimonyFormState> {
  const values = readValues(formData);
  if (!isCollection(collection)) return { status: "error", values, message: "Seção inválida." };
  const parsed = parsePatrimonyForm(collection, values);
  if (!parsed.ok) return { status: "invalid", values, errors: parsed.errors };

  const token = await accessTokenOrNull();
  if (!token) return { status: "error", values, message: REAUTH, reauth: true };
  const context = { accessToken: token };

  try {
    // Compara com o estado gravado agora, não com o que a tela tinha: envia só o que mudou.
    const current = await getPatrimony(collection, id, context);
    const patch = changedFields(editableState(current), parsed.input);
    if (Object.keys(patch).length === 0) {
      return { status: "invalid", values, errors: {}, message: "Nada foi alterado." };
    }
    await updatePatrimony(collection, id, patch, context);
  } catch (error) {
    return failure(error, values, "Não foi possível salvar as alterações.");
  }
  revalidatePath(PATH);
  return { status: "success", at: Date.now() };
}
