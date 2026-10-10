import { z } from "zod";

// Os tipos do SDK dependem do pacote de servidor `pluggy-js`, que nao e instalado no cliente;
// por isso o payload do widget chega como `unknown` e so o id do item e lido.
const successPayloadSchema = z.object({ item: z.object({ id: z.uuid() }) });

/** Id do item criado pelo widget, ou null quando o payload nao tem um id valido. */
export function itemIdFromSuccess(payload: unknown): string | null {
  const parsed = successPayloadSchema.safeParse(payload);
  return parsed.success ? parsed.data.item.id : null;
}
