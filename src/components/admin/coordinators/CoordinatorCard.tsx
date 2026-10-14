"use client";

import { useState, useTransition } from "react";
import {
  removeCoordinatorAssignmentAction,
  deleteCoordinatorAction,
  resetCoordinatorPasswordAction,
} from "@/app/(admin)/admin/coordinators/actions";
import { TempPasswordNotice } from "@/components/shared/TempPasswordNotice";
import { Dialog } from "@/components/ui/Dialog";
import { AddTeacherPanel } from "./AddTeacherPanel";
import { AssignSubjectsPanel } from "./AssignSubjectsPanel";
import { ProgressBar } from "./ProgressBar";
import type { CoordinatorEntry, SubjectOption, TeacherOption } from "./types";

/** Tarjeta de un coordinador: datos, progreso, acciones y docentes a cargo. */
export function CoordinatorCard({ entry, teachers, subjects }: { entry: CoordinatorEntry; teachers: TeacherOption[]; subjects: SubjectOption[] }) {
  const [expanded,      setExpanded]      = useState(false);
  const [isPending,     start]            = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [resetMsg,      setResetMsg]      = useState<{ ok: boolean; text: string; tempPassword?: string } | null>(null);

  const handleRemove = (assignmentId: string) => {
    start(async () => { await removeCoordinatorAssignmentAction(assignmentId); });
  };

  const handleDelete = () => {
    start(async () => {
      await deleteCoordinatorAction(entry.id);
      setDeleteConfirm(false);
    });
  };

  const handleResetPassword = () => {
    start(async () => {
      const res = await resetCoordinatorPasswordAction(entry.id);
      if (res.ok) {
        // Sin auto-ocultar: la contraseña temporal solo se muestra esta vez
        setResetMsg({ ok: true, text: "Contraseña restablecida.", tempPassword: res.tempPassword });
      } else {
        setResetMsg({ ok: false, text: res.error ?? "Error al restablecer" });
        setTimeout(() => setResetMsg(null), 5000);
      }
    });
  };

  const assignedIds = new Set(entry.teachers.map((t) => t.teacherId));
  const allApproved = entry.progress.total > 0 && entry.progress.approved === entry.progress.total;

  return (
    <div
      className="overflow-hidden"
      style={{
        background:           "rgba(255,255,255,0.88)",
        backdropFilter:       "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border:               "1px solid rgba(224,230,240,0.85)",
        borderRadius:         "1rem",
        boxShadow:            "0 2px 10px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      {/* Cabecera */}
      <div
        className="flex items-center gap-4 px-5 py-4"
        style={{ background: "rgba(0,39,83,0.025)", borderBottom: "1px solid rgba(0,39,83,0.07)" }}
      >
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" }}
        >
          {entry.name?.[0]?.toUpperCase() ?? "C"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-pum-text text-sm">{entry.name ?? "Sin nombre"}</p>
            {entry.coordinatorArea && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(29,78,216,0.10)", color: "#1d4ed8" }}
              >
                {entry.coordinatorArea}
              </span>
            )}
          </div>
          <p className="text-xs text-pum-text-muted">{entry.email}</p>
          {entry.cedula && <p className="text-[11px] text-pum-text-disabled">CI: {entry.cedula}</p>}
        </div>

        {/* Progreso */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <ProgressBar done={entry.progress.approved} total={entry.progress.total} />
          {allApproved && entry.progress.total > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#dcfce7", color: "#166534" }}>
              ✓ Completo
            </span>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <AssignSubjectsPanel
            coordinatorId={entry.id}
            subjects={subjects}
            initialSelectedIds={entry.assignedSubjectIds}
          />
          <AddTeacherPanel
            coordinatorId={entry.id}
            teachers={teachers}
            assignedTeacherIds={assignedIds}
          />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            style={{ background: "rgba(0,39,83,0.05)", color: "#002753" }}
          >
            {expanded ? "Ocultar" : `Docentes (${entry.teachers.length})`}
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={isPending}
            title="Generar una contraseña temporal nueva"
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg cursor-pointer transition-colors disabled:opacity-40"
            style={{ background: "rgba(180,83,9,0.08)", color: "#b45309" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            Reset contraseña
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            disabled={isPending}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-pum-text-disabled hover:text-pum-error hover:bg-red-50 cursor-pointer transition-colors"
            title="Eliminar coordinador"
            aria-label="Eliminar coordinador"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Contraseña temporal generada por el reset */}
      {resetMsg?.ok && resetMsg.tempPassword && (
        <div className="px-5 py-3 flex flex-col gap-2" style={{ borderBottom: "1px solid rgba(0,39,83,0.06)" }}>
          <TempPasswordNotice password={resetMsg.tempPassword} title={resetMsg.text} />
          <button
            type="button"
            onClick={() => setResetMsg(null)}
            className="self-end text-xs font-medium text-pum-text-muted hover:text-pum-text cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Mensaje de feedback del reset */}
      {resetMsg && !resetMsg.tempPassword && (
        <div
          className="px-5 py-2 text-xs font-medium"
          style={{
            background: resetMsg.ok ? "#f0fdf4" : "#fef2f2",
            color:      resetMsg.ok ? "#166534" : "#991b1b",
            borderBottom: "1px solid rgba(0,39,83,0.06)",
          }}
        >
          {resetMsg.text}
        </div>
      )}

      {/* Docentes expandibles */}
      {expanded && (
        <div className="px-5 py-3">
          {entry.teachers.length === 0 ? (
            <p className="text-xs text-pum-text-muted py-2">Sin docentes asignados aún.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {entry.teachers.map((t) => (
                <div
                  key={t.assignmentId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                  style={{ background: "rgba(0,39,83,0.06)", color: "#002753" }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                    style={{ background: "rgba(0,39,83,0.35)" }}
                  >
                    {t.teacherName?.[0]?.toUpperCase() ?? "D"}
                  </div>
                  <span className="font-medium">{t.teacherName ?? t.teacherEmail}</span>
                  {t.subjectCount > 0 && (
                    <span className="text-pum-text-disabled text-[10px]">({t.subjectCount} asig.)</span>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemove(t.assignmentId)}
                    title="Quitar docente"
                    aria-label={`Quitar a ${t.teacherName ?? t.teacherEmail}`}
                    className="ml-0.5 text-pum-text-disabled hover:text-pum-error cursor-pointer disabled:opacity-40"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmar eliminación */}
      <Dialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Eliminar coordinador"
        size="sm"
        dismissible={!isPending}
        description={
          <>
            ¿Eliminar a <strong>{entry.name ?? entry.email}</strong>? Se desactivará la cuenta; sus revisiones se conservan y un SuperAdmin puede reactivarla.
            Se perderán todas sus asignaciones y revisiones.
          </>
        }
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteConfirm(false)}
            className="text-sm text-pum-text-muted hover:text-pum-text cursor-pointer px-3 py-1.5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-sm font-semibold text-white px-4 py-1.5 rounded-xl cursor-pointer disabled:opacity-50"
            style={{ background: "#ba1a1a" }}
          >
            {isPending ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
