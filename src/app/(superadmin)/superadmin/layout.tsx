import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/constants/levels";
import { AppShell } from "@/components/layout/AppShell";
import { ROUTES } from "@/constants/routes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SuperAdmin — PUM Web",
};

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role, "SUPERADMIN")) redirect(ROUTES.LOGIN);

  return (
    <AppShell
      role="SUPERADMIN"
      user={session.user}
      // Reactiva el indicador de Next.js solo para superadmin
      prepend={<style>{`nextjs-portal { display: block !important; }`}</style>}
    >
      {children}
    </AppShell>
  );
}
