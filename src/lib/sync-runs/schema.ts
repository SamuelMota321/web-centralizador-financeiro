import { z } from "zod";
import { SYNC_RUN_STATUSES } from "./types";

// Validacao de borda espelhando o contrato C-03 (S4-01). Rotas ainda nao publicadas.

const timestampSchema = z.iso.datetime({ offset: true });

export const syncRunSchema = z.object({
  runId: z.uuid(),
  connectionId: z.uuid(),
  status: z.enum(SYNC_RUN_STATUSES),
  acceptedAt: timestampSchema,
  statusUrl: z.string().min(1),
  // A resposta do POST pode omitir os momentos ainda nao ocorridos.
  startedAt: timestampSchema.nullable().optional().transform((value) => value ?? null),
  completedAt: timestampSchema.nullable().optional().transform((value) => value ?? null),
});
