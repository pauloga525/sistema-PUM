"use server";

import { requireActiveSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import { ROUTES } from "@/constants/routes";

export async function sendForSignatureAction(
  planId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireActiveSession();
  if (!session || session.user.role !== "COORDINATOR") redirect(ROUTES.LOGIN);
  try {
    const sent = await coordinatorService.sendForSignature(planId, session.user.id);
    revalidatePath("/coordinator/retroalimentacion");
    if (!sent) return { success: false, error: "El PUM ya no se puede enviar para firma. Recarga la página." };
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo enviar para firma. Intenta nuevamente." };
  }
}
