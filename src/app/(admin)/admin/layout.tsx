import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/constants/levels";
import { AppShell } from "@/components/layout/AppShell";
import { ROUTES } from "@/constants/routes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — PUM Web",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) redirect(ROUTES.LOGIN);

  return (
    <AppShell role="ADMIN" user={session.user}>
      {children}
    </AppShell>
  );
}
