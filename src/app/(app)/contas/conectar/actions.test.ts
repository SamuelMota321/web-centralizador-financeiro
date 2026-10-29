import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth0 } from "@/lib/auth0";
import { ProblemDetailsError } from "@/lib/api/errors";
import { completePluggyConnection, disconnectConnection, getConnection, startPluggySession } from "@/lib/connections/api";
import { CONNECT_TOKEN, CONNECTION_ID, connectionView, ITEM_ID, sessionView } from "@/lib/connections/fixtures";
import { connectionSchema, pluggySessionSchema } from "@/lib/connections/schema";
import {
  completeConnectionAction,
  disconnectAction,
  refreshConnectionAction,
  startSessionAction,
} from "./actions";

vi.mock("@/lib/auth0", () => ({ auth0: { getAccessToken: vi.fn() } }));
vi.mock("@/lib/connections/api", () => ({
  startPluggySession: vi.fn(),
  completePluggyConnection: vi.fn(),
  getConnection: vi.fn(),
  disconnectConnection: vi.fn(),
}));

const connected = connectionSchema.parse(connectionView());
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
});

describe("startSessionAction", () => {
  it("devolve ao navegador só o token limitado e o id da conexão", async () => {
    vi.mocked(startPluggySession).mockResolvedValue(session);
    const result = await startSessionAction();

    expect(result).toEqual({ status: "ok", connectToken: CONNECT_TOKEN, connectionId: CONNECTION_ID });
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
  it("registra o item e devolve a conexão", async () => {
    vi.mocked(completePluggyConnection).mockResolvedValue(connected);
    expect(await completeConnectionAction(ITEM_ID)).toEqual({ status: "ok", connection: connected });
    expect(completePluggyConnection).toHaveBeenCalledWith(ITEM_ID, { accessToken: "auth0-access-ficticio" });
  });

  it("recusa itemId inválido vindo do navegador", async () => {
    expect(await completeConnectionAction("../x")).toMatchObject({ status: "error" });
    expect(completePluggyConnection).not.toHaveBeenCalled();
  });

  it("aceita reenviar o mesmo itemId depois de uma falha de rede", async () => {
    vi.mocked(completePluggyConnection)
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(connected);
    expect(await completeConnectionAction(ITEM_ID)).toMatchObject({ status: "error" });
    expect(await completeConnectionAction(ITEM_ID)).toMatchObject({ status: "ok" });
    expect(vi.mocked(completePluggyConnection).mock.calls.map(([id]) => id)).toEqual([ITEM_ID, ITEM_ID]);
  });

  it("explica quando o item não pertence a esta pessoa", async () => {
    vi.mocked(completePluggyConnection).mockRejectedValue(problem(404, "CONNECTION_NOT_FOUND"));
    expect(JSON.stringify(await completeConnectionAction(ITEM_ID))).toMatch(/não foi encontrada/);
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
