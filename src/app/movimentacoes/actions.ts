"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PROBLEM_CODES, ProblemDetailsError } from "@/lib/api/errors";
import { mustRotateIdempotencyKey, newIdempotencyKey } from "@/lib/idempotency";
import { parseMoneyInput } from "@/lib/money";
import { accessTokenOrNull, isAuthFailure } from "@/lib/session";
import {
  createTransaction,
  createTransfer,
  updateTransactionCategory,
} from "@/lib/transactions/api";
import { isResourceUnavailable, transactionsErrorMessage } from "@/lib/transactions/messages";
import {
  createTransactionInputSchema,
  createTransferInputSchema,
  idempotencyKeySchema,
} from "@/lib/transactions/schema";
import type { MovementType, TransactionCategoryUpdate } from "@/lib/transactions/types";

const MOVIMENTACOES_PATH = "/movimentacoes";

const uuidSchema = z.uuid();

type FieldErrors = Record<string, string[] | undefined>;

/** Valores digitados, devolvidos para o formulario nao perder o que o usuario escreveu. */
export type FormValues = Record<string, string>;

export type MovementSummary =
  | {
      kind: "movement";
      type: MovementType;
      amount: string;
      accountId: string;
      categorizedByRule: boolean;
    }
  | { kind: "transfer"; amount: string; fromAccountId: string; toAccountId: string };

/**
 * Toda resposta carrega a Idempotency-Key do proximo envio: a mesma apos qualquer
 * falha (o backend so registra a chave quando cria a movimentacao) e uma nova apos
 * sucesso ou quando o backend recusa a chave (dados diferentes ou janela expirada).
 */
export type MovementFormState =
  | { status: "idle"; idempotencyKey: string }
  | { status: "success"; idempotencyKey: string; summary: MovementSummary }
  | { status: "invalid"; idempotencyKey: string; fieldErrors: FieldErrors; values: FormValues }
  | {
      status: "error";
      idempotencyKey: string;
      message: string;
      values: FormValues;
      reauth?: boolean;
    };

const AMOUNT_MESSAGE = "Informe um valor maior que zero, com ate duas casas decimais.";

// O backend responde `errors[].path` com o nome do campo e mensagem tecnica em ingles.
const FIELD_MESSAGES: Record<string, string> = {
  accountId: "Escolha uma conta.",
  fromAccountId: "Escolha a conta de origem.",
  toAccountId: "Escolha a conta de destino.",
  type: "Escolha receita ou despesa.",
  amount: AMOUNT_MESSAGE,
  occurredOn: "Informe uma data valida.",
  description: "Revise a descricao.",
};

export async function createTransactionAction(
  previous: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const values = readValues(formData, ["accountId", "type", "amount", "occurredOn", "description"]);
  const idempotencyKey = readIdempotencyKey(formData, previous);

  const amount = parseMoneyInput(values.amount);
  const parsed = createTransactionInputSchema.safeParse({ ...values, amount: amount ?? "" });
  if (!parsed.success || amount === null) {
    return invalid(idempotencyKey, values, parsed.success ? [] : parsed.error.issues, amount);
  }

  const token = await accessTokenOrNull();
  if (!token) return reauth(idempotencyKey, values);

  try {
    const transaction = await createTransaction(parsed.data, {
      accessToken: token,
      idempotencyKey,
    });
    revalidatePath(MOVIMENTACOES_PATH);
    return {
      status: "success",
      idempotencyKey: newIdempotencyKey(),
      summary: {
        kind: "movement",
        type: parsed.data.type,
        amount: transaction.amount,
        accountId: transaction.accountId,
        categorizedByRule: transaction.categorizationSource === "rule",
      },
    };
  } catch (error) {
    return failure(error, idempotencyKey, values, "Nao foi possivel registrar a movimentacao.");
  }
}

export async function createTransferAction(
  previous: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const values = readValues(formData, [
    "fromAccountId",
    "toAccountId",
    "amount",
    "occurredOn",
    "description",
  ]);
  const idempotencyKey = readIdempotencyKey(formData, previous);

  const amount = parseMoneyInput(values.amount);
  const parsed = createTransferInputSchema.safeParse({ ...values, amount: amount ?? "" });
  if (!parsed.success || amount === null) {
    return invalid(idempotencyKey, values, parsed.success ? [] : parsed.error.issues, amount);
  }

  const token = await accessTokenOrNull();
  if (!token) return reauth(idempotencyKey, values);

  try {
    const transfer = await createTransfer(parsed.data, { accessToken: token, idempotencyKey });
    const outgoing = transfer.entries.find((entry) => entry.transferSide === "outgoing");
    const incoming = transfer.entries.find((entry) => entry.transferSide === "incoming");
    revalidatePath(MOVIMENTACOES_PATH);
    return {
      status: "success",
      idempotencyKey: newIdempotencyKey(),
      summary: {
        kind: "transfer",
        amount: (outgoing ?? transfer.entries[0]).amount,
        fromAccountId: (outgoing ?? transfer.entries[0]).accountId,
        toAccountId: (incoming ?? transfer.entries[1]).accountId,
      },
    };
  } catch (error) {
    if (error instanceof ProblemDetailsError && error.code === PROBLEM_CODES.transferAccountsMustDiffer) {
      return {
        status: "invalid",
        idempotencyKey,
        values,
        fieldErrors: { toAccountId: [transactionsErrorMessage(error, FIELD_MESSAGES.toAccountId)] },
      };
    }
    return failure(error, idempotencyKey, values, "Nao foi possivel registrar a transferencia.");
  }
}

function readValues(formData: FormData, fields: string[]): FormValues {
  return Object.fromEntries(
    fields.map((field) => {
      const value = formData.get(field);
      return [field, typeof value === "string" ? value : ""];
    }),
  );
}

/** A chave vem de campo oculto e e entrada nao confiavel; invalida, vale a do estado anterior. */
function readIdempotencyKey(formData: FormData, previous: MovementFormState): string {
  const parsed = idempotencyKeySchema.safeParse(formData.get("idempotencyKey"));
  if (parsed.success) return parsed.data;
  const fallback = idempotencyKeySchema.safeParse(previous.idempotencyKey);
  return fallback.success ? fallback.data : newIdempotencyKey();
}

function invalid(
  idempotencyKey: string,
  values: FormValues,
  issues: readonly z.core.$ZodIssue[],
  amount: string | null,
): MovementFormState {
  // Refinements (`custom`) ja trazem mensagem propria em pt-BR; as demais mensagens do
  // Zod sao genericas e em ingles, entao cada campo usa a sua.
  const fieldErrors: FieldErrors = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (!field || fieldErrors[field]) continue;
    fieldErrors[field] = [
      issue.code === "custom" ? `${issue.message}.` : (FIELD_MESSAGES[field] ?? "Valor invalido."),
    ];
  }
  if (amount === null) fieldErrors.amount = [AMOUNT_MESSAGE];
  return { status: "invalid", idempotencyKey, values, fieldErrors };
}

function reauth(idempotencyKey: string, values: FormValues): MovementFormState {
  return {
    status: "error",
    idempotencyKey,
    values,
    reauth: true,
    message: "Sua sessao expirou. Entre novamente para continuar.",
  };
}

function failure(
  error: unknown,
  idempotencyKey: string,
  values: FormValues,
  fallback: string,
): MovementFormState {
  if (isAuthFailure(error)) {
    return {
      status: "error",
      idempotencyKey,
      values,
      reauth: true,
      message: transactionsErrorMessage(error, "Sua sessao expirou. Entre novamente."),
    };
  }

  if (mustRotateIdempotencyKey(error)) {
    return {
      status: "error",
      idempotencyKey: newIdempotencyKey(),
      values,
      message: transactionsErrorMessage(error, fallback),
    };
  }

  if (isResourceUnavailable(error)) {
    // A conta escolhida saiu da lista de ativas: recarrega o seletor.
    revalidatePath(MOVIMENTACOES_PATH);
    return { status: "error", idempotencyKey, values, message: transactionsErrorMessage(error, fallback) };
  }

  const fieldErrors = serverFieldErrors(error);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "invalid", idempotencyKey, values, fieldErrors };
  }

  // 5xx, falha de rede ou resposta fora do contrato: reenviar com a mesma chave e seguro.
  return {
    status: "error",
    idempotencyKey,
    values,
    message:
      error instanceof ProblemDetailsError
        ? transactionsErrorMessage(error, `${fallback} Tente de novo.`)
        : `${fallback} Tente de novo.`,
  };
}

function serverFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ProblemDetailsError) || error.status !== 400) return {};
  const fieldErrors: FieldErrors = {};
  for (const item of error.problem.errors ?? []) {
    const message = FIELD_MESSAGES[item.path];
    if (message && !fieldErrors[item.path]) fieldErrors[item.path] = [message];
  }
  return fieldErrors;
}

export type CategorizeState =
  | { status: "idle" }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string; reauth?: boolean };

/**
 * PATCH da categorizacao. `transactionId` chega via `.bind` e e reverificado pelo
 * backend (tenant, tipo e estado). O botao enviado define a intencao: aplicar a
 * categoria escolhida ou marcar como incerta/nao reconhecida.
 */
export async function categorizeTransactionAction(
  transactionId: string,
  _previous: CategorizeState,
  formData: FormData,
): Promise<CategorizeState> {
  const update = readCategorization(formData);
  if (!update) return { status: "invalid", message: "Escolha uma categoria ativa." };

  const token = await accessTokenOrNull();
  if (!token) {
    return { status: "error", reauth: true, message: "Sua sessao expirou. Entre novamente para continuar." };
  }

  try {
    await updateTransactionCategory(transactionId, update, { accessToken: token });
  } catch (error) {
    return categorizeFailure(error);
  }

  // A linha e redesenhada a partir da TransactionView relida do servidor.
  revalidatePath(MOVIMENTACOES_PATH);
  return { status: "idle" };
}

function readCategorization(formData: FormData): TransactionCategoryUpdate | null {
  const intent = formData.get("intent");
  if (intent === "uncertain" || intent === "unrecognized") {
    return { categorizationStatus: intent };
  }
  const categoryId = uuidSchema.safeParse(formData.get("categoryId"));
  return intent === "category" && categoryId.success ? { categoryId: categoryId.data } : null;
}

function categorizeFailure(error: unknown): CategorizeState {
  if (isAuthFailure(error)) {
    return {
      status: "error",
      reauth: true,
      message: transactionsErrorMessage(error, "Sua sessao expirou. Entre novamente."),
    };
  }
  if (error instanceof ProblemDetailsError) {
    switch (error.code) {
      case PROBLEM_CODES.categoryArchived:
        revalidatePath(MOVIMENTACOES_PATH);
        return {
          status: "error",
          message: "Esta categoria foi arquivada e nao pode mais ser atribuida. A lista foi atualizada; escolha outra.",
        };
      case PROBLEM_CODES.categoryNotFound:
      case PROBLEM_CODES.transactionNotFound:
      case PROBLEM_CODES.transactionCategorizationNotAllowed:
        revalidatePath(MOVIMENTACOES_PATH);
        return { status: "error", message: transactionsErrorMessage(error, CATEGORIZE_FALLBACK) };
    }
  }
  return { status: "error", message: CATEGORIZE_FALLBACK };
}

const CATEGORIZE_FALLBACK = "Nao foi possivel atualizar a categoria. Tente de novo.";
