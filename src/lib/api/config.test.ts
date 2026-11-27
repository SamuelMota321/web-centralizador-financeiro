import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load() {
  vi.resetModules();
  return import("./config");
}

describe("config da API", () => {
  it("sem API_INTERNAL_BASE_URL, o servidor usa a URL pública", async () => {
    vi.stubEnv("API_INTERNAL_BASE_URL", "");
    const config = await load();
    expect(config.apiServerBaseUrl).toBe(config.apiBaseUrl);
  });

  it("com API_INTERNAL_BASE_URL, o servidor usa a interna e a pública continua a mesma", async () => {
    vi.stubEnv("API_INTERNAL_BASE_URL", "http://backend-centralizador-financeiro:10000/api/v1/");
    const config = await load();
    expect(config.apiServerBaseUrl).toBe("http://backend-centralizador-financeiro:10000/api/v1");
    expect(config.apiBaseUrl).toBe("http://api.test.local/api/v1");
  });

  it("recusa valor que não é uma URL http(s), em vez de chamar um endereço errado", async () => {
    vi.stubEnv("API_INTERNAL_BASE_URL", "backend-centralizador-financeiro:10000");
    await expect(load()).rejects.toThrow(/API_INTERNAL_BASE_URL inválido/);
    vi.stubEnv("API_INTERNAL_BASE_URL", "ftp://servico/api");
    await expect(load()).rejects.toThrow(/http ou https/);
  });
});

describe("o cliente HTTP usa a base do servidor", () => {
  it("as leituras vão para API_INTERNAL_BASE_URL quando existe", async () => {
    vi.stubEnv("API_INTERNAL_BASE_URL", "http://interno:10000/api/v1");
    vi.resetModules();
    const { apiRequest } = await import("./http-client");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await apiRequest("/accounts");
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("http://interno:10000/api/v1/accounts");
    vi.unstubAllGlobals();
  });
});
