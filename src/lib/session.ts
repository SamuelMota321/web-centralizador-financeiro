import { auth0 } from "./auth0";
import { PROBLEM_CODES, ProblemDetailsError } from "./api/errors";
import { ApiRequestError } from "./api/http-client";

/** Access token da sessao; null quando a sessao expirou ou o refresh foi recusado. */
export async function accessTokenOrNull(): Promise<string | null> {
  try {
    const { token } = await auth0.getAccessToken();
    return token;
  } catch {
    return null;
  }
}

/** 401 ou identidade indisponivel: o usuario precisa entrar de novo. */
export function isAuthFailure(error: unknown): boolean {
  if (error instanceof ProblemDetailsError) {
    return error.status === 401 || error.code === PROBLEM_CODES.identityContextUnavailable;
  }
  return error instanceof ApiRequestError && error.status === 401;
}
