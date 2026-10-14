import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { NotificationsLoader } from "@/components/notifications/NotificationsLoader";
import { notificationsService } from "@/modules/notifications/notifications.service";
import { ROUTES } from "@/constants/routes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coordinador — PUM Web",
};

export default async function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);
  if (session.user?.role !== "COORDINATOR") redirect(ROUTES.LOGIN);

  return (
    <AppShell
      role="COORDINATOR"
      user={session.user}
      afterMain={!session.user.forcePasswordChange && (
        <Suspense fallback={null}>
          <NotificationsLoader load={() => notificationsService.getCoordinatorNotifications(session.user.id)} />
        </Suspense>
      )}
    >
      {children}
    </AppShell>
  );
}
