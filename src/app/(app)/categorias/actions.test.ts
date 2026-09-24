import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { ProblemDetailsError, type ProblemDetails } from "@/lib/api/errors";
import {
  createCategory,
  deactivateCategory,
  listCategories,
  renameCategory,
} from "@/lib/categories/api";
import type { Category } from "@/lib/categories/types";
import { archiveCategoryAction, createCategoryAction, renameCategoryAction } from "./actions";
import { DUPLICATE_NAME_MESSAGE } from "./category-names";

vi.mock("@/lib/auth0", () => ({ auth0: { getAccessToken: vi.fn() } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  RedirectType: { push: "push", replace: "replace" },
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("@/lib/categories/api", () => ({
  createCategory: vi.fn(),
  renameCategory: vi.fn(),
  deactivateCategory: vi.fn(),
  listCategories: vi.fn(),
}));

const CATEGORY_ID = "7c6b5a49-3827-4165-9a8b-7c6d5e4f3a2b";

function category(overrides: Partial<Category> = {}): Category {
  return {
    id: CATEGORY_ID,
    name: "Mercado",
    source: "user",
    status: "active",
    archivedAt: null,
    createdAt: "2026-09-20T12:00:00.000Z",
    updatedAt: "2026-09-20T12:00:00.000Z",
    ...overrides,
  };
}

function problem(status: number, code: string, extra: Partial<ProblemDetails> = {}) {
  return new ProblemDetailsError({
    type: "about:blank",
    title: "t",
    status,
    code,
    detail: "Technical detail in English.",
    ...extra,
  });
}

function form(name: string) {
  const data = new FormData();
  data.set("name", name);
  return data;
}

function existing(...items: Category[]) {
  vi.mocked(listCategories).mockResolvedValue({ items, page: 1, pageSize: 100, total: items.length });
}

beforeEach(() => {
  vi.mocked(auth0.getAccessToken).mockReset().mockResolvedValue({ token: "token-ficticio" } as never);
  for (const fn of [createCategory, renameCategory, deactivateCategory, listCategories]) {
    vi.mocked(fn).mockReset();
  }
  vi.mocked(revalidatePath).mockReset();
  existing();
});

describe("createCategoryAction", () => {
  it("cria com nome normalizado e revalida categorias e movimentações", async () => {
    vi.mocked(createCategory).mockResolvedValue(category());

    const state = await createCategoryAction({ status: "idle" }, form("  Alimentação   fora "));

    expect(createCategory).toHaveBeenCalledWith(
      { name: "Alimentação fora" },
      { accessToken: "token-ficticio" },
    );
    expect(state).toEqual({ status: "success" });
    expect(revalidatePath).toHaveBeenCalledWith("/categorias");
    expect(revalidatePath).toHaveBeenCalledWith("/movimentacoes");
  });

  it.each(["", "   ", "a".repeat(101)])("recusa nome inválido %j sem chamar a API", async (name) => {
    const state = await createCategoryAction({ status: "idle" }, form(name));

    expect(createCategory).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: "invalid", name });
  });

  it("recusa nome repetido, inclusive de categoria arquivada, sem chamar a API", async () => {
    existing(category({ status: "archived" }));

    const state = await createCategoryAction({ status: "idle" }, form("Mercado"));

    expect(createCategory).not.toHaveBeenCalled();
    expect(state).toEqual({ status: "invalid", name: "Mercado", message: DUPLICATE_NAME_MESSAGE });
  });

  it("500 (nome repetido por corrida) vira mensagem segura que cita a causa provavel", async () => {
    vi.mocked(createCategory).mockRejectedValue(problem(500, "INTERNAL_ERROR"));

    const state = await createCategoryAction({ status: "idle" }, form("Mercado"));

    expect(state).toMatchObject({ status: "error", message: expect.stringContaining("use outro") });
    expect(state.status === "error" && state.message).not.toContain("English");
  });

  it("segue para o backend se a verificacao de nomes falhar", async () => {
    vi.mocked(listCategories).mockRejectedValue(new TypeError("fetch failed"));
    vi.mocked(createCategory).mockResolvedValue(category());

    expect(await createCategoryAction({ status: "idle" }, form("Mercado"))).toEqual({
      status: "success",
    });
  });

  it("sessão expirada pede novo login", async () => {
    vi.mocked(auth0.getAccessToken).mockRejectedValue(new Error("expired"));

    const state = await createCategoryAction({ status: "idle" }, form("Mercado"));

    expect(state).toMatchObject({ status: "error", reauth: true });
    expect(createCategory).not.toHaveBeenCalled();
  });
});

describe("renameCategoryAction", () => {
  it("renomeia e redireciona com aviso", async () => {
    vi.mocked(renameCategory).mockResolvedValue(category({ name: "Feira" }));

    await expect(
      renameCategoryAction(CATEGORY_ID, { status: "idle" }, form("Feira")),
    ).rejects.toThrow("NEXT_REDIRECT /categorias?aviso=categoria-renomeada");
    expect(revalidatePath).toHaveBeenCalledWith("/movimentacoes");
  });

  it("permite manter o próprio nome", async () => {
    existing(category());
    vi.mocked(renameCategory).mockResolvedValue(category());

    await expect(
      renameCategoryAction(CATEGORY_ID, { status: "idle" }, form("Mercado")),
    ).rejects.toThrow("categoria-renomeada");
  });

  it("recusa nome de outra categoria", async () => {
    existing(category(), category({ id: "0f0e0d0c-0b0a-4908-8706-050403020100", name: "Feira" }));

    const state = await renameCategoryAction(CATEGORY_ID, { status: "idle" }, form("Feira"));

    expect(state).toMatchObject({ status: "invalid", message: DUPLICATE_NAME_MESSAGE });
    expect(renameCategory).not.toHaveBeenCalled();
  });

  it("categoria de outro tenant ou inexistente recebe aviso neutro", async () => {
    vi.mocked(renameCategory).mockRejectedValue(problem(404, "CATEGORY_NOT_FOUND"));

    await expect(
      renameCategoryAction(CATEGORY_ID, { status: "idle" }, form("Feira")),
    ).rejects.toThrow("categoria-indisponivel");
  });

  it("400 sem erros de campo (categoria arquivada) explica sem detalhe tecnico", async () => {
    vi.mocked(renameCategory).mockRejectedValue(problem(400, "INVALID_REQUEST"));

    const state = await renameCategoryAction(CATEGORY_ID, { status: "idle" }, form("Feira"));

    expect(state).toMatchObject({ status: "error", message: expect.stringContaining("arquivada") });
  });
});

describe("archiveCategoryAction", () => {
  it("arquiva e redireciona com aviso", async () => {
    vi.mocked(deactivateCategory).mockResolvedValue(category({ status: "archived" }));

    await expect(archiveCategoryAction(CATEGORY_ID)).rejects.toThrow(
      "NEXT_REDIRECT /categorias?aviso=categoria-arquivada",
    );
  });

  it("500 mantém o usuário na tela com mensagem segura", async () => {
    vi.mocked(deactivateCategory).mockRejectedValue(problem(500, "INTERNAL_ERROR"));

    expect(await archiveCategoryAction(CATEGORY_ID)).toMatchObject({
      status: "error",
      message: expect.stringContaining("Tente de novo"),
    });
  });

  it.each([
    [401, "AUTHENTICATION_REQUIRED"],
    [403, "IDENTITY_CONTEXT_UNAVAILABLE"],
  ])("%i pede novo login", async (status, code) => {
    vi.mocked(deactivateCategory).mockRejectedValue(problem(status, code));

    expect(await archiveCategoryAction(CATEGORY_ID)).toMatchObject({ reauth: true });
  });
});
