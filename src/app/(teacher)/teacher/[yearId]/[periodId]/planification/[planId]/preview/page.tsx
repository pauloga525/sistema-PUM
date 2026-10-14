import { auth } from "@/auth";
import { getLogos } from "@/lib/assets/logos";
import { redirect } from "next/navigation";
import { loadPlanPreview, canTeacherView } from "@/modules/planification/plan-preview.loader";
import { appConfig } from "@/config/app.config";
import { ROUTES } from "@/constants/routes";
import { ExportMenu } from "@/components/planification/ExportMenu";
import { BreadcrumbPUM } from "@/components/layout/BreadcrumbPUM";
import { SignatureBlock } from "@/components/planification/SignatureBlock";
import { PlanDocument } from "@/components/plan-document/PlanDocument";
import { auditService } from "@/modules/audit/audit.service";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ yearId: string; periodId: string; planId: string }>;
}) {
  const { planId } = await params;
  const plan = await loadPlanPreview(planId);
  if (!plan) return { title: "Vista previa — PUM Web" };
  return { title: `Vista previa — ${plan.subject.name} ${plan.level.code}` };
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ yearId: string; periodId: string; planId: string }>;
}) {
  const { yearId, periodId, planId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  // Misma consulta (memoizada) que generateMetadata
  const plan = await loadPlanPreview(planId);
  if (!plan || !canTeacherView(plan, session.user.id)) {
    redirect(ROUTES.TEACHER.subjects(yearId, periodId));
  }
  const { subject, level, year, period } = plan;

  const signatureBlock = plan.status === "SIGNED"
    ? await auditService.getSignatureBlock(planId)
    : null;

  // Logos institucionales — opcionales, se muestran solo si existen en /public/logos/
  const logos = getLogos();

  return (
    <div className="flex-1 flex flex-col bg-pum-bg">

      {/* ── Barra superior (no se imprime) ───────────────────────────── */}
      <div className="no-print sticky top-0 z-10 bg-pum-surface border-b border-pum-border px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <BreadcrumbPUM
          items={[
            { label: "Años lectivos", href: ROUTES.TEACHER.YEAR },
            { label: year.label, href: ROUTES.TEACHER.period(yearId) },
            { label: period.name, href: ROUTES.TEACHER.subjects(yearId, periodId) },
            { label: subject.name, href: ROUTES.TEACHER.planification(yearId, periodId, planId) },
            { label: "Vista previa" },
          ]}
        />
        <ExportMenu planId={planId} showPrint />
      </div>

      {/* ── Documento ─────────────────────────────────────────────────── */}
      <PlanDocument
        institutionName={appConfig.institutionName}
        institutionSubname={process.env.INSTITUTION_SUBNAME ?? ""}
        logos={{ left: logos.left, right: logos.right }}
        plan={{
          subjectName:  subject.name,
          levelName:    level.name,
          levelTrack:   level.track,
          yearLabel:    year.label,
          teacherNames: plan.teachers.length > 0
            ? plan.teachers.map((t) => t.name ?? "Docente").join(", ")
            : (session.user?.name ?? "—"),
          metadata:     plan.metadata,
          rows:         plan.rows,
        }}
      >
        {/* Estado */}
        {plan.status === "FINALIZED" && plan.finalizedAt && (
          <p className="text-right mt-3" style={{ fontSize: "0.6rem", color: "#94a3b8" }}>
            Finalizado el{" "}
            {plan.finalizedAt.toLocaleDateString("es-EC", {
              day: "2-digit", month: "long", year: "numeric",
            })}
          </p>
        )}

        {/* Membrete de firmas */}
        {signatureBlock && <SignatureBlock data={signatureBlock} />}
      </PlanDocument>

      {/* ── Volver (no se imprime) ───────────────────────────────────── */}
      <div className="no-print flex justify-center pb-6">
        <Link
          href={ROUTES.TEACHER.tabla(yearId, periodId, planId)}
          className="text-sm text-pum-primary hover:underline underline-offset-2"
        >
          ← Volver al editor
        </Link>
      </div>
    </div>
  );
}
