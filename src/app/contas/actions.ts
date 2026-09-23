"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { createAccount, PossibleDuplicateAccountError } from "@/lib/accounts/api";
import { manualAccountInputSchema } from "@/lib/accounts/schema";
import { ProblemDetailsError } from "@/lib/api/errors";
import type { DuplicateCandidate } from "@/lib/accounts/types";

export type CreateAccountState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "invalid"; fieldErrors: Record<string, string[] | undefined> }
  | { status: "duplicate"; candidates: DuplicateCandidate[] }
  | { status: "error"; message: string };

export async function createAccountAction(
  _previous: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const parsed = manualAccountInputSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    institutionName: formData.get("institutionName"),
    initialBalance: formData.get("initialBalance"),
    initialBalanceAsOf: formData.get("initialBalanceAsOf"),
    confirmPossibleDuplicate: formData.get("confirmPossibleDuplicate") === "true",
  });

  if (!parsed.success) {
    return {
      status: "invalid",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { token } = await auth0.getAccessToken();
    await createAccount(parsed.data, { accessToken: token });
    revalidatePath("/contas");
    return { status: "success" };
  } catch (error) {
    if (error instanceof PossibleDuplicateAccountError) {
      return { status: "duplicate", candidates: error.candidates };
    }
    if (error instanceof ProblemDetailsError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Nao foi possivel criar a conta." };
  }
}
