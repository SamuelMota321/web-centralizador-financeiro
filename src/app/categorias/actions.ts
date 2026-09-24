"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { PROBLEM_CODES, ProblemDetailsError } from "@/lib/api/errors";
import { listAllPages } from "@/lib/api/pagination";
import {
  createCategory,
  deactivateCategory,
  listCategories,
  renameCategory,
} from "@/lib/categories/api";
import { categoryNameSchema } from "@/lib/categories/schema";
import { accessTokenOrNull, isAuthFailure } from "@/lib/session";
import { transactionsErrorMessage } from "@/lib/transactions/messages";
import { DUPLICATE_NAME_MESSAGE, hasNameConflict } from "./category-names";
import type { NoticeKey } from "./notices";

const CATEGORIAS_PATH = "/categorias";
const MOVIMENTACOES_PATH = "/movimentacoes";
const REAUTH_MESSAGE = "Sua sessao expirou. Entre novamente para continuar.";

export type CategoryFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "invalid"; name: string; message: string }
  | { status: "error"; name: string; message: string; reauth?: boolean };

export type ArchiveCategoryState =
  | { status: "idle" }
  | { status: "error"; message: string; reauth?: boolean };

export async function createCategoryAction(
  _previous: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const name = readName(formData);
  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success) return invalidName(name, parsed.error.issues[0]?.message);

  const token = await accessTokenOrNull();
  if (!token) return { status: "error", name, message: REAUTH_MESSAGE, reauth: true };
  const context = { accessToken: token };

  try {
    if (await nameTaken(parsed.data, context)) {
      return { status: "invalid", name, message: DUPLICATE_NAME_MESSAGE };
    }
    await createCategory({ name: parsed.data }, context);
  } catch (error) {
    return formFailure(error, name, "Nao foi possivel criar a categoria.");
  }

  revalidatePath(CATEGORIAS_PATH);
  revalidatePath(MOVIMENTACOES_PATH);
  return { status: "success" };
}

/** `categoryId` chega via `.bind` no cliente: e reverificado pelo backend (tenant e estado). */
export async function renameCategoryAction(
  categoryId: string,
  _previous: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const name = readName(formData);
  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success) return invalidName(name, parsed.error.issues[0]?.message);

  const token = await accessTokenOrNull();
  if (!token) return { status: "error", name, message: REAUTH_MESSAGE, reauth: true };
  const context = { accessToken: token };

  let notice: NoticeKey = "categoria-renomeada";
  try {
    if (await nameTaken(parsed.data, context, categoryId)) {
      return { status: "invalid", name, message: DUPLICATE_NAME_MESSAGE };
    }
    await renameCategory(categoryId, { name: parsed.data }, context);
  } catch (error) {
    if (!isCategoryUnavailable(error)) {
      return formFailure(error, name, "Nao foi possivel renomear a categoria.");
    }
    notice = "categoria-indisponivel";
  }

  // `redirect` lanca excecao: fica fora do try, conforme a documentacao do Next.
  return goToCategorias(notice);
}

export async function archiveCategoryAction(categoryId: string): Promise<ArchiveCategoryState> {
  const token = await accessTokenOrNull();
  if (!token) return { status: "error", message: REAUTH_MESSAGE, reauth: true };

  let notice: NoticeKey = "categoria-arquivada";
  try {
    await deactivateCategory(categoryId, { accessToken: token });
  } catch (error) {
    if (isAuthFailure(error)) {
      return { status: "error", message: REAUTH_MESSAGE, reauth: true };
    }
    if (!isCategoryUnavailable(error)) {
      return {
        status: "error",
        message: transactionsErrorMessage(error, "Nao foi possivel arquivar a categoria. Tente de novo."),
      };
    }
    notice = "categoria-indisponivel";
  }

  return goToCategorias(notice);
}

function readName(formData: FormData): string {
  const value = formData.get("name");
  return typeof value === "string" ? value : "";
}

function invalidName(name: string, message: string | undefined): CategoryFormState {
  return { status: "invalid", name, message: `${message ?? "Informe um nome valido"}.` };
}

/**
 * O backend responde 500 para nome repetido (indice unico sem tratamento @ fa9b62a).
 * A verificacao previne o caso comum; se a listagem falhar, o envio segue e o backend decide.
 */
async function nameTaken(
  name: string,
  context: { accessToken: string },
  exceptId?: string,
): Promise<boolean> {
  try {
    const { items } = await listAllPages((query) => listCategories(query, context));
    return hasNameConflict(name, items, exceptId);
  } catch (error) {
    if (isAuthFailure(error)) throw error;
    return false;
  }
}

function isCategoryUnavailable(error: unknown): boolean {
  return (
    error instanceof ProblemDetailsError &&
    (error.code === PROBLEM_CODES.categoryNotFound || error.code === PROBLEM_CODES.categoryArchived)
  );
}

function formFailure(error: unknown, name: string, fallback: string): CategoryFormState {
  if (isAuthFailure(error)) {
    return { status: "error", name, message: REAUTH_MESSAGE, reauth: true };
  }
  if (error instanceof ProblemDetailsError && error.status === 400) {
    // 400 sem `errors[]` na renomeacao indica categoria arquivada (InvalidCategoryState).
    const hasFieldErrors = (error.problem.errors ?? []).some((item) => item.path === "name");
    return hasFieldErrors
      ? { status: "invalid", name, message: "Use um nome entre 1 e 100 caracteres." }
      : {
          status: "error",
          name,
          message: "Esta categoria nao pode ser alterada. Se ela foi arquivada, recarregue a pagina.",
        };
  }
  // Inclui o 500 do nome repetido por corrida entre dois envios.
  return {
    status: "error",
    name,
    message: `${fallback} Se ja existe uma categoria com este nome, use outro. Tente de novo.`,
  };
}

function goToCategorias(notice: NoticeKey): never {
  revalidatePath(CATEGORIAS_PATH);
  revalidatePath(MOVIMENTACOES_PATH);
  redirect(`${CATEGORIAS_PATH}?aviso=${notice}`, RedirectType.replace);
}
