import { z } from "zod";
import { apiRequest } from "../api/http-client";
import { toProblemError } from "../api/problem-error";
import { idempotencyKeySchema } from "../transactions/schema";
import { confirmImportInputSchema, importRunSchema } from "./schema";
import type { ConfirmImportInput, ImportRun } from "./types";

// Rotas do contrato S3-01 do Dev 1; ainda nao publicadas no OpenAPI (backend @ 9887206).

/** Credencial da requisicao em curso, sempre explicita. Ver `RequestOptions.accessToken`. */
export interface IngestionsRequestContext {
  accessToken: string;
}

/** Operacoes que criam ou iniciam uma importacao exigem Idempotency-Key. */
export interface IngestionWriteContext extends IngestionsRequestContext {
  idempotencyKey: string;
}

const uuidSchema = z.uuid();

/** POST /api/v1/ingestions/ofx/previews — 201 com a previa pronta ou 202 na fila. */
export async function createOfxPreview(
  file: File,
  context: IngestionWriteContext,
): Promise<ImportRun> {
  const idempotencyKey = idempotencyKeySchema.parse(context.idempotencyKey);
  const body = new FormData();
  body.append("file", file, file.name);
  try {
    const raw = await apiRequest<unknown>("/ingestions/ofx/previews", {
      method: "POST",
      body,
      accessToken: context.accessToken,
      idempotencyKey,
    });
    return importRunSchema.parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}

/** POST /api/v1/ingestions/{importRunId}/confirmations — 200 concluida ou 202 na fila. */
export async function confirmImport(
  importRunId: string,
  input: ConfirmImportInput,
  context: IngestionWriteContext,
): Promise<ImportRun> {
  const id = uuidSchema.parse(importRunId);
  const body = confirmImportInputSchema.parse(input);
  const idempotencyKey = idempotencyKeySchema.parse(context.idempotencyKey);
  try {
    const raw = await apiRequest<unknown>(`/ingestions/${id}/confirmations`, {
      method: "POST",
      body,
      accessToken: context.accessToken,
      idempotencyKey,
    });
    return importRunSchema.parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}

/** GET /api/v1/ingestions/{importRunId} — estado atual, com a previa ou o resultado. */
export async function getImportRun(
  importRunId: string,
  context: IngestionsRequestContext,
): Promise<ImportRun> {
  const id = uuidSchema.parse(importRunId);
  try {
    const raw = await apiRequest<unknown>(`/ingestions/${id}`, {
      method: "GET",
      accessToken: context.accessToken,
    });
    return importRunSchema.parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}
