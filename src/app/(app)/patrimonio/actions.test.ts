import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth0 } from "@/lib/auth0";
import { ProblemDetailsError } from "@/lib/api/errors";
import { createPatrimony, getPatrimony, updatePatrimony } from "@/lib/patrimony/api";
import { ASSET_ID, FINANCING_ID, financingView } from "@/lib/patrimony/fixtures";
import { financingSchema } from "@/lib/patrimony/schema";
import { createPatrimonyAction, type PatrimonyFormState, updatePatrimonyAction } from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth0", () => ({ auth0: { getAccessToken: vi.fn() } }));
vi.mock("@/lib/patrimony/api", () => ({
  createPatrimony: vi.fn(),
  getPatrimony: vi.fn(),
  updatePatrimony: vi.fn(),
}));

const IDLE: PatrimonyFormState = { status: "idle" };
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const problem = (status: number, errors?: { path: string; code: string; message: string }[]) =>
  new ProblemDetailsError({ type: "about:blank", title: "t", status, code: "X", detail: "detalhe técnico", errors });

beforeEach(() => {
  vi.mocked(auth0.getAccessToken).mockReset().mockResolvedValue({ token: "auth0-ficticio" } as never);
  vi.mocked(createPatrimony).mockReset();
  vi.mocked(getPatrimony).mockReset();
  vi.mocked(updatePatrimony).mockReset();
});

describe("createPatrimonyAction", () => {
  it("envia o passivo convertido e informa sucesso", async () => {
    const result = await createPatrimonyAction("liabilities", IDLE, form({ description: "Empréstimo", outstandingBalance: "1.500,00" }));
    expect(result.status).toBe("success");
    expect(createPatrimony).toHaveBeenCalledWith(
      "liabilities",
      { description: "Empréstimo", outstandingBalance: "1500.00" },
      { accessToken: "auth0-ficticio" },
    );
  });

  it("não chama a API com campo inválido e devolve o que foi digitado", async () => {
    const result = await createPatrimonyAction("liabilities", IDLE, form({ description: "", outstandingBalance: "abc" }));
    expect(result).toMatchObject({ status: "invalid", values: { outstandingBalance: "abc" } });
    expect(createPatrimony).not.toHaveBeenCalled();
  });

  it("pede para entrar de novo sem sessão", async () => {
    vi.mocked(auth0.getAccessToken).mockRejectedValue(new Error("expirada"));
    const result = await createPatrimonyAction("liabilities", IDLE, form({ description: "x", outstandingBalance: "1" }));
    expect(result).toMatchObject({ status: "error", reauth: true });
  });

  it("aponta o campo recusado pelo backend sem exibir o texto técnico", async () => {
    vi.mocked(createPatrimony).mockRejectedValue(problem(400, [{ path: "/outstandingBalance", code: "pattern", message: "bad" }]));
    const result = await createPatrimonyAction("liabilities", IDLE, form({ description: "x", outstandingBalance: "1" }));
    expect(result).toMatchObject({ status: "invalid", errors: { outstandingBalance: expect.any(String) } });
    expect(JSON.stringify(result)).not.toContain("detalhe técnico");
  });

  it("bem escolhido inexistente vira mensagem de recarregar", async () => {
    vi.mocked(createPatrimony).mockRejectedValue(problem(404));
    const result = await createPatrimonyAction("financings", IDLE, form({ description: "x", outstandingBalance: "1", assetId: ASSET_ID }));
    expect(JSON.stringify(result)).toMatch(/Recarregue/);
  });
});

describe("updatePatrimonyAction", () => {
  const current = financingSchema.parse(financingView());

  it("envia só o campo alterado, comparando com o estado gravado", async () => {
    vi.mocked(getPatrimony).mockResolvedValue(current);
    const result = await updatePatrimonyAction(
      "financings",
      FINANCING_ID,
      IDLE,
      form({ description: current.description, outstandingBalance: "210.000,00", assetId: "" }),
    );
    expect(result.status).toBe("success");
    expect(updatePatrimony).toHaveBeenCalledWith("financings", FINANCING_ID, { assetId: null }, { accessToken: "auth0-ficticio" });
  });

  it("sem mudança, não envia PATCH", async () => {
    vi.mocked(getPatrimony).mockResolvedValue(current);
    const result = await updatePatrimonyAction(
      "financings",
      FINANCING_ID,
      IDLE,
      form({ description: current.description, outstandingBalance: "210000,00", assetId: ASSET_ID }),
    );
    expect(result).toMatchObject({ status: "invalid", message: "Nada foi alterado." });
    expect(updatePatrimony).not.toHaveBeenCalled();
  });

  it("item que sumiu vira mensagem de recarregar", async () => {
    vi.mocked(getPatrimony).mockRejectedValue(problem(404));
    const result = await updatePatrimonyAction("financings", FINANCING_ID, IDLE, form({ description: "x", outstandingBalance: "1", assetId: "" }));
    expect(result).toMatchObject({ status: "error" });
    expect(updatePatrimony).not.toHaveBeenCalled();
  });
});
