import fs from "fs";
import path from "path";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import { auditService } from "@/modules/audit/audit.service";
import { ExportMenu } from "@/components/planification/ExportMenu";
import { appConfig } from "@/config/app.config";
import { ReviewClient } from "@/components/coordinator/ReviewClient";
import {
  updateSectionAction,
  sendFeedbackAction,
  approvePlanAction,
  getAuditHistoryAction,
} from "./actions";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  void planId;
  return { title: `Revisión PUM — Coordinador` };
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);
  if (session.user.role !== "COORDINATOR") redirect(ROUTES.LOGIN);

  const [planData, review] = await Promise.all([
    coordinatorService.getPlanForReview(planId, session.user.id),
    coordinatorService.getOrCreateReview(session.user.id, planId),
  ]);

  const signatureBlock = planData?.status === "SIGNED"
    ? await auditService.getSignatureBlock(planId)
    : null;

  if (!planData) notFound();

  const publicDir = path.join(process.cwd(), "public");
  const hasLogoLeft  = fs.existsSync(path.join(publicDir, "logos", "logo-left.png"));
  const hasLogoRight = fs.existsSync(path.join(publicDir, "logos", "logo-right.png"));

  return (
    <div className="flex-1 flex flex-col bg-pum-bg">
      {/* Barra de navegación superior */}
      <div className="sticky top-0 z-30 bg-pum-surface border-b border-pum-border px-6 py-3 flex items-center gap-3 flex-wrap print:hidden">
        <Link
          href={ROUTES.COORDINATOR.RETROALIMENTACION}
          className="text-sm text-pum-text-muted hover:text-pum-primary transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Retroalimentación
        </Link>
        <span className="text-pum-text-disabled">·</span>
        <span className="text-sm font-medium text-pum-text truncate max-w-xs">
          {planData.subjectName} — {planData.levelCode}
        </span>
        <span className="text-pum-text-disabled hidden sm:inline">·</span>
        <span className="text-xs text-pum-text-muted hidden sm:inline">{planData.teacherName ?? "—"}</span>
        <div className="ml-auto">
          <ExportMenu planId={planId} showPrint />
        </div>
      </div>

      {/* Componente cliente de revisión */}
      <ReviewClient
        planId={planId}
        reviewId={review.id}
        initialSectionStates={review.sectionStates}
        initialStatus={review.status}
        plan={planData}
        appConfig={{ institutionName: appConfig.institutionName }}
        logos={{ left: hasLogoLeft, right: hasLogoRight }}
        onUpdateSection={updateSectionAction}
        onSendFeedback={sendFeedbackAction}
        onApprovePlan={approvePlanAction}
        onGetAuditHistory={getAuditHistoryAction}
        signatureBlock={signatureBlock}
      />
    </div>
  );
}
