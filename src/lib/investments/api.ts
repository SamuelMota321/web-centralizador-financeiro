import { z } from "zod";
import { apiRequest } from "../api/http-client";
import { type PageQuery, pageQuerySchema } from "../api/pagination";
import { toProblemError } from "../api/problem-error";
import { movementPageSchema, positionPageSchema } from "./schema";
import type { MovementPage, PositionPage } from "./types";

/** Credencial da requisicao em curso, sempre explicita. Ver `RequestOptions.accessToken`. */
export interface InvestmentsRequestContext {
  accessToken: string;
}

const uuidSchema = z.uuid();

/**
 * GET /api/v1/investments — carteira, alocacao (calculada antes da paginacao) e posicoes
 * paginadas. So leitura; sem Idempotency-Key.
 */
export async function listInvestments(query: PageQuery, context: InvestmentsRequestContext): Promise<PositionPage> {
  const { page, pageSize } = pageQuerySchema.parse(query);
  try {
    const raw = await apiRequest<unknown>(`/investments?page=${page}&pageSize=${pageSize}`, {
      method: "GET",
      accessToken: context.accessToken,
    });
    return positionPageSchema.parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}

/** GET /api/v1/investments/{id}/movements — 404 para posicao inexistente ou de outro usuario. */
export async function listInvestmentMovements(
  positionId: string,
  query: PageQuery,
  context: InvestmentsRequestContext,
): Promise<MovementPage> {
  const id = uuidSchema.parse(positionId);
  const { page, pageSize } = pageQuerySchema.parse(query);
  try {
    const raw = await apiRequest<unknown>(`/investments/${id}/movements?page=${page}&pageSize=${pageSize}`, {
      method: "GET",
      accessToken: context.accessToken,
    });
    return movementPageSchema.parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}
