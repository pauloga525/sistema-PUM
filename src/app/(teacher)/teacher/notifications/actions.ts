"use server";

import { requireActiveSession } from "@/lib/auth/session";
import { notificationsService, type PumNotification } from "@/modules/notifications/notifications.service";

export async function getTeacherNotificationsAction(): Promise<PumNotification[]> {
  const session = await requireActiveSession();
  if (!session || session.user.role !== "TEACHER") return [];
  return notificationsService.getTeacherNotifications(session.user.id);
}
