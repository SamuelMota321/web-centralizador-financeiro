import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth0 } from "@/lib/auth0";
import { ProblemDetailsError } from "@/lib/api/errors";
import { completePluggyConnection, disconnectConnection, getConnection, startPluggySession } from "@/lib/connections/api";
import { COMPLETION_KEY, CONNECT_TOKEN, CONNECTION_ID, completionAcceptedView, connectionView, ITEM_ID, sessionView } from "@/lib/connections/fixtures";
import { completionAcceptedSchema, connectionSchema, pluggySessionSchema } from "@/lib/connections/schema";
import { clearResumePointer, saveResumePointer } from "@/lib/connections/resume-store";
import { getLatestSyncRuns, getSyncRun, requestSyncRun, requestUpdateSession } from "@/lib/sync-runs/api";
import { RUN_ID, syncRunView } from "@/lib/sync-runs/fixtures";
import { syncRunSchema } from "@/lib/sync-runs/schema";
import {
  completeConnectionAction,
  forgetResumePointerAction,
  getLatestSyncAction,
  getSyncRunAction,
  requestSyncAction,
  startUpdateSessionAction,
  disconnectAction,
  refreshConnectionAction,
  startSessionAction,
} from "./actions";

vi.mock("@/lib/auth0", () => ({ auth0: { getAccessToken: vi.fn() } }));
vi.mock("@/lib/idempotency", () => ({ newIdempotencyKey: () => COMPLETION_KEY }));
vi.mock("@/lib/connections/resume-store", () => ({
  saveResumePointer: vi.fn(),
  clearResumePointer: vi.fn(),
}));
vi.mock("@/lib/sync-runs/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sync-runs/api")>()),
  requestSyncRun: vi.fn(),
  getSyncRun: vi.fn(),
  getLatestSyncRuns: vi.fn(),
  requestUpdateSession: vi.fn(),
}));
vi.mock("@/lib/connections/api", () => ({
  startPluggySession: vi.fn(),
  completePluggyConnection: vi.fn(),
  getConnection: vi.fn(),
  disconnectConnection: vi.fn(),
}));

const connected = connectionSchema.parse(connectionView());
const accepted = completionAcceptedSchema.parse(completionAcceptedView());
const session = pluggySessionSchema.parse(sessionView());

function problem(status: number, code: string) {
  return new ProblemDetailsError({ type: "about:blank", title: "t", status, code, detail: "detalhe técnico" });
}

beforeEach(() => {
  vi.mocked(auth0.getAccessToken).mockReset().mockResolvedValue({ token: "auth0-access-ficticio" } as never);
  vi.mocked(startPluggySession).mockReset();
  vi.mocked(completePluggyConnection).mockReset();
  vi.mocked(getConnection).mockReset();
  vi.mocked(disconnectConnection).mockReset();
  vi.mocked(saveResumePointer).mockReset();
  vi.mocked(clearResumePointer).mockReset();
});

describe("startSessionAction", () => {
  it("devolve ao navegador só o token limitado e o id da conexão", async () => {
    vi.mocked(startPluggySession).mockResolvedValue(session);
    const result = await startSessionAction();

    expect(result).toEqual({ status: "ok", connectToken: CONNECT_TOKEN, connectionId: CONNECTION_ID, completionKey: COMPLETION_KEY });
    expect(JSON.stringify(result)).not.toContain("auth0-access-ficticio");
    expect(startPluggySession).toHaveBeenCalledWith({ accessToken: "auth0-access-ficticio" });
  });

  it("pede para entrar de novo quando a sessão expirou, sem chamar o backend", async () => {
    vi.mocked(auth0.getAccessToken).mockRejectedValue(new Error("refresh recusado"));
    expect(await startSessionAction()).toMatchObject({ status: "error", reauth: true });
    expect(startPluggySession).not.toHaveBeenCalled();
  });

  it("traduz a indisponibilidade do provedor sem expor o detail", async () => {
    vi.mocked(startPluggySession).mockRejectedValue(problem(503, "INTEGRATION_UNAVAILABLE"));
    const result = await startSessionAction();
    expect(result).toMatchObject({ status: "error" });
    expect(JSON.stringify(result)).toMatch(/indisponível/);
    expect(JSON.stringify(result)).not.toContain("detalhe técnico");
  });

  it("trata 401 do backend como sessão expirada", async () => {
    vi.mocked(startPluggySession).mockRejectedValue(problem(401, "AUTHENTICATION_REQUIRED"));
    expect(await startSessionAction()).toMatchObject({ status: "error", reauth: true });
  });
});

describe("completeConnectionAction", () => {
  it("registra o item e devolve a conexão com importação aceita", async () => {
    vi.mocked(completePluggyConnection).mockResolvedValue(accepted);
    expect(await completeConnectionAction(ITEM_ID, COMPLETION_KEY)).toEqual({
      status: "ok", connection: { ...accepted.connection, initialImport: accepted.initialImport },
    });
    expect(completePluggyConnection).toHaveBeenCalledWith(ITEM_ID, COMPLETION_KEY, { accessToken: "auth0-access-ficticio" });
  });

  it("recusa itemId inválido vindo do navegador", async () => {
    expect(await completeConnectionAction("../x", COMPLETION_KEY)).toMatchObject({ status: "error" });
    expect(await completeConnectionAction(ITEM_ID, "chave")).toMatchObject({ status: "error" });
    expect(completePluggyConnection).not.toHaveBeenCalled();
  });

  it("aceita reenviar o mesmo itemId depois de uma falha de rede", async () => {
    vi.mocked(completePluggyConnection)
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(accepted);
    expect(await completeConnectionAction(ITEM_ID, COMPLETION_KEY)).toMatchObject({ status: "error" });
    expect(await completeConnectionAction(ITEM_ID, COMPLETION_KEY)).toMatchObject({ status: "ok" });
    expect(vi.mocked(completePluggyConnection).mock.calls.map(([id, key]) => [id, key]))
      .toEqual([[ITEM_ID, COMPLETION_KEY], [ITEM_ID, COMPLETION_KEY]]);
  });

  it("explica quando o item não pertence a esta pessoa", async () => {
    vi.mocked(completePluggyConnection).mockRejectedValue(problem(404, "CONNECTION_NOT_FOUND"));
    expect(JSON.stringify(await completeConnectionAction(ITEM_ID, COMPLETION_KEY))).toMatch(/não foi encontrada/);
  });
});

describe("refreshConnectionAction e disconnectAction", () => {
  it("consulta e desconecta pelo id", async () => {
    vi.mocked(getConnection).mockResolvedValue(connected);
    vi.mocked(disconnectConnection).mockResolvedValue({ ...connected, status: "disconnected" });

    expect(await refreshConnectionAction(CONNECTION_ID)).toEqual({ status: "ok", connection: connected });
    expect(await disconnectAction(CONNECTION_ID)).toMatchObject({ status: "ok", connection: { status: "disconnected" } });
  });

  it("recusa id inválido sem chamar o backend", async () => {
    expect(await refreshConnectionAction("x")).toMatchObject({ status: "error" });
    expect(await disconnectAction("x")).toMatchObject({ status: "error" });
    expect(getConnection).not.toHaveBeenCalled();
    expect(disconnectConnection).not.toHaveBeenCalled();
  });

  it("informa conflito de estado na remoção", async () => {
    vi.mocked(disconnectConnection).mockRejectedValue(problem(409, "CONNECTION_CONFLICT"));
    expect(JSON.stringify(await disconnectAction(CONNECTION_ID))).toMatch(/mudou de estado/);
  });
});

describe("ponteiro de retomada (C-01)", () => {
  it("guarda o id devolvido pela conclusão, não o do Item", async () => {
    vi.mocked(completePluggyConnection).mockResolvedValue(accepted);
    await completeConnectionAction(ITEM_ID, COMPLETION_KEY);
    expect(saveResumePointer).toHaveBeenCalledWith(accepted.connection.id);
    expect(saveResumePointer).not.toHaveBeenCalledWith(ITEM_ID);
  });

  it("não guarda nada quando a conclusão falha", async () => {
    vi.mocked(completePluggyConnection).mockRejectedValue(problem(503, "INTEGRATION_UNAVAILABLE"));
    await completeConnectionAction(ITEM_ID, COMPLETION_KEY);
    expect(saveResumePointer).not.toHaveBeenCalled();
  });

  it("descarta o ponteiro quando a API nega ou não encontra a conexão", async () => {
    vi.mocked(getConnection).mockRejectedValue(problem(404, "CONNECTION_NOT_FOUND"));
    await refreshConnectionAction(CONNECTION_ID);
    expect(clearResumePointer).toHaveBeenCalledTimes(1);
  });

  it("mantém o ponteiro em falha passageira", async () => {
    vi.mocked(getConnection).mockRejectedValue(problem(503, "INTEGRATION_UNAVAILABLE"));
    await refreshConnectionAction(CONNECTION_ID);
    expect(clearResumePointer).not.toHaveBeenCalled();
  });

  it("descarta o ponteiro ao desconectar e a pedido da página", async () => {
    vi.mocked(disconnectConnection).mockResolvedValue({ ...connected, status: "disconnected" });
    await disconnectAction(CONNECTION_ID);
    await forgetResumePointerAction();
    expect(clearResumePointer).toHaveBeenCalledTimes(2);
  });
});

describe("sincronização (HU-008)", () => {
  const run = syncRunSchema.parse(syncRunView({ connectionId: CONNECTION_ID }));

  beforeEach(() => {
    vi.mocked(requestSyncRun).mockReset();
    vi.mocked(getSyncRun).mockReset();
    vi.mocked(getLatestSyncRuns).mockReset();
    vi.mocked(requestUpdateSession).mockReset();
  });

  it("pede a sincronização e devolve a execução aceita", async () => {
    vi.mocked(requestSyncRun).mockResolvedValue(run);
    expect(await requestSyncAction(CONNECTION_ID)).toEqual({ status: "ok", run });
    expect(requestSyncRun).toHaveBeenCalledWith(CONNECTION_ID, { accessToken: "auth0-access-ficticio" });
  });

  it("recusa statusUrl de outra origem", async () => {
    vi.mocked(requestSyncRun).mockResolvedValue({ ...run, statusUrl: "https://outro.exemplo/x" });
    expect(await requestSyncAction(CONNECTION_ID)).toMatchObject({ status: "error" });
  });

  it("valida ids antes de chamar a API", async () => {
    expect(await requestSyncAction("x")).toMatchObject({ status: "error" });
    expect(await getSyncRunAction(CONNECTION_ID, "x")).toMatchObject({ status: "error" });
    expect(requestSyncRun).not.toHaveBeenCalled();
    expect(getSyncRun).not.toHaveBeenCalled();
  });

  it("consulta o andamento e a última execução", async () => {
    vi.mocked(getSyncRun).mockResolvedValue({ ...run, status: "running" });
    vi.mocked(getLatestSyncRuns).mockResolvedValue({ latest: null, lastReconciled: null });
    expect(await getSyncRunAction(CONNECTION_ID, RUN_ID)).toMatchObject({ status: "ok", run: { status: "running" } });
    expect(await getLatestSyncAction(CONNECTION_ID)).toEqual({ status: "ok", latest: null, lastReconciled: null });
  });

  it("devolve ao navegador só o token limitado da atualização", async () => {
    vi.mocked(requestUpdateSession).mockResolvedValue({ connectToken: "token-limitado", expiresAt: "2026-11-25T12:00:00.000Z" });
    const result = await startUpdateSessionAction(CONNECTION_ID);
    expect(result).toEqual({ status: "ok", connectToken: "token-limitado" });
    expect(JSON.stringify(result)).not.toContain("auth0-access-ficticio");
  });

  it("sessão expirada pede para entrar de novo sem chamar a API", async () => {
    vi.mocked(auth0.getAccessToken).mockRejectedValue(new Error("expirada"));
    expect(await requestSyncAction(CONNECTION_ID)).toMatchObject({ status: "error", reauth: true });
    expect(requestSyncRun).not.toHaveBeenCalled();
  });

  it("404 descarta o ponteiro de retomada", async () => {
    vi.mocked(getLatestSyncRuns).mockRejectedValue(problem(404, "CONNECTION_NOT_FOUND"));
    expect(await getLatestSyncAction(CONNECTION_ID)).toMatchObject({ status: "error" });
    expect(clearResumePointer).toHaveBeenCalled();
  });
});
