import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiRequestError, MAX_CONCURRENT_REQUESTS, REQUEST_TIMEOUT_MS, RequestTimeoutError, retryAfterMs } from "./http-client";

function stubFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn(async () =>
    new Response(body === undefined ? "" : JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastRequest(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
}

describe("apiRequest", () => {
  it("envia o bearer somente quando o token e informado", async () => {
    const fetchMock = stubFetch(200, { ok: true });

    await apiRequest("/accounts", { accessToken: "token-ficticio" });
    expect(lastRequest(fetchMock).headers.get("authorization")).toBe("Bearer token-ficticio");

    await apiRequest("/accounts");
    expect(lastRequest(fetchMock).headers.has("authorization")).toBe(false);
  });

  it("nunca permite cache da resposta autenticada", async () => {
    const fetchMock = stubFetch(200, {});
    await apiRequest("/transactions", { accessToken: "token-ficticio", cache: "force-cache" });
    const [, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
    expect(init.cache).toBe("no-store");
  });

  it("monta a URL com a base e ignora parametros indefinidos", async () => {
    const fetchMock = stubFetch(200, {});
    await apiRequest("/accounts", { query: { page: 2, pageSize: undefined } });
    expect(lastRequest(fetchMock).url).toBe("http://api.test.local/api/v1/accounts?page=2");
  });

  it("serializa o corpo como JSON e só define content-type quando há corpo", async () => {
    const fetchMock = stubFetch(200, {});
    await apiRequest("/accounts", { method: "POST", body: { name: "Conta" } });
    const withBody = lastRequest(fetchMock);
    expect(withBody.init.body).toBe('{"name":"Conta"}');
    expect(withBody.headers.get("content-type")).toBe("application/json");

    await apiRequest("/accounts/x/deactivate", { method: "POST" });
    const withoutBody = lastRequest(fetchMock);
    expect(withoutBody.init.body).toBeUndefined();
    expect(withoutBody.headers.has("content-type")).toBe(false);
  });

  it("envia FormData sem serializar e deixa o fetch definir o content-type", async () => {
    const fetchMock = stubFetch(201, {});
    const form = new FormData();
    form.append("file", new File(["OFXHEADER:100"], "extrato.ofx"));

    await apiRequest("/ingestions/ofx/previews", { method: "POST", body: form });
    const request = lastRequest(fetchMock);
    expect(request.init.body).toBe(form);
    expect(request.headers.has("content-type")).toBe(false);
  });

  it("normaliza erro Problem Details preservando o corpo", async () => {
    stubFetch(404, {
      type: "about:blank",
      title: "Account not found",
      status: 404,
      code: "ACCOUNT_NOT_FOUND",
      detail: "The requested account was not found.",
    });
    const error = await apiRequest("/accounts/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 404, code: "ACCOUNT_NOT_FOUND" });
  });

  it("normaliza erro sem corpo com código sintético", async () => {
    stubFetch(500);
    const error = await apiRequest("/accounts").catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 500, code: "http_500" });
  });
});

describe("nova tentativa em leituras", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function sequence(...steps: (number | Error)[]) {
    
    const fetchMock = vi.fn(async () => {
      const step = steps.shift() ?? 200;
      if (step instanceof Error) throw step;
      return new Response(step === 200 ? '{"ok":true}' : "", { status: step });
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  /** Sem aleatoriedade: o teste controla o relógio com precisão. */
  const noJitter = () => vi.spyOn(Math, "random").mockReturnValue(0);

  it("GET repete em 503 e depois em 429, e a espera cresce a cada tentativa (1 s, depois 5 s)", async () => {
    vi.useFakeTimers();
    noJitter();
    const fetchMock = sequence(503, 429, 200);
    const promise = apiRequest<{ ok: boolean }>("/accounts");
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("GET repete em falha de rede", async () => {
    vi.useFakeTimers();
    noJitter();
    const fetchMock = sequence(new TypeError("fetch failed"), 200);
    const promise = apiRequest("/accounts");
    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("429 insiste mais que 5xx: quatro esperas (2, 5, 10 e 20 s) antes de desistir", async () => {
    vi.useFakeTimers();
    noJitter();
    const fetchMock = sequence(429, 429, 429, 429, 429);
    const assertion = expect(apiRequest("/accounts")).rejects.toMatchObject({ status: 429 });
    await vi.advanceTimersByTimeAsync(2000 + 5000 + 10000 + 20000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("5xx desiste depois de 3 repetições", async () => {
    vi.useFakeTimers();
    noJitter();
    const fetchMock = sequence(503, 503, 503, 503);
    const assertion = expect(apiRequest("/accounts")).rejects.toMatchObject({ status: 503 });
    await vi.advanceTimersByTimeAsync(1000 + 2500 + 5000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("o Retry-After do servidor manda quando é maior (até 30 s no 429)", async () => {
    vi.useFakeTimers();
    noJitter();
    const calls: number[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls.push(Date.now());
        return calls.length === 1 ? new Response("", { status: 429, headers: { "retry-after": "15" } }) : new Response('{"ok":true}', { status: 200 });
      }),
    );
    const promise = apiRequest("/accounts");
    await vi.advanceTimersByTimeAsync(14_999);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  it("não repete 401 nem escritas", async () => {
    const unauthorized = sequence(401);
    await expect(apiRequest("/accounts")).rejects.toMatchObject({ status: 401 });
    expect(unauthorized).toHaveBeenCalledTimes(1);

    const write = sequence(503);
    await expect(apiRequest("/transactions", { method: "POST", body: { a: 1 } })).rejects.toMatchObject({ status: 503 });
    expect(write).toHaveBeenCalledTimes(1);

    const failedWrite = sequence(new TypeError("fetch failed"));
    await expect(apiRequest("/transactions", { method: "PATCH", body: {} })).rejects.toBeInstanceOf(TypeError);
    expect(failedWrite).toHaveBeenCalledTimes(1);
  });

  it("Retry-After em segundos vale com teto; datas são ignoradas", () => {
    expect(retryAfterMs("3")).toBe(3000);
    expect(retryAfterMs("999")).toBe(8000);
    expect(retryAfterMs("999", 30_000)).toBe(30_000);
    expect(retryAfterMs("Wed, 21 Oct 2026 07:28:00 GMT")).toBeNull();
    expect(retryAfterMs(null)).toBeNull();
  });
});

describe("teto de chamadas simultâneas", () => {
  afterEach(() => vi.restoreAllMocks());

  it("com 8 leituras ao mesmo tempo, nunca há mais que MAX_CONCURRENT_REQUESTS em andamento, e todas terminam", async () => {
    
    let running = 0;
    let peak = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 10));
        running -= 1;
        return new Response('{"ok":true}', { status: 200 });
      }),
    );
    const results = await Promise.all(Array.from({ length: 8 }, () => apiRequest<{ ok: boolean }>("/accounts")));
    expect(results.every((result) => result.ok)).toBe(true);
    expect(peak).toBe(MAX_CONCURRENT_REQUESTS);
  });

  it("uma falha não prende a vaga: as seguintes continuam", async () => {
    
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    const settled = await Promise.allSettled(Array.from({ length: 6 }, () => apiRequest("/accounts")));
    expect(settled.every((item) => item.status === "rejected")).toBe(true);
    // Se alguma vaga tivesse vazado, esta chamada ficaria para sempre na fila.
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"ok":true}', { status: 200 })));
    await expect(apiRequest("/accounts")).resolves.toEqual({ ok: true });
  });
});

describe("tempo limite das leituras", () => {
  afterEach(() => vi.useRealTimers());

  /** fetch que nunca responde e só termina quando o sinal aborta, como uma conexão aberta e muda. */
  function hanging() {
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("leitura que não responde vira RequestTimeoutError no tempo limite e não repete", async () => {
    vi.useFakeTimers();
    
    const fetchMock = hanging();
    const assertion = expect(apiRequest("/accounts")).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("resposta dentro do prazo não é afetada (o relógio é limpo)", async () => {
    vi.useFakeTimers();
    
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"ok":true}', { status: 200 })));
    await expect(apiRequest("/accounts")).resolves.toEqual({ ok: true });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("escrita não ganha tempo limite (abortar um POST aceito pelo servidor poderia duplicar)", async () => {
    
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeUndefined();
      return new Response("{}", { status: 201 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await apiRequest("/transactions", { method: "POST", body: { a: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
