"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveErrorAction, reopenErrorAction } from "@/app/(superadmin)/superadmin/errors/actions";

interface ErrorResolveActionProps {
  errorId:  string;
  resolved: boolean;
}

export function ErrorResolveAction({ errorId, resolved }: ErrorResolveActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote]   = useState("");
  const [msg,  setMsg]    = useState<{ ok: boolean; text: string } | null>(null);

  function handleResolve() {
    startTransition(async () => {
      const res = await resolveErrorAction(errorId, note);
      if (res.success) {
        setMsg({ ok: true, text: "Error marcado como resuelto." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "No se pudo resolver." });
      }
    });
  }

  function handleReopen() {
    startTransition(async () => {
      const res = await reopenErrorAction(errorId);
      if (res.success) {
        setMsg({ ok: true, text: "Error reabierto." });
        setNote("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "No se pudo reabrir." });
      }
    });
  }

  return (
    <div className="rounded-xl border border-pum-border bg-white p-5">
      <h3 className="text-sm font-semibold text-pum-text mb-4">
        {resolved ? "Estado: Resuelto" : "Resolver error"}
      </h3>

      {!resolved ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-pum-text-muted mb-1">Nota de resolución (opcional)</label>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); setMsg(null); }}
              rows={3}
              placeholder="Descripción de la causa y solución aplicada…"
              className="w-full border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text placeholder-pum-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
              disabled={isPending}
            />
          </div>
          {msg && (
            <p className="text-xs font-medium" style={{ color: msg.ok ? "#166534" : "#991b1b" }}>
              {msg.text}
            </p>
          )}
          <button
            onClick={handleResolve}
            disabled={isPending}
            className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ background: "#166534" }}
          >
            {isPending ? "Guardando…" : "Marcar como resuelto"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-pum-text-muted">
            Este error está marcado como resuelto. Puedes reabrirlo si el problema persiste.
          </p>
          {msg && (
            <p className="text-xs font-medium" style={{ color: msg.ok ? "#166534" : "#991b1b" }}>
              {msg.text}
            </p>
          )}
          <button
            onClick={handleReopen}
            disabled={isPending}
            className="w-full py-2 rounded-lg text-sm font-medium border border-pum-border text-pum-text hover:bg-pum-bg/50 transition-colors disabled:opacity-40"
          >
            {isPending ? "Procesando…" : "Reabrir error"}
          </button>
        </div>
      )}
    </div>
  );
}
