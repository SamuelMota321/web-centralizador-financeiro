import { describe, expect, it, vi } from "vitest";
import { apiRequest, ApiRequestError } from "./http-client";

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
    stubFetch(502);
    const error = await apiRequest("/accounts").catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 502, code: "http_502" });
  });
});
