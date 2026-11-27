import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./http-client";
import { bodyPreview, describeError, describeResponse, safePath } from "./upstream-log";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("o que entra no log", () => {
  it("o caminho perde a query e os identificadores", () => {
    expect(safePath("/patrimony/assets/3f1c2b4e-8a6d-4c1e-9b2a-7d5e6f8a9b0c/history?page=2&secret=x")).toBe("/patrimony/assets/:id/history");
  });

  it("o corpo é curto, sem espaços repetidos e sem aparência de credencial", () => {
    expect(bodyPreview("  error   code:\n 1015 ")).toBe("error code: 1015");
    expect(bodyPreview("falha com Bearer abc.def.ghi e mais texto")).toBe("falha com Bearer [redigido] e mais texto");
    expect(bodyPreview(`token ${"a".repeat(40)} fim`)).toBe("token [redigido] fim");
    expect(bodyPreview("x ".repeat(200)).length).toBeLessThanOrEqual(161);
  });

  it("descreve a resposta com quem respondeu, sem o Authorization", () => {
    const response = new Response("Too Many Requests", {
      status: 429,
      headers: { server: "cloudflare", "cf-ray": "a60dd1da094bc15f-CWB", "retry-after": "12", "content-type": "text/plain", authorization: "Bearer segredo" },
    });
    const entry = describeResponse("/transactions?page=1", 2, response, "Too Many Requests");
    expect(entry).toMatchObject({ event: "status", path: "/transactions", attempt: 2, status: 429, retryAfter: "12", server: "cloudflare", cfRay: "a60dd1da094bc15f-CWB", contentType: "text/plain", bodyPreview: "Too Many Requests" });
    expect(JSON.stringify(entry)).not.toMatch(/segredo|authorization/i);
  });

  it("descreve falha de rede e tempo limite com o código da causa", () => {
    const error = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    expect(describeError("/accounts", 1, error, false)).toEqual({ event: "network", path: "/accounts", attempt: 1, errorName: "TypeError", errorCode: "ECONNREFUSED" });
    expect(describeError("/accounts", 1, new Error("x"), true).event).toBe("timeout");
  });
});

describe("apiRequest registra cada 429 e 5xx, uma linha por tentativa, sem credencial", () => {
  it("429 seguido de sucesso: uma linha, com o caminho e a tentativa", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => (++calls === 1 ? new Response("error code: 1015", { status: 429, headers: { server: "cloudflare" } }) : new Response('{"ok":true}', { status: 200 }))),
    );
    const promise = apiRequest("/accounts/3f1c2b4e-8a6d-4c1e-9b2a-7d5e6f8a9b0c", { accessToken: "token-ficticio-12345678901234567890" });
    await vi.advanceTimersByTimeAsync(2000);
    await promise;
    expect(warn).toHaveBeenCalledTimes(1);
    const [prefix, json] = warn.mock.calls[0] as [string, string];
    expect(prefix).toBe("[api-upstream]");
    expect(JSON.parse(json)).toMatchObject({ event: "status", path: "/accounts/:id", attempt: 1, status: 429, server: "cloudflare", bodyPreview: "error code: 1015" });
    expect(json).not.toContain("token-ficticio");
  });

  it("resposta normal e 4xx comuns não geram log", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"ok":true}', { status: 200 })));
    await apiRequest("/accounts");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    await expect(apiRequest("/accounts")).rejects.toMatchObject({ status: 401 });
    expect(warn).not.toHaveBeenCalled();
  });

  it("falha de rede também é registrada", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => { if (++calls === 1) throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }); return new Response('{"ok":true}', { status: 200 }); }));
    const promise = apiRequest("/accounts");
    await vi.advanceTimersByTimeAsync(1000);
    await promise;
    expect(JSON.parse((warn.mock.calls[0] as [string, string])[1])).toMatchObject({ event: "network", errorCode: "ECONNRESET" });
  });
});
