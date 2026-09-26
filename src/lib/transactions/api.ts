import { z } from "zod";
import { apiRequest } from "../api/http-client";
import { pageQuerySchema, type PageQuery } from "../api/pagination";
import { toProblemError } from "../api/problem-error";
import {
  createTransactionInputSchema,
  createTransferInputSchema,
  idempotencyKeySchema,
  transactionCategoryUpdateSchema,
  transactionPageSchema,
  transactionSchema,
  transferSchema,
} from "./schema";
import type {
  CreateTransactionInput,
  CreateTransferInput,
  Transaction,
  TransactionCategoryUpdate,
  TransactionPage,
  Transfer,
} from "./types";

/** Credencial da requisicao em curso, sempre explicita. Ver `RequestOptions.accessToken`. */
export interface TransactionsRequestContext {
  accessToken: string;
}

/** Movimentacoes exigem Idempotency-Key: o tipo impede esquecer a chave. */
export interface MovementRequestContext extends TransactionsRequestContext {
  idempotencyKey: string;
}

const uuidSchema = z.uuid();

/** GET /api/v1/transactions — ordem do servidor: occurredOn desc, id desc. Sem filtros. */
export async function listTransactions(
  query: PageQuery,
  context: TransactionsRequestContext,
): Promise<TransactionPage> {
  const { page, pageSize } = pageQuerySchema.parse(query);
  try {
    const raw = await apiRequest<unknown>("/transactions", {
      method: "GET",
      query: { page, pageSize },
      accessToken: context.accessToken,
    });
    return transactionPageSchema.parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}

/** POST /api/v1/transactions — receita ou despesa manual. */
export async function createTransaction(
  input: CreateTransactionInput,
  context: MovementRequestContext,
): Promise<Transaction> {
  const body = createTransactionInputSchema.parse(input);
  const idempotencyKey = idempotencyKeySchema.parse(context.idempotencyKey);
  try {
    const raw = await apiRequest<unknown>("/transactions", {
      method: "POST",
      body,
      accessToken: context.accessToken,
      idempotencyKey,
    });
    return transactionSchema.parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}

/** POST /api/v1/transfers — transferencia contabil entre contas do proprio usuario. */
export async function createTransfer(
  input: CreateTransferInput,
  context: MovementRequestContext,
): Promise<Transfer> {
  const body = createTransferInputSchema.parse(input);
  const idempotencyKey = idempotencyKeySchema.parse(context.idempotencyKey);
  try {
    const raw = await apiRequest<unknown>("/transfers", {
      method: "POST",
      body,
      accessToken: context.accessToken,
      idempotencyKey,
    });
    return transferSchema.parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}

/** PATCH /api/v1/transactions/{id}/category — categoria manual ou resultado incerto. */
export async function updateTransactionCategory(
  transactionId: string,
  update: TransactionCategoryUpdate,
  context: TransactionsRequestContext,
): Promise<Transaction> {
  const id = uuidSchema.parse(transactionId);
  const body = transactionCategoryUpdateSchema.parse(update);
  try {
    const raw = await apiRequest<unknown>(`/transactions/${id}/category`, {
      method: "PATCH",
      body,
      accessToken: context.accessToken,
    });
    return transactionSchema.parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}
