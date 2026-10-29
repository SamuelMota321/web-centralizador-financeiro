import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { ProblemDetailsError } from "@/lib/api/errors";
import { confirmImport, createOfxPreview, getImportRun } from "@/lib/ingestions/api";
import { DESTINATION_ACCOUNT_ID, IMPORT_RUN_ID, previewRun, resultRun } from "@/lib/ingestions/fixtures";
import { MAX_OFX_BYTES } from "@/lib/ingestions/file-validation";
import { importRunSchema } from "@/lib/ingestions/schema";
import {
  type ConfirmState,
  confirmOfxAction,
  type PreviewState,
  previewOfxAction,
  refreshImportAction,
} from "./actions";

vi.mock("@/lib/auth0", () => ({ auth0: { getAccessToken: vi.fn() } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/ingestions/api", () => ({
  createOfxPreview: vi.fn(),
  confirmImport: vi.fn(),
  getImportRun: vi.fn(),
}));

const KEY = "0b7c8f1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e";
const PREVIEW_IDLE: PreviewState = { status: "idle", idempotencyKey: KEY };
const CONFIRM_IDLE: ConfirmState = { status: "idle", idempotencyKey: KEY };
const preview = importRunSchema.parse(previewRun());
const result = importRunSchema.parse(resultRun());

function problem(status: number, code: string) {
  return new ProblemDetailsError({ type: "about:blank", title: "t", status, code, detail: "detalhe técnico" });
}

function ofxFile(content = "OFXHEADER:100", name = "extrato.ofx", type = "application/x-ofx") {
  return new File([content], name, { type });
}

function previewForm(fields: { file?: File | null; account?: string; key?: string } = {}) {
  const data = new FormData();
  data.set("idempotencyKey", fields.key ?? KEY);
  data.set("destinationAccountId", fields.account ?? DESTINATION_ACCOUNT_ID);
  if (fields.file !== null) data.set("file", fields.file ?? ofxFile());
  return data;
}

function confirmForm(fields: { run?: string; account?: string; key?: string } = {}) {
  const data = new FormData();
  data.set("idempotencyKey", fields.key ?? KEY);
  data.set("importRunId", fields.run ?? IMPORT_RUN_ID);
  data.set("destinationAccountId", fields.account ?? DESTINATION_ACCOUNT_ID);
  return data;
}

beforeEach(() => {
  vi.mocked(auth0.getAccessToken).mockResolvedValue({ token: "token-ficticio" } as never);
});

describe("previewOfxAction", () => {
  it("encaminha arquivo e conta com o token e a chave do formulário", async () => {
    vi.mocked(createOfxPreview).mockResolvedValue(preview);
    const file = ofxFile();
    const state = await previewOfxAction(PREVIEW_IDLE, previewForm({ file }));

    expect(createOfxPreview).toHaveBeenCalledWith(
      { file: expect.objectContaining({ name: "extrato.ofx" }), destinationAccountId: DESTINATION_ACCOUNT_ID },
      { accessToken: "token-ficticio", idempotencyKey: KEY },
    );
    expect(state.status).toBe("ready");
    if (state.status !== "ready") return;
    expect(state.run.id).toBe(IMPORT_RUN_ID);
    // Sucesso troca a chave da prévia e traz uma chave própria para a confirmação.
    expect(state.idempotencyKey).not.toBe(KEY);
    expect(state.confirmKey).not.toBe(KEY);
    expect(state.confirmKey).not.toBe(state.idempotencyKey);
  });

  it.each([
    ["sem arquivo", { file: null }, "file", /Escolha o arquivo OFX/],
    ["arquivo vazio", { file: ofxFile("") }, "file", /está vazio/],
    ["PDF", { file: ofxFile("%PDF", "extrato.pdf", "application/pdf") }, "file", /PDF não são aceitos/],
    [
      "acima de 4 MiB",
      { file: ofxFile("x".repeat(MAX_OFX_BYTES + 1)) },
      "file",
      /passa de 4 MB/,
    ],
    ["conta inválida", { account: "conta" }, "destinationAccountId", /Escolha a conta/],
  ] as const)("recusa %s antes de chamar a API", async (_name, fields, field, message) => {
    const state = await previewOfxAction(PREVIEW_IDLE, previewForm(fields));
    expect(createOfxPreview).not.toHaveBeenCalled();
    expect(state.status).toBe("invalid");
    if (state.status !== "invalid") return;
    expect(state.fieldErrors[field]).toMatch(message);
    expect(state.idempotencyKey).toBe(KEY);
  });

  it("mantém a chave e a conta escolhida após falha de rede", async () => {
    vi.mocked(createOfxPreview).mockRejectedValue(new TypeError("fetch failed"));
    const state = await previewOfxAction(PREVIEW_IDLE, previewForm());
    expect(state).toMatchObject({
      status: "error",
      idempotencyKey: KEY,
      destinationAccountId: DESTINATION_ACCOUNT_ID,
    });
  });

  it("traduz o erro do backend pelo status, sem mostrar o detail", async () => {
    vi.mocked(createOfxPreview).mockRejectedValue(problem(422, "INVALID_REQUEST"));
    const state = await previewOfxAction(PREVIEW_IDLE, previewForm());
    expect(state.status === "error" && state.message).toMatch(/Não foi possível ler este OFX/);
    expect(JSON.stringify(state)).not.toContain("detalhe técnico");
  });

  it("troca a chave quando o backend a recusa", async () => {
    vi.mocked(createOfxPreview).mockRejectedValue(problem(409, "IDEMPOTENCY_KEY_REUSED"));
    const state = await previewOfxAction(PREVIEW_IDLE, previewForm());
    expect(state.status).toBe("error");
    expect(state.idempotencyKey).not.toBe(KEY);
  });

  it("pede novo login quando a sessão expirou, sem chamar a API", async () => {
    vi.mocked(auth0.getAccessToken).mockRejectedValue(new Error("sessão"));
    const state = await previewOfxAction(PREVIEW_IDLE, previewForm());
    expect(state).toMatchObject({ status: "error", reauth: true, idempotencyKey: KEY });
    expect(createOfxPreview).not.toHaveBeenCalled();
  });

  it("pede novo login quando o backend responde 401", async () => {
    vi.mocked(createOfxPreview).mockRejectedValue(problem(401, "AUTHENTICATION_REQUIRED"));
    const state = await previewOfxAction(PREVIEW_IDLE, previewForm());
    expect(state).toMatchObject({ status: "error", reauth: true });
  });
});

describe("confirmOfxAction", () => {
  it("confirma com a chave do formulário e atualiza Movimentações", async () => {
    vi.mocked(confirmImport).mockResolvedValue(result);
    const state = await confirmOfxAction(CONFIRM_IDLE, confirmForm());

    expect(confirmImport).toHaveBeenCalledWith(
      IMPORT_RUN_ID,
      { destinationAccountId: DESTINATION_ACCOUNT_ID },
      { accessToken: "token-ficticio", idempotencyKey: KEY },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/movimentacoes");
    expect(state).toMatchObject({ status: "done", run: { importedItems: 1 } });
    expect(state.idempotencyKey).not.toBe(KEY);
  });

  it("reenvio após falha usa a mesma chave: o backend devolve a mesma importação", async () => {
    vi.mocked(confirmImport).mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(result);
    const first = await confirmOfxAction(CONFIRM_IDLE, confirmForm());
    expect(first).toMatchObject({ status: "error", idempotencyKey: KEY });

    await confirmOfxAction(first, confirmForm({ key: first.idempotencyKey }));
    const keys = vi.mocked(confirmImport).mock.calls.map(([, , context]) => context.idempotencyKey);
    expect(keys).toEqual([KEY, KEY]);
  });

  it("troca a chave quando o backend a recusa", async () => {
    vi.mocked(confirmImport).mockRejectedValue(problem(409, "IDEMPOTENCY_KEY_EXPIRED"));
    const state = await confirmOfxAction(CONFIRM_IDLE, confirmForm());
    expect(state).toMatchObject({ status: "error", restart: false });
    expect(state.idempotencyKey).not.toBe(KEY);
  });

  it.each([409, 404])("prévia expirada ou já confirmada (%i) oferece escolher outro arquivo", async (status) => {
    vi.mocked(confirmImport).mockRejectedValue(problem(status, "INVALID_REQUEST"));
    const state = await confirmOfxAction(CONFIRM_IDLE, confirmForm());
    expect(state).toMatchObject({ status: "error", restart: true, idempotencyKey: KEY });
  });

  it("conta arquivada não é tratada como prévia expirada", async () => {
    vi.mocked(confirmImport).mockRejectedValue(problem(409, "ACCOUNT_ARCHIVED"));
    const state = await confirmOfxAction(CONFIRM_IDLE, confirmForm());
    expect(state).toMatchObject({ status: "error", restart: false });
    expect(state.status === "error" && state.message).toMatch(/conta escolhida/);
  });

  it("recusa ids adulterados nos campos ocultos sem chamar a API", async () => {
    const state = await confirmOfxAction(CONFIRM_IDLE, confirmForm({ run: "../x" }));
    expect(confirmImport).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: "error", restart: true });
  });

  it("pede novo login quando a sessão expirou", async () => {
    vi.mocked(auth0.getAccessToken).mockRejectedValue(new Error("sessão"));
    const state = await confirmOfxAction(CONFIRM_IDLE, confirmForm());
    expect(state).toMatchObject({ status: "error", reauth: true, idempotencyKey: KEY });
    expect(confirmImport).not.toHaveBeenCalled();
  });
});

describe("refreshImportAction", () => {
  it("consulta o estado atual da importação", async () => {
    vi.mocked(getImportRun).mockResolvedValue(result);
    const state = await refreshImportAction(IMPORT_RUN_ID);
    expect(getImportRun).toHaveBeenCalledWith(IMPORT_RUN_ID, { accessToken: "token-ficticio" });
    expect(state).toMatchObject({ status: "ok", run: { id: IMPORT_RUN_ID } });
  });

  it("recusa id inválido e traduz falhas", async () => {
    expect(await refreshImportAction("x")).toMatchObject({ status: "error" });
    expect(getImportRun).not.toHaveBeenCalled();

    vi.mocked(getImportRun).mockRejectedValue(problem(503, "INTERNAL_ERROR"));
    const state = await refreshImportAction(IMPORT_RUN_ID);
    expect(state.status === "error" && state.message).toMatch(/indisponível no momento/);
  });
});
