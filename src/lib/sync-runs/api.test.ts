import { describe, expect, it, vi } from "vitest";
import { ProblemDetailsError } from "../api/errors";
import { getSyncRun, isFinalSyncRunStatus, isTrustedStatusUrl, requestSyncRun } from "./api";
import { RUN_ID, SYNC_CONNECTION_ID, syncRunView } from "./fixtures";
import { SYNC_RUN_STATUSES } from "./types";

const context = { accessToken: "token-ficticio" };
const BASE = "http://api.test.local/api/v1";

function stubFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn(async () =>
    new Response(body === undefined ? "" : JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastCall(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
}

const problemBody = (status: number, code: string) => ({
  type: "about:blank",
  title: "t",
  status,
  code,
  detail: "d",
});

describe("requestSyncRun", () => {
  it("solicita a execução sem corpo nem Idempotency-Key e lê o 202", async () => {
    const fetchMock = stubFetch(202, syncRunView());
    const run = await requestSyncRun(SYNC_CONNECTION_ID, context);

    const call = lastCall(fetchMock);
    expect(call.url).toBe(`${BASE}/connections/${SYNC_CONNECTION_ID}/sync-runs`);
    expect(call.init.method).toBe("POST");
    expect(call.init.body).toBeUndefined();
    expect(call.headers.get("authorization")).toBe("Bearer token-ficticio");
    expect(call.headers.has("idempotency-key")).toBe(false);
    expect(run).toMatchObject({ runId: RUN_ID, status: "queued", startedAt: null, completedAt: null });
  });

  it("recusa connectionId que não é UUID antes de chamar a API", async () => {
    const fetchMock = stubFetch(202, syncRunView());
    await expect(requestSyncRun("não-uuid", context)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("converte erro da API em ProblemDetailsError", async () => {
    stubFetch(404, problemBody(404, "CONNECTION_NOT_FOUND"));
    const error = await requestSyncRun(SYNC_CONNECTION_ID, context).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemDetailsError);
    expect(error).toMatchObject({ status: 404 });
  });

  it("recusa estado fora do contrato", async () => {
    stubFetch(202, syncRunView({ status: "done" }));
    await expect(requestSyncRun(SYNC_CONNECTION_ID, context)).rejects.toThrow();
  });
});

describe("getSyncRun", () => {
  it("consulta a execução pela conexão e pelo runId", async () => {
    const fetchMock = stubFetch(
      200,
      syncRunView({
        status: "succeeded",
        startedAt: "2026-11-02T12:00:05.000Z",
        completedAt: "2026-11-02T12:01:00.000Z",
      }),
    );
    const run = await getSyncRun(SYNC_CONNECTION_ID, RUN_ID, context);

    const call = lastCall(fetchMock);
    expect(call.url).toBe(`${BASE}/connections/${SYNC_CONNECTION_ID}/sync-runs/${RUN_ID}`);
    expect(call.init.method).toBe("GET");
    expect(run.status).toBe("succeeded");
    expect(run.completedAt).toBe("2026-11-02T12:01:00.000Z");
  });
});

describe("isFinalSyncRunStatus", () => {
  it("só succeeded, partial e failed encerram a consulta", () => {
    for (const status of SYNC_RUN_STATUSES) {
      expect(isFinalSyncRunStatus(status)).toBe(["succeeded", "partial", "failed"].includes(status));
    }
  });
});

describe("isTrustedStatusUrl", () => {
  it("aceita caminho relativo e URL absoluta da mesma origem da API", () => {
    expect(isTrustedStatusUrl(`/api/v1/connections/${SYNC_CONNECTION_ID}/sync-runs/${RUN_ID}`, BASE)).toBe(true);
    expect(isTrustedStatusUrl(`${BASE}/connections/x/sync-runs/y`, BASE)).toBe(true);
  });

  it("recusa outra origem e valor inválido", () => {
    expect(isTrustedStatusUrl("https://outro.exemplo/api/v1/sync-runs/1", BASE)).toBe(false);
    expect(isTrustedStatusUrl("//outro.exemplo/x", BASE)).toBe(false);
    expect(isTrustedStatusUrl("http://[", BASE)).toBe(false);
  });
});
