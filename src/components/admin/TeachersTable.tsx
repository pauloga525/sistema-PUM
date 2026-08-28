"use client";

import { useActionState, useEffect, useState } from "react";
import {
  resetTeacherPasswordAction,
  deleteTeacherAction,
  type ResetPasswordState,
  type DeleteTeacherState,
} from "@/app/(admin)/admin/teachers/actions";

interface Teacher {
  id:                  string;
  name:                string | null;
  email:               string;
  cedula:              string | null;
  forcePasswordChange: boolean;
  createdAt:           string | Date;
  _count:              { assignments: number };
}

interface Props {
  teachers: Teacher[];
}

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

type ModalKind = "reset" | "delete";
interface ModalState { kind: ModalKind; id: string; name: string | null }

export function TeachersTable({ teachers }: Props) {
  const [modal, setModal] = useState<ModalState | null>(null);

  const [resetState, resetAction, isResetPending] = useActionState<ResetPasswordState, FormData>(
    resetTeacherPasswordAction, null
  );
  const [deleteState, deleteAction, isDeletePending] = useActionState<DeleteTeacherState, FormData>(
    deleteTeacherAction, null
  );

  useEffect(() => { if (resetState?.ok)  setModal(null); }, [resetState]);
  useEffect(() => { if (deleteState?.ok) setModal(null); }, [deleteState]);

  const openModal = (kind: ModalKind, teacher: Teacher) =>
    setModal({ kind, id: teacher.id, name: teacher.name });

  return (
    <>
      {/* ── Tabla ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(195,198,210,0.70)",
          boxShadow: "0 2px 12px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
        }}
      >
        <div
          className="px-5 py-4 border-b border-pum-border/50"
          style={{ background: "rgba(0,39,83,0.03)" }}
        >
          <p className="text-sm font-semibold text-pum-text">
            {teachers.length} {teachers.length === 1 ? "docente en esta página" : "docentes en esta página"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,39,83,0.08)" }}>
                {["Docente", "Cédula", "Asignaciones", "Registrado", "Estado", "Acciones"].map((col) => (
                  <th
                    key={col}
                    className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pum-text-muted"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher, i) => (
                <tr
                  key={teacher.id}
                  style={{
                    background:   i % 2 !== 0 ? "rgba(0,39,83,0.015)" : "transparent",
                    borderBottom: "1px solid rgba(0,39,83,0.04)",
                  }}
                >
                  {/* Docente */}
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-pum-text">
                      {teacher.name ?? <span className="italic text-pum-text-muted">Sin nombre</span>}
                    </p>
                    <p className="text-[11px] text-pum-text-disabled">{teacher.email}</p>
                  </td>

                  {/* Cédula */}
                  <td className="px-5 py-3 text-sm text-pum-text font-mono">
                    {teacher.cedula ?? <span className="text-pum-text-disabled italic">—</span>}
                  </td>

                  {/* Asignaciones */}
                  <td className="px-5 py-3">
                    <span
                      className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: "rgba(0,39,83,0.07)", color: "#002753" }}
                    >
                      {teacher._count.assignments}
                    </span>
                  </td>

                  {/* Registrado */}
                  <td className="px-5 py-3 text-xs text-pum-text-muted font-mono whitespace-nowrap">
                    {fmtDate(teacher.createdAt)}
                  </td>

                  {/* Estado */}
                  <td className="px-5 py-3">
                    {teacher.forcePasswordChange ? (
                      <span
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: "#fff3cd", color: "#664d03" }}
                        title="El docente debe cambiar su contraseña al iniciar sesión"
                      >
                        Primer acceso
                      </span>
                    ) : (
                      <span
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: "#e0f5ee", color: "#0d8a5e" }}
                      >
                        Activo
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {/* Resetear contraseña */}
                      <button
                        type="button"
                        onClick={() => openModal("reset", teacher)}
                        className="text-xs font-medium text-pum-text-muted hover:text-pum-text transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Contraseña
                      </button>

                      {/* Separador */}
                      <span className="text-pum-border" aria-hidden="true">|</span>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => openModal("delete", teacher)}
                        className="text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                        style={{ color: "#ba1a1a" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal resetear contraseña ── */}
      {modal?.kind === "reset" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.40)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.97)",
              border: "1px solid rgba(195,198,210,0.80)",
              boxShadow: "0 16px 48px rgba(0,39,83,0.20)",
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#fff3cd" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#664d03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h3 className="text-base font-semibold text-pum-text text-center mb-1">
              Resetear contraseña
            </h3>
            <p className="text-sm text-pum-text-muted text-center mb-5">
              La contraseña de{" "}
              <span className="font-semibold text-pum-text">{modal.name ?? "este docente"}</span>{" "}
              se restablecerá a su número de cédula. El docente deberá cambiarla al iniciar sesión.
            </p>

            {resetState?.error && (
              <p className="text-xs font-medium rounded-lg px-3 py-2 mb-3 text-center" style={{ background: "#ffdad6", color: "#ba1a1a" }}>
                {resetState.error}
              </p>
            )}

            <form action={resetAction} className="flex gap-3">
              <input type="hidden" name="teacherId" value={modal.id} />
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={isResetPending}
                className="flex-1 text-sm font-medium text-pum-text-muted border border-pum-border rounded-xl py-2 cursor-pointer hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isResetPending}
                className="flex-1 text-sm font-semibold text-white rounded-xl py-2 cursor-pointer disabled:opacity-60"
                style={{ background: "#002753" }}
              >
                {isResetPending ? "Reseteando…" : "Confirmar"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal eliminar docente ── */}
      {modal?.kind === "delete" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.40)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.97)",
              border: "1px solid rgba(195,198,210,0.80)",
              boxShadow: "0 16px 48px rgba(0,39,83,0.20)",
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#fdecea" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ba1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>

            <h3 className="text-base font-semibold text-pum-text text-center mb-1">
              Eliminar docente
            </h3>
            <p className="text-sm text-pum-text-muted text-center mb-1">
              ¿Estás seguro de que deseas eliminar a{" "}
              <span className="font-semibold text-pum-text">{modal.name ?? "este docente"}</span>?
            </p>
            <p className="text-xs text-center mb-5" style={{ color: "#ba1a1a" }}>
              Esta acción eliminará también todas sus asignaciones y planificaciones. No se puede deshacer.
            </p>

            {deleteState?.error && (
              <p className="text-xs font-medium rounded-lg px-3 py-2 mb-3 text-center" style={{ background: "#ffdad6", color: "#ba1a1a" }}>
                {deleteState.error}
              </p>
            )}

            <form action={deleteAction} className="flex gap-3">
              <input type="hidden" name="teacherId" value={modal.id} />
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={isDeletePending}
                className="flex-1 text-sm font-medium text-pum-text-muted border border-pum-border rounded-xl py-2 cursor-pointer hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isDeletePending}
                className="flex-1 text-sm font-semibold text-white rounded-xl py-2 cursor-pointer disabled:opacity-60"
                style={{ background: "#ba1a1a" }}
              >
                {isDeletePending ? "Eliminando…" : "Eliminar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
