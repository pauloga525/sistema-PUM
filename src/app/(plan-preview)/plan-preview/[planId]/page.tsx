import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { adminService } from "@/modules/admin/admin.service";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import { appConfig } from "@/config/app.config";
import { ReviewClient } from "@/components/coordinator/ReviewClient";
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
  return { title: "Vista previa PUM — Sistema" };
}

export default async function PlanPreviewPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  // Auth is handled by the (plan-preview) layout — only ADMIN+ can reach this page.
  // No status restriction: superadmin can inspect any plan regardless of workflow state.
  const [planData, review] = await Promise.all([
    adminService.getPlanForAdmin(planId),
    coordinatorService.getReviewForTeacher(planId),
  ]);
  if (!planData) notFound();

  const publicDir = path.join(process.cwd(), "public");
  const hasLogoLeft  = fs.existsSync(path.join(publicDir, "logos", "logo-left.png"));
  const hasLogoRight = fs.existsSync(path.join(publicDir, "logos", "logo-right.png"));

  const isSigned = planData.status === "SIGNED";
  const signatureBlock = isSigned
    ? await auditService.getSignatureBlock(planId)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-pum-bg">
      {/* Minimal sticky bar: breadcrumb + export buttons */}
      <div className="sticky top-0 z-30 bg-pum-surface border-b border-pum-border px-6 py-3 flex items-center gap-3 flex-wrap print:hidden">
        <Link
          href={ROUTES.SUPERADMIN.PLANS}
          className="text-sm text-pum-text-muted hover:text-pum-primary transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          PUM del Sistema
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

      {/* Read-only preview — no sign/reject controls */}
      <ReviewClient
        planId={planId}
        reviewId=""
        initialSectionStates={review?.sectionStates ?? {}}
        initialStatus="APPROVED"
        plan={planData}
        appConfig={{ institutionName: appConfig.institutionName }}
        logos={{ left: hasLogoLeft, right: hasLogoRight }}
        adminMode={false}
        onSignPlan={undefined}
        onRejectPlan={undefined}
        onGetAuditHistory={getAuditHistoryAction}
        signatureBlock={signatureBlock}
      />
    </div>
  );
}
