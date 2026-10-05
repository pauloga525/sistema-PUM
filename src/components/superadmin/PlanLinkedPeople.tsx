"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeTeacherLinkAction, setPlanEditorAction } from "@/app/(superadmin)/superadmin/plans/actions";
import type { LinkedPerson, LinkedPersonRole } from "@/modules/superadmin/superadmin-plan.service";

const ROLE_BADGE: Record<LinkedPersonRole, { label: string; bg: string; color: string }> = {
  EDITOR:                { label: "Editor",               bg: "#dbeafe", color: "#1e40af" },
  VISUALIZA:              { label: "Visualiza",            bg: "#f3f4f6", color: "#374151" },
  COORDINADOR_ASIGNADO:   { label: "Coordinador asignado",  bg: "#f3e8ff", color: "#6b21a8" },
};

interface PlanLinkedPeopleProps {
  planId:  string;
  people:  LinkedPerson[];
}

export function PlanLinkedPeople({ planId, people }: PlanLinkedPeopleProps) {
  return (
    <div className="rounded-xl border border-pum-border bg-white p-5">
      <h3 className="text-sm font-semibold text-pum-text mb-1">Personas vinculadas al PUM</h3>
      <p className="text-xs text-pum-text-muted mb-4">
        Así aparecerán los nombres en la planificación. Un vínculo marcado como huérfano
        significa que esa persona ya no tiene esa materia/nivel asignada actualmente.
      </p>

      {people.length === 0 ? (
        <p className="text-sm text-pum-text-muted italic">Nadie vinculado a este PUM.</p>
      ) : (
        <div className="space-y-2">
          {people.map((person) => (
            <PersonRow key={person.userId} planId={planId} person={person} />
          ))}
        </div>
      )}
    </div>
  );
}

function PersonRow({ planId, person }: { planId: string; person: LinkedPerson }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmingAction, setConfirmingAction] = useState<"remove" | "makeEditor" | null>(null);
  const [resultMsg, setResultMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  const isEditor      = person.roles.includes("EDITOR");
  const isTeacherLink = person.roles.includes("EDITOR") || person.roles.includes("VISUALIZA");
  const canMakeEditor  = isTeacherLink && !isEditor;

  function handleRemove() {
    startTransition(async () => {
      const res = await removeTeacherLinkAction(planId, person.userId);
      if (res.success) {
        router.refresh();
      } else {
        setConfirmingAction(null);
        setResultMsg({ ok: false, text: res.error ?? "Error al quitar el vínculo" });
        setTimeout(() => setResultMsg(null), 6000);
      }
    });
  }

  function handleMakeEditor() {
    startTransition(async () => {
      const res = await setPlanEditorAction(planId, person.userId);
      if (res.success) {
        router.refresh();
      } else {
        setConfirmingAction(null);
        setResultMsg({ ok: false, text: res.error ?? "Error al designar al editor" });
        setTimeout(() => setResultMsg(null), 6000);
      }
    });
  }

  return (
    <div className="rounded-lg border border-pum-border/70 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <p className="text-sm font-medium text-pum-text truncate">{person.name ?? person.email}</p>
            {person.roles.map((role) => (
              <span
                key={role}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: ROLE_BADGE[role].bg, color: ROLE_BADGE[role].color }}
              >
                {ROLE_BADGE[role].label}
              </span>
            ))}
            {!person.hasActiveAssignment && (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: "#fee2e2", color: "#991b1b" }}
                title="Esta persona ya no tiene asignación activa para esta materia/nivel/año"
              >
                Sin asignación activa
              </span>
            )}
          </div>
          <p className="text-xs text-pum-text-muted truncate">{person.email}</p>
        </div>

        {!confirmingAction && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {canMakeEditor && (
              <button
                onClick={() => setConfirmingAction("makeEditor")}
                disabled={isPending}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-opacity disabled:opacity-40"
                style={{ borderColor: "#1e40af", color: "#1e40af" }}
              >
                Hacer editor
              </button>
            )}
            {person.removable && (
              <button
                onClick={() => setConfirmingAction("remove")}
                disabled={isPending}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-opacity disabled:opacity-40"
                style={{ borderColor: "#991b1b", color: "#991b1b" }}
              >
                Quitar vínculo
              </button>
            )}
          </div>
        )}
      </div>

      {confirmingAction === "remove" && (
        <div className="mt-2 pt-2 border-t border-pum-border/60 space-y-2">
          <p className="text-xs text-pum-text-muted">
            Esto quita a {person.name ?? person.email} de la lista de docentes de este PUM
            {isEditor ? " (era el editor)" : ""}. No se puede deshacer desde aquí. ¿Confirmar?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRemove}
              disabled={isPending}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ background: "#991b1b" }}
            >
              {isPending ? "Quitando…" : "Sí, quitar vínculo"}
            </button>
            <button
              onClick={() => setConfirmingAction(null)}
              disabled={isPending}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium text-pum-text border border-pum-border transition-opacity disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {confirmingAction === "makeEditor" && (
        <div className="mt-2 pt-2 border-t border-pum-border/60 space-y-2">
          <p className="text-xs text-pum-text-muted">
            {person.name ?? person.email} pasará a ser el <strong>Editor</strong> de este PUM (podrá escribirlo)
            y los demás docentes vinculados quedarán como Visualiza. ¿Confirmar?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleMakeEditor}
              disabled={isPending}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ background: "#1e40af" }}
            >
              {isPending ? "Aplicando…" : "Sí, hacer editor"}
            </button>
            <button
              onClick={() => setConfirmingAction(null)}
              disabled={isPending}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium text-pum-text border border-pum-border transition-opacity disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {resultMsg && (
        <p className="text-xs font-medium mt-2" style={{ color: resultMsg.ok ? "#166534" : "#991b1b" }}>
          {resultMsg.text}
        </p>
      )}
    </div>
  );
}
