import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth0 } from "./lib/auth0";
import { proxy } from "./proxy";

vi.mock("./lib/auth0", () => ({
  auth0: {
    middleware: vi.fn(),
    getSession: vi.fn(),
  },
}));

const sdkResponse = NextResponse.next();

function request(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3001"));
}

beforeEach(() => {
  vi.mocked(auth0.middleware).mockReset().mockResolvedValue(sdkResponse);
  vi.mocked(auth0.getSession).mockReset();
});

describe("proxy", () => {
  it.each(["/contas", "/contas/qualquer"])("redireciona %s sem sessao para o login", async (path) => {
    vi.mocked(auth0.getSession).mockResolvedValue(null);
    const response = await proxy(request(path));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3001/auth/login");
  });

  it("libera /contas com sessao", async () => {
    vi.mocked(auth0.getSession).mockResolvedValue({ user: { sub: "auth0|ficticio" } } as never);
    expect(await proxy(request("/contas"))).toBe(sdkResponse);
  });

  it("delega /auth/* ao SDK sem consultar sessao", async () => {
    expect(await proxy(request("/auth/login"))).toBe(sdkResponse);
    expect(auth0.getSession).not.toHaveBeenCalled();
  });

  it("nao protege a pagina publica", async () => {
    expect(await proxy(request("/"))).toBe(sdkResponse);
    expect(auth0.getSession).not.toHaveBeenCalled();
  });
});
