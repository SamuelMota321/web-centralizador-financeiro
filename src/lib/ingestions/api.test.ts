import { describe, expect, it, vi } from "vitest";
import { ProblemDetailsError } from "../api/errors";
import { confirmImport, createOfxPreview, getImportRun } from "./api";
import { DESTINATION_ACCOUNT_ID, IMPORT_RUN_ID, previewRun, resultRun } from "./fixtures";

const KEY = "5d0f6a52-8c1e-4e2b-9f3a-0b1c2d3e4f5a";
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

describe("createOfxPreview", () => {
  const file = new File(["OFXHEADER:100"], "extrato.ofx", { type: "application/x-ofx" });

  it("envia o arquivo no campo file, com bearer e Idempotency-Key", async () => {
    const fetchMock = stubFetch(201, previewRun());
    const run = await createOfxPreview(file, { ...context, idempotencyKey: KEY });

    const call = lastCall(fetchMock);
    expect(call.url).toBe(`${BASE}/ingestions/ofx/previews`);
    expect(call.init.method).toBe("POST");
    expect(call.headers.get("authorization")).toBe("Bearer token-ficticio");
    expect(call.headers.get("idempotency-key")).toBe(KEY);
    expect(call.headers.has("content-type")).toBe(false);
    const sent = (call.init.body as FormData).get("file") as File;
    expect(sent.name).toBe("extrato.ofx");
    expect(await sent.text()).toBe("OFXHEADER:100");
    expect(run.status).toBe("preview_ready");
  });

  it("aceita 202 com a prévia na fila", async () => {
    stubFetch(202, previewRun({ status: "queued", items: [], totalItems: 0 }));
    const run = await createOfxPreview(file, { ...context, idempotencyKey: KEY });
    expect(run.status).toBe("queued");
  });

  it("recusa chave inválida antes de chamar o backend", async () => {
    const fetchMock = stubFetch(201, previewRun());
    await expect(createOfxPreview(file, { ...context, idempotencyKey: "x" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("converte o erro em ProblemDetailsError", async () => {
    stubFetch(415, problemBody(415, "CODIGO_FICTICIO"));
    const error = await createOfxPreview(file, { ...context, idempotencyKey: KEY }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemDetailsError);
    expect(error).toMatchObject({ status: 415 });
  });
});

describe("confirmImport", () => {
  it("envia a conta de destino em JSON com Idempotency-Key", async () => {
    const fetchMock = stubFetch(200, resultRun());
    const run = await confirmImport(
      IMPORT_RUN_ID,
      { destinationAccountId: DESTINATION_ACCOUNT_ID },
      { ...context, idempotencyKey: KEY },
    );

    const call = lastCall(fetchMock);
    expect(call.url).toBe(`${BASE}/ingestions/${IMPORT_RUN_ID}/confirmations`);
    expect(call.init.method).toBe("POST");
    expect(call.headers.get("idempotency-key")).toBe(KEY);
    expect(call.headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(call.init.body))).toEqual({ destinationAccountId: DESTINATION_ACCOUNT_ID });
    expect(run.importedItems).toBe(1);
  });

  it("recusa id da importação que não é UUID", async () => {
    const fetchMock = stubFetch(200, resultRun());
    await expect(
      confirmImport("../x", { destinationAccountId: DESTINATION_ACCOUNT_ID }, { ...context, idempotencyKey: KEY }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserva o código de idempotência para a tela decidir se troca a chave", async () => {
    stubFetch(409, problemBody(409, "IDEMPOTENCY_KEY_REUSED"));
    const error = await confirmImport(
      IMPORT_RUN_ID,
      { destinationAccountId: DESTINATION_ACCOUNT_ID },
      { ...context, idempotencyKey: KEY },
    ).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });
});

describe("getImportRun", () => {
  it("consulta o estado pelo id, sem corpo nem chave", async () => {
    const fetchMock = stubFetch(200, resultRun());
    await getImportRun(IMPORT_RUN_ID, context);

    const call = lastCall(fetchMock);
    expect(call.url).toBe(`${BASE}/ingestions/${IMPORT_RUN_ID}`);
    expect(call.init.method).toBe("GET");
    expect(call.init.body).toBeUndefined();
    expect(call.headers.has("idempotency-key")).toBe(false);
  });
});
