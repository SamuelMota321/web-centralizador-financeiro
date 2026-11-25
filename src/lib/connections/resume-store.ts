import { cookies } from "next/headers";
import { auth0 } from "../auth0";
import { decodePointer, encodePointer, RESUME_COOKIE, resumeCookieOptions } from "./resume-pointer";

// Estado no servidor: cookie de sessao (some ao fechar o navegador), httpOnly e por usuario.

async function currentSub(): Promise<string | undefined> {
  const session = await auth0.getSession();
  return session?.user.sub;
}

/** connectionId guardado para o usuario atual, ou null (sem cookie, outro usuario ou invalido). */
export async function readResumePointer(): Promise<string | null> {
  const sub = await currentSub();
  const jar = await cookies();
  return decodePointer(jar.get(RESUME_COOKIE)?.value, sub);
}

export async function saveResumePointer(connectionId: string): Promise<void> {
  const sub = await currentSub();
  if (!sub) return;
  const jar = await cookies();
  jar.set(RESUME_COOKIE, encodePointer(sub, connectionId), resumeCookieOptions);
}

export async function clearResumePointer(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: RESUME_COOKIE, path: resumeCookieOptions.path });
}
