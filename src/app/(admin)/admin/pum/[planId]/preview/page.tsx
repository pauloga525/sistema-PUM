import fs from "fs";
import path from "path";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { adminService } from "@/modules/admin/admin.service";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import { appConfig } from "@/config/app.config";
import { ReviewClient } from "@/components/coordinator/ReviewClient";
import { signPlanPreviewAction, rejectPlanPreviewAction } from "./actions";
import { getAuditHistoryAction } from "@/app/(coordinator)/coordinator/[planId]/review/actions";
import { auditService } from "@/modules/audit/audit.service";
import Link from "next/link";
import { ExportMenu } from "@/components/planification/ExportMenu";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  void planId;
  return { title: "Vista previa PUM — Admin" };
}

export default async function AdminPlanPreviewPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);
  if (session.user.role !== "ADMIN") redirect(ROUTES.LOGIN);

  const [planData, review] = await Promise.all([
    adminService.getPlanForAdmin(planId),
    coordinatorService.getReviewForTeacher(planId),
  ]);
  if (!planData) notFound();

  // Only show pending signature plans (or already signed for historical view)
  if (planData.status !== "PENDING_SIGNATURE" && planData.status !== "SIGNED") notFound();

  const publicDir = path.join(process.cwd(), "public");
  const hasLogoLeft  = fs.existsSync(path.join(publicDir, "logos", "logo-left.png"));
  const hasLogoRight = fs.existsSync(path.join(publicDir, "logos", "logo-right.png"));

  const isSigned = planData.status === "SIGNED";

  const signatureBlock = isSigned
    ? await auditService.getSignatureBlock(planId)
    : null;

  // Bind planId into the server actions so they can be passed to the client component
  const boundSign   = signPlanPreviewAction.bind(null, planId);
  const boundReject = rejectPlanPreviewAction.bind(null, planId);

  return (
    <div className="flex-1 flex flex-col bg-pum-bg">
      {/* Nav bar */}
      <div className="sticky top-0 z-30 bg-pum-surface border-b border-pum-border px-6 py-3 flex items-center gap-3 flex-wrap print:hidden">
        <Link
          href={ROUTES.ADMIN.DASHBOARD}
          className="text-sm text-pum-text-muted hover:text-pum-primary transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Dashboard
        </Link>
        <span className="text-pum-text-disabled">·</span>
        <span className="text-sm font-medium text-pum-text truncate max-w-xs">
          {planData.subjectName} — {planData.levelCode}
        </span>
        <span className="text-pum-text-disabled hidden sm:inline">·</span>
        <span className="text-xs text-pum-text-muted hidden sm:inline">{planData.teacherName ?? "—"}</span>
        {isSigned && (
          <>
            <span className="text-pum-text-disabled">·</span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "#ccfbf1", color: "#0f766e" }}
            >
              Firmado y aprobado
            </span>
          </>
        )}
        <div className="ml-auto">
          <ExportMenu planId={planId} showPrint />
        </div>
      </div>

      {/* ReviewClient in admin mode — review status is "APPROVED" so controls are auto-disabled */}
      <ReviewClient
        planId={planId}
        reviewId=""
        initialSectionStates={review?.sectionStates ?? {}}
        initialStatus="APPROVED"
        plan={planData}
        appConfig={{ institutionName: appConfig.institutionName }}
        logos={{ left: hasLogoLeft, right: hasLogoRight }}
        adminMode={!isSigned}
        onSignPlan={isSigned ? undefined : boundSign}
        onRejectPlan={isSigned ? undefined : boundReject}
        onGetAuditHistory={getAuditHistoryAction}
        signatureBlock={signatureBlock}
      />
    </div>
  );
}
