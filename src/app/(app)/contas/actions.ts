"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import {
  createAccount,
  deactivateAccount,
  PossibleDuplicateAccountError,
  updateAccount,
} from "@/lib/accounts/api";
import {
  accountErrorMessage,
  fieldErrorsFromProblem,
  isAccountUnavailable,
} from "@/lib/accounts/messages";
import { buildAccountPatch } from "@/lib/accounts/patch";
import {
  accountIdSchema,
  accountSchema,
  manualAccountInputSchema,
} from "@/lib/accounts/schema";
import type { Account, DuplicateCandidate } from "@/lib/accounts/types";
import type { NoticeKey } from "./notices";

const CONTAS_PATH = "/contas";

type FieldErrors = Record<string, string[] | undefined>;

export type CreateAccountState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "invalid"; fieldErrors: FieldErrors }
  | { status: "duplicate"; candidates: DuplicateCandidate[] }
  | { status: "error"; message: string };

export type UpdateAccountState =
  | { status: "idle" }
  | { status: "unchanged" }
  | { status: "invalid"; fieldErrors: FieldErrors }
  | { status: "duplicate"; candidates: DuplicateCandidate[] }
  | { status: "error"; message: string };

export type DeactivateAccountState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function createAccountAction(
  _previous: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const parsed = manualAccountInputSchema.safeParse(readAccountForm(formData));

  if (!parsed.success) {
    return {
      status: "invalid",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { token } = await auth0.getAccessToken();
    await createAccount(parsed.data, { accessToken: token });
    revalidatePath(CONTAS_PATH);
    return { status: "success" };
  } catch (error) {
    if (error instanceof PossibleDuplicateAccountError) {
      return { status: "duplicate", candidates: error.candidates };
    }
    return serverFailure(error, "Não foi possível criar a conta.");
  }
}

/**
 * `accountId` e `original` chegam via `.bind` no cliente e sao tratados como entrada
 * nao confiavel: validados aqui e reverificados pelo backend (ownership e estado).
 */
export async function updateAccountAction(
  accountId: string,
  original: Account,
  _previous: UpdateAccountState,
  formData: FormData,
): Promise<UpdateAccountState> {
  const id = accountIdSchema.safeParse(accountId);
  const source = accountSchema.safeParse(original);
  if (!id.success || !source.success || source.data.id !== id.data) {
    return { status: "error", message: "Não foi possível salvar a conta." };
  }

  const parsed = manualAccountInputSchema.safeParse(readAccountForm(formData));
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const patch = buildAccountPatch(source.data, parsed.data);
  if (!patch) {
    return { status: "unchanged" };
  }
  if (parsed.data.confirmPossibleDuplicate) {
    patch.confirmPossibleDuplicate = true;
  }

  try {
    const { token } = await auth0.getAccessToken();
    await updateAccount(id.data, patch, { accessToken: token });
  } catch (error) {
    if (error instanceof PossibleDuplicateAccountError) {
      return { status: "duplicate", candidates: error.candidates };
    }
    if (!isAccountUnavailable(error)) {
      return serverFailure(error, "Não foi possível salvar a conta.");
    }
    // `redirect` lanca excecao: fica fora do try, conforme a documentacao do Next.
    return goToContas("conta-indisponivel");
  }

  return goToContas("conta-atualizada");
}

export async function deactivateAccountAction(
  accountId: string,
): Promise<DeactivateAccountState> {
  const id = accountIdSchema.safeParse(accountId);
  if (!id.success) {
    return { status: "error", message: "Não foi possível desativar a conta." };
  }

  let notice: NoticeKey = "conta-desativada";
  try {
    const { token } = await auth0.getAccessToken();
    await deactivateAccount(id.data, { accessToken: token });
  } catch (error) {
    if (!isAccountUnavailable(error)) {
      return {
        status: "error",
        message: accountErrorMessage(error, "Não foi possível desativar a conta."),
      };
    }
    notice = "conta-indisponivel";
  }

  return goToContas(notice);
}

function readAccountForm(formData: FormData) {
  return {
    name: formData.get("name"),
    type: formData.get("type"),
    institutionName: formData.get("institutionName"),
    initialBalance: formData.get("initialBalance"),
    initialBalanceAsOf: formData.get("initialBalanceAsOf"),
    confirmPossibleDuplicate: formData.get("confirmPossibleDuplicate") === "true",
  };
}

function serverFailure(
  error: unknown,
  fallback: string,
): { status: "invalid"; fieldErrors: FieldErrors } | { status: "error"; message: string } {
  const fieldErrors = fieldErrorsFromProblem(error);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "invalid",
      fieldErrors: Object.fromEntries(
        Object.entries(fieldErrors).map(([field, message]) => [field, [message]]),
      ),
    };
  }
  return { status: "error", message: accountErrorMessage(error, fallback) };
}

function goToContas(notice: NoticeKey): never {
  revalidatePath(CONTAS_PATH);
  redirect(`${CONTAS_PATH}?aviso=${notice}`, RedirectType.replace);
}
