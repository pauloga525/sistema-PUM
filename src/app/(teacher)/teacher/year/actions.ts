"use server";

import { cookies } from "next/headers";

export async function dismissOnboardingAction(): Promise<void> {
  (await cookies()).set("pum_onboarded", "1", {
    path:     "/",
    maxAge:   60 * 60 * 24 * 365 * 5,
    sameSite: "lax",
  });
}
