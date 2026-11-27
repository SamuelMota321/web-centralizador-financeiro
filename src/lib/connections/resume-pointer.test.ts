import { describe, expect, it } from "vitest";
import { ProblemDetailsError } from "../api/errors";
import { CONNECTION_ID } from "./fixtures";
import { decodePointer, encodePointer, isAccessDenied, RESUME_COOKIE_PATH, resumeCookieOptions, userKey } from "./resume-pointer";

const USER_A = "auth0|usuario-a";
const USER_B = "auth0|usuario-b";

describe("ponteiro de retomada", () => {
  it("guarda e lê o connectionId do mesmo usuário", () => {
    expect(decodePointer(encodePointer(USER_A, CONNECTION_ID), USER_A)).toBe(CONNECTION_ID);
  });

  it("outro usuário na mesma máquina não herda o ponteiro", () => {
    expect(decodePointer(encodePointer(USER_A, CONNECTION_ID), USER_B)).toBeNull();
  });

  it("sem sessão ou sem cookie, não há ponteiro", () => {
    expect(decodePointer(encodePointer(USER_A, CONNECTION_ID), undefined)).toBeNull();
    expect(decodePointer(undefined, USER_A)).toBeNull();
  });

  it("ignora valor adulterado ou que não termina em UUID", () => {
    expect(decodePointer(`${userKey(USER_A)}.${CONNECTION_ID}.extra`, USER_A)).toBeNull();
    expect(decodePointer(`${userKey(USER_A)}.../x`, USER_A)).toBeNull();
    expect(decodePointer("qualquer", USER_A)).toBeNull();
  });

  it("recusa gravar algo que não seja UUID de conexão", () => {
    expect(() => encodePointer(USER_A, "item-da-pluggy")).toThrow();
  });

  it("não coloca o sub bruto no cookie", () => {
    expect(encodePointer(USER_A, CONNECTION_ID)).not.toContain("usuario-a");
  });

  it("o cookie é httpOnly, restrito à tela e sem expiração fixa", () => {
    expect(resumeCookieOptions).toMatchObject({ httpOnly: true, sameSite: "lax", path: RESUME_COOKIE_PATH });
    expect(resumeCookieOptions).not.toHaveProperty("maxAge");
  });

  it("reconhece 403 e 404 como acesso negado", () => {
    const problem = (status: number) => new ProblemDetailsError({ type: "t", title: "t", status, code: "X", detail: "d" });
    expect(isAccessDenied(problem(404))).toBe(true);
    expect(isAccessDenied(problem(403))).toBe(true);
    expect(isAccessDenied(problem(503))).toBe(false);
    expect(isAccessDenied(new Error("x"))).toBe(false);
  });
});
