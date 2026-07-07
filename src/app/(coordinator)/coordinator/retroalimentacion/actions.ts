"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import { ROUTES } from "@/constants/routes";

export async function sendForSignatureAction(
  planId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session || session.user.role !== "COORDINATOR") redirect(ROUTES.LOGIN);
  try {
    await coordinatorService.sendForSignature(planId, session.user.id);
    revalidatePath("/coordinator/retroalimentacion");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo enviar para firma. Intenta nuevamente." };
  }
}
