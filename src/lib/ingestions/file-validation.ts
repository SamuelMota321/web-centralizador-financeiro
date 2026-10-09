// Ajuda de uso antes do envio; quem decide e o backend. HU-004: PDF nao e aceito.
// O backend aceita ate 10 MiB (contrato S3-01, D2), mas no web o arquivo passa pelo servidor
// Next, e a Vercel recusa requisicoes acima de 4,5 MB. Por isso o web limita a 4 MiB.
export const MAX_OFX_BYTES = 4 * 1024 * 1024;

/**
 * Limite do corpo da Server Action (`next.config.ts`): o arquivo de 4 MiB mais folga para o
 * overhead do multipart (a documentacao do Next estima 10 a 20 KB), abaixo dos 4,5 MB da Vercel.
 */
export const SERVER_ACTION_BODY_LIMIT_BYTES = MAX_OFX_BYTES + 64 * 1024;

export interface OfxFileCandidate {
  name: string;
  type: string;
  size: number;
}

export type OfxFileProblem = "empty" | "pdf" | "too_large";

export function checkOfxFile(file: OfxFileCandidate): OfxFileProblem | null {
  if (file.size === 0) return "empty";
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (file.size > MAX_OFX_BYTES) return "too_large";
  return null;
}

export const OFX_FILE_MESSAGES: Record<OfxFileProblem, string> = {
  empty: "O arquivo está vazio. Escolha o extrato OFX exportado pelo banco.",
  pdf: "Arquivos PDF não são aceitos. Exporte o extrato do banco no formato OFX.",
  too_large: "O arquivo passa de 4 MB. Exporte um período menor no banco.",
};
