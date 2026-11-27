import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { ProblemDetailsError } from "@/lib/api/errors";
import { auth0 } from "@/lib/auth0";
import { listInvestments } from "@/lib/investments/api";
import { requestSyncRun } from "@/lib/sync-runs/api";
import { refreshInvestmentsAction } from "./actions";
import { refreshMessage } from "./presentation";

vi.mock("@/lib/auth0", () => ({ auth0: { getAccessToken: vi.fn() } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/investments/api", () => ({ listInvestments: vi.fn() }));
vi.mock("@/lib/sync-runs/api", () => ({ requestSyncRun: vi.fn() }));

const ids = Array.from({ length: 7 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`);
const page = (connectionIds: string[]) => ({ portfolio: { connections: connectionIds.map((connectionId) => ({ connectionId, availability: "complete" })) } }) as never;
const problem = (status: number) =>
  new ProblemDetailsError({ type: "about:blank", title: "t", status, code: "X", detail: "d" });

beforeEach(() => {
  vi.mocked(auth0.getAccessToken).mockReset().mockResolvedValue({ token: "token-ficticio" } as never);
  vi.mocked(listInvestments).mockReset().mockResolvedValue(page(ids));
  vi.mocked(requestSyncRun).mockReset().mockResolvedValue({} as never);
  vi.mocked(revalidatePath).mockReset();
});

describe("refreshInvestmentsAction", () => {
  it("pede a sincronização de cada conexão da carteira (lida no servidor) e revalida", async () => {
    const result = await refreshInvestmentsAction();
    expect(result).toEqual({ status: "done", total: 7, requested: 7, running: 0, failed: 0 });
    expect(requestSyncRun).toHaveBeenCalledTimes(7);
    for (const id of ids) expect(requestSyncRun).toHaveBeenCalledWith(id, { accessToken: "token-ficticio" });
    expect(revalidatePath).toHaveBeenCalledWith("/investimentos");
  });

  it("409 conta como 'já em andamento'; outro erro conta como falha, sem derrubar o resto", async () => {
    vi.mocked(requestSyncRun)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(problem(409))
      .mockRejectedValueOnce(problem(500))
      .mockResolvedValue({} as never);
    expect(await refreshInvestmentsAction()).toEqual({ status: "done", total: 7, requested: 5, running: 1, failed: 1 });
  });

  it("sem conexões não chama a API de sincronização", async () => {
    vi.mocked(listInvestments).mockResolvedValue(page([]));
    expect(await refreshInvestmentsAction()).toEqual({ status: "done", total: 0, requested: 0, running: 0, failed: 0 });
    expect(requestSyncRun).not.toHaveBeenCalled();
  });

  it("401 pede para entrar de novo, na leitura da carteira ou numa sincronização", async () => {
    vi.mocked(listInvestments).mockRejectedValue(problem(401));
    expect(await refreshInvestmentsAction()).toMatchObject({ status: "error", reauth: true });
    vi.mocked(listInvestments).mockResolvedValue(page(ids));
    vi.mocked(requestSyncRun).mockRejectedValue(problem(401));
    expect(await refreshInvestmentsAction()).toMatchObject({ status: "error", reauth: true });
  });

  it("sem sessão pede para entrar de novo", async () => {
    vi.mocked(auth0.getAccessToken).mockRejectedValue(new Error("sem sessão"));
    expect(await refreshInvestmentsAction()).toMatchObject({ status: "error", reauth: true });
    expect(listInvestments).not.toHaveBeenCalled();
  });

  it("falha ao ler a carteira vira mensagem segura", async () => {
    vi.mocked(listInvestments).mockRejectedValue(problem(500));
    expect(await refreshInvestmentsAction()).toEqual({ status: "error", message: "Não foi possível ler suas conexões. Tente de novo." });
  });
});

describe("refreshMessage", () => {
  it("diz o que foi pedido, o que já andava e o que falhou", () => {
    expect(refreshMessage({ total: 4, requested: 4, running: 0, failed: 0 })).toEqual({
      tone: "success",
      text: "Atualização das conexões: 4 pedidas. Os dados novos podem levar alguns minutos.",
    });
    expect(refreshMessage({ total: 4, requested: 2, running: 1, failed: 1 }).tone).toBe("warning");
    expect(refreshMessage({ total: 4, requested: 2, running: 1, failed: 1 }).text).toContain("1 já estava em andamento");
    expect(refreshMessage({ total: 0, requested: 0, running: 0, failed: 0 }).tone).toBe("info");
  });
});
