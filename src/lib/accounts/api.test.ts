import { describe, expect, it, vi } from "vitest";
import { ProblemDetailsError } from "../api/errors";
import {
  deactivateAccount,
  listAccounts,
  PossibleDuplicateAccountError,
  updateAccount,
} from "./api";

const ACCOUNT_ID = "3f1c2b4e-8a6d-4c1e-9b2a-7d5e6f8a9b0c";
const context = { accessToken: "token-ficticio" };

const accountView = {
  id: ACCOUNT_ID,
  name: "Reserva",
  type: "savings",
  origin: "manual",
  institutionName: null,
  initialBalance: "100.00",
  initialBalanceAsOf: "2026-09-10",
  currencyCode: "BRL",
  archivedAt: null,
  createdAt: "2026-09-10T10:00:00.000Z",
  updatedAt: "2026-09-11T10:00:00.000Z",
};

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

function problemBody(status: number, code: string, extra: Record<string, unknown> = {}) {
  return { type: "about:blank", title: "t", status, code, detail: "d", ...extra };
}

describe("updateAccount", () => {
  it("envia PATCH somente com os campos informados", async () => {
    const fetchMock = stubFetch(200, accountView);
    const result = await updateAccount(ACCOUNT_ID, { name: "Reserva" }, context);

    const { url, init, headers } = lastCall(fetchMock);
    expect(url).toBe(`http://api.test.local/api/v1/accounts/${ACCOUNT_ID}`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ name: "Reserva" });
    expect(headers.get("authorization")).toBe("Bearer token-ficticio");
    expect(result.name).toBe("Reserva");
  });

  it("recusa id que nao e UUID sem chamar a API", async () => {
    const fetchMock = stubFetch(200, accountView);
    await expect(updateAccount("../1", { name: "x" }, context)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recusa PATCH vazio sem chamar a API", async () => {
    const fetchMock = stubFetch(200, accountView);
    await expect(updateAccount(ACCOUNT_ID, {}, context)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("converte o 409 de duplicidade em erro com candidatas", async () => {
    stubFetch(
      409,
      problemBody(409, "POSSIBLE_CONNECTED_ACCOUNT_DUPLICATE", {
        candidates: [
          { id: ACCOUNT_ID, name: "Conta", type: "checking", origin: "connected", institutionName: null },
        ],
      }),
    );
    const error = await updateAccount(ACCOUNT_ID, { name: "Conta" }, context).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PossibleDuplicateAccountError);
    expect((error as PossibleDuplicateAccountError).candidates).toHaveLength(1);
  });

  it("converte 404 em ProblemDetailsError com o codigo do contrato", async () => {
    stubFetch(404, problemBody(404, "ACCOUNT_NOT_FOUND"));
    const error = await updateAccount(ACCOUNT_ID, { name: "x" }, context).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemDetailsError);
    expect((error as ProblemDetailsError).code).toBe("ACCOUNT_NOT_FOUND");
  });

  it("falha quando a resposta foge do contrato", async () => {
    stubFetch(200, { ...accountView, initialBalance: 100 });
    await expect(updateAccount(ACCOUNT_ID, { name: "x" }, context)).rejects.toThrow();
  });
});

describe("deactivateAccount", () => {
  it("envia POST sem corpo para a rota de desativacao", async () => {
    const fetchMock = stubFetch(200, { ...accountView, archivedAt: "2026-09-12T10:00:00.000Z" });
    const result = await deactivateAccount(ACCOUNT_ID, context);

    const { url, init } = lastCall(fetchMock);
    expect(url).toBe(`http://api.test.local/api/v1/accounts/${ACCOUNT_ID}/deactivate`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(result.archivedAt).not.toBeNull();
  });
});

describe("listAccounts", () => {
  it("usa a paginacao padrao e valida a pagina", async () => {
    const fetchMock = stubFetch(200, { items: [accountView], page: 1, pageSize: 20, total: 1 });
    const page = await listAccounts({}, context);
    expect(lastCall(fetchMock).url).toBe("http://api.test.local/api/v1/accounts?page=1&pageSize=20");
    expect(page.items).toHaveLength(1);
  });
});
