import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { AppFrame } from "./app-frame";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth0.getSession();
  // O proxy ja protege estas rotas; aqui apenas evita renderizar sem identidade.
  if (!session) redirect("/auth/login");

  const identity = session.user.name ?? session.user.email ?? "Sua conta";

  return <AppFrame identity={identity}>{children}</AppFrame>;
}
