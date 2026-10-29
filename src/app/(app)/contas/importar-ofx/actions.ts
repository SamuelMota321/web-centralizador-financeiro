"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PROBLEM_CODES, ProblemDetailsError } from "@/lib/api/errors";
import { mustRotateIdempotencyKey, newIdempotencyKey } from "@/lib/idempotency";
import { confirmImport, createOfxPreview, getImportRun } from "@/lib/ingestions/api";
import { checkOfxFile, OFX_FILE_MESSAGES } from "@/lib/ingestions/file-validation";
import { ingestionErrorMessage } from "@/lib/ingestions/messages";
import type { ImportRun } from "@/lib/ingestions/types";
import { accessTokenOrNull, isAuthFailure } from "@/lib/session";
import { idempotencyKeySchema } from "@/lib/transactions/schema";

const uuidSchema = z.uuid();
const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente para continuar.";

export interface PreviewFieldErrors {
  destinationAccountId?: string;
  file?: string;
}

/**
 * Toda resposta carrega a Idempotency-Key do proximo envio: a mesma apos qualquer falha e
 * uma nova apos sucesso ou quando o backend recusa a chave (REUSED/EXPIRED). A previa pronta
 * traz tambem a chave da confirmacao, que pertence a esta previa.
 */
export type PreviewState =
  | { status: "idle"; idempotencyKey: string }
  | { status: "ready"; idempotencyKey: string; confirmKey: string; run: ImportRun }
  | {
      status: "invalid";
      idempotencyKey: string;
      fieldErrors: PreviewFieldErrors;
      destinationAccountId: string;
    }
  | {
      status: "error";
      idempotencyKey: string;
      message: string;
      destinationAccountId: string;
      reauth?: boolean;
    };

export type ConfirmState =
  | { status: "idle"; idempotencyKey: string }
  | { status: "done"; idempotencyKey: string; run: ImportRun }
  | {
      status: "error";
      idempotencyKey: string;
      message: string;
      reauth?: boolean;
      /** Previa expirada, ja confirmada ou inexistente: so um arquivo novo resolve. */
      restart?: boolean;
    };

export type RefreshResult =
  | { status: "ok"; run: ImportRun }
  | { status: "error"; message: string; reauth?: boolean };

export async function previewOfxAction(
  previous: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const idempotencyKey = readIdempotencyKey(formData, previous.idempotencyKey);
  const rawAccount = formData.get("destinationAccountId");
  const destinationAccountId = typeof rawAccount === "string" ? rawAccount : "";
  const rawFile = formData.get("file");
  // Campo de arquivo vazio chega como File sem nome.
  const file = rawFile instanceof File && rawFile.name !== "" ? rawFile : null;

  const fieldErrors: PreviewFieldErrors = {};
  if (!uuidSchema.safeParse(destinationAccountId).success) {
    fieldErrors.destinationAccountId = "Escolha a conta que vai receber as movimentações.";
  }
  const fileProblem = file ? checkOfxFile(file) : null;
  if (!file) fieldErrors.file = "Escolha o arquivo OFX exportado pelo banco.";
  else if (fileProblem) fieldErrors.file = OFX_FILE_MESSAGES[fileProblem];
  if (!file || Object.keys(fieldErrors).length > 0) {
    return { status: "invalid", idempotencyKey, fieldErrors, destinationAccountId };
  }

  const token = await accessTokenOrNull();
  if (!token) {
    return { status: "error", idempotencyKey, message: SESSION_EXPIRED, destinationAccountId, reauth: true };
  }

  try {
    const run = await createOfxPreview(
      { file, destinationAccountId },
      { accessToken: token, idempotencyKey },
    );
    return { status: "ready", idempotencyKey: newIdempotencyKey(), confirmKey: newIdempotencyKey(), run };
  } catch (error) {
    if (isAuthFailure(error)) {
      return { status: "error", idempotencyKey, message: SESSION_EXPIRED, destinationAccountId, reauth: true };
    }
    return {
      status: "error",
      idempotencyKey: mustRotateIdempotencyKey(error) ? newIdempotencyKey() : idempotencyKey,
      message: ingestionErrorMessage(error, "Não foi possível ler o arquivo. Tente de novo."),
      destinationAccountId,
    };
  }
}

/**
 * `importRunId` e `destinationAccountId` vem de campos ocultos e sao entrada nao confiavel:
 * validados aqui e reverificados pelo backend (ownership, estado e conta da previa).
 */
export async function confirmOfxAction(
  previous: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const idempotencyKey = readIdempotencyKey(formData, previous.idempotencyKey);
  const importRunId = uuidSchema.safeParse(formData.get("importRunId"));
  const destinationAccountId = uuidSchema.safeParse(formData.get("destinationAccountId"));
  if (!importRunId.success || !destinationAccountId.success) {
    return {
      status: "error",
      idempotencyKey,
      message: "Não foi possível confirmar esta prévia. Envie o arquivo de novo.",
      restart: true,
    };
  }

  const token = await accessTokenOrNull();
  if (!token) return { status: "error", idempotencyKey, message: SESSION_EXPIRED, reauth: true };

  try {
    const run = await confirmImport(
      importRunId.data,
      { destinationAccountId: destinationAccountId.data },
      { accessToken: token, idempotencyKey },
    );
    revalidatePath("/movimentacoes");
    return { status: "done", idempotencyKey: newIdempotencyKey(), run };
  } catch (error) {
    if (isAuthFailure(error)) {
      return { status: "error", idempotencyKey, message: SESSION_EXPIRED, reauth: true };
    }
    return {
      status: "error",
      idempotencyKey: mustRotateIdempotencyKey(error) ? newIdempotencyKey() : idempotencyKey,
      message: ingestionErrorMessage(error, "Não foi possível confirmar a importação. Tente de novo."),
      restart: isStateConflict(error),
    };
  }
}

/** Consulta o estado de uma importacao em processamento. */
export async function refreshImportAction(importRunId: string): Promise<RefreshResult> {
  const id = uuidSchema.safeParse(importRunId);
  if (!id.success) return { status: "error", message: "Não foi possível consultar esta importação." };

  const token = await accessTokenOrNull();
  if (!token) return { status: "error", message: SESSION_EXPIRED, reauth: true };

  try {
    return { status: "ok", run: await getImportRun(id.data, { accessToken: token }) };
  } catch (error) {
    if (isAuthFailure(error)) return { status: "error", message: SESSION_EXPIRED, reauth: true };
    return {
      status: "error",
      message: ingestionErrorMessage(error, "Não foi possível consultar a importação. Tente de novo."),
    };
  }
}

function readIdempotencyKey(formData: FormData, fallback: string): string {
  const parsed = idempotencyKeySchema.safeParse(formData.get("idempotencyKey"));
  return parsed.success ? parsed.data : fallback;
}

/** O backend responde previa expirada, ja confirmada ou inexistente como INVALID_REQUEST 404/409. */
function isStateConflict(error: unknown): boolean {
  return (
    error instanceof ProblemDetailsError &&
    error.code === PROBLEM_CODES.invalidRequest &&
    (error.status === 404 || error.status === 409)
  );
}
