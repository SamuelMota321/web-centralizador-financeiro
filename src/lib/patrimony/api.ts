import { z } from "zod";
import { apiRequest } from "../api/http-client";
import { type PageQuery, pageQuerySchema } from "../api/pagination";
import { toProblemError } from "../api/problem-error";
import { historySchema, itemSchemas, pageSchema } from "./schema";
import {
  type HistoryEntry,
  type InputByCollection,
  type ItemByCollection,
  PATRIMONY_COLLECTIONS,
  type PatrimonyCollection,
  type PatrimonyPage,
} from "./types";

/** Credencial da requisicao em curso, sempre explicita. Ver `RequestOptions.accessToken`. */
export interface PatrimonyRequestContext {
  accessToken: string;
}

const uuidSchema = z.uuid();
const collectionSchema = z.enum(PATRIMONY_COLLECTIONS);

async function call<T>(path: string, init: { method: string; body?: unknown }, context: PatrimonyRequestContext, parse: (raw: unknown) => T) {
  try {
    const raw = await apiRequest<unknown>(path, { ...init, accessToken: context.accessToken });
    return parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}

/** GET /api/v1/patrimony/{collection} — lista paginada, na ordem do servidor. */
export async function listPatrimony<C extends PatrimonyCollection>(
  collection: C,
  query: PageQuery,
  context: PatrimonyRequestContext,
): Promise<PatrimonyPage<C>> {
  const target = collectionSchema.parse(collection);
  const { page, pageSize } = pageQuerySchema.parse(query);
  return call(`/patrimony/${target}?page=${page}&pageSize=${pageSize}`, { method: "GET" }, context, (raw) =>
    pageSchema(collection).parse(raw) as PatrimonyPage<C>,
  );
}

/** GET /api/v1/patrimony/{collection}/{id} — 404 para item inexistente ou de outro usuario. */
export async function getPatrimony<C extends PatrimonyCollection>(
  collection: C,
  id: string,
  context: PatrimonyRequestContext,
): Promise<ItemByCollection[C]> {
  const target = collectionSchema.parse(collection);
  const itemId = uuidSchema.parse(id);
  return call(`/patrimony/${target}/${itemId}`, { method: "GET" }, context, (raw) =>
    itemSchemas[collection].parse(raw) as ItemByCollection[C],
  );
}

/**
 * POST /api/v1/patrimony/{collection} — 201 com o item criado. O contrato nao define
 * Idempotency-Key: o cliente evita duplo envio desabilitando o botao, sem garantia.
 */
export async function createPatrimony<C extends PatrimonyCollection>(
  collection: C,
  input: InputByCollection[C],
  context: PatrimonyRequestContext,
): Promise<ItemByCollection[C]> {
  const target = collectionSchema.parse(collection);
  return call(`/patrimony/${target}`, { method: "POST", body: input }, context, (raw) =>
    itemSchemas[collection].parse(raw) as ItemByCollection[C],
  );
}

/** PATCH /api/v1/patrimony/{collection}/{id} — parcial; exige ao menos um campo. */
export async function updatePatrimony<C extends PatrimonyCollection>(
  collection: C,
  id: string,
  patch: Partial<InputByCollection[C]>,
  context: PatrimonyRequestContext,
): Promise<ItemByCollection[C]> {
  const target = collectionSchema.parse(collection);
  const itemId = uuidSchema.parse(id);
  if (Object.keys(patch).length === 0) throw new Error("PATCH sem campos alterados");
  return call(`/patrimony/${target}/${itemId}`, { method: "PATCH", body: patch }, context, (raw) =>
    itemSchemas[collection].parse(raw) as ItemByCollection[C],
  );
}

/** GET /api/v1/patrimony/{collection}/{id}/history — versoes gravadas do item. */
export async function getPatrimonyHistory<C extends PatrimonyCollection>(
  collection: C,
  id: string,
  context: PatrimonyRequestContext,
): Promise<HistoryEntry<C>[]> {
  const target = collectionSchema.parse(collection);
  const itemId = uuidSchema.parse(id);
  return call(`/patrimony/${target}/${itemId}/history`, { method: "GET" }, context, (raw) =>
    historySchema(collection).parse(raw) as HistoryEntry<C>[],
  );
}
