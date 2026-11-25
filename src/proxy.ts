import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";
import { RESUME_COOKIE, RESUME_COOKIE_PATH } from "./lib/connections/resume-pointer";

const PROTECTED_PREFIXES = ["/contas", "/movimentacoes", "/categorias", "/regras"];

export async function proxy(request: NextRequest) {
  const authResponse = await auth0.middleware(request);
  const { pathname } = new URL(request.url);

  if (pathname.startsWith("/auth")) {
    // C-01: sair apaga o ponteiro de retomada da conexao.
    if (pathname === "/auth/logout") authResponse.cookies.set(RESUME_COOKIE, "", { path: RESUME_COOKIE_PATH, maxAge: 0 });
    return authResponse;
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected) {
    const session = await auth0.getSession(request);
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return authResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
