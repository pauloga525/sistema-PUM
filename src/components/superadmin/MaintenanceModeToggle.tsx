"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleMaintenanceModeAction } from "@/app/(superadmin)/superadmin/settings/actions";

interface MaintenanceModeToggleProps {
  initialEnabled: boolean;
  initialMessage: string | null;
  enabledAt: string | null;
}

export function MaintenanceModeToggle({ initialEnabled, initialMessage, enabledAt }: MaintenanceModeToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [enabled, setEnabled]         = useState(initialEnabled);
  const [message, setMessage]         = useState(initialMessage ?? "");
  const [confirming, setConfirming]   = useState(false);
  const [resultMsg, setResultMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  function handleToggle() {
    const nextEnabled = !enabled;
    startTransition(async () => {
      const res = await toggleMaintenanceModeAction(nextEnabled, nextEnabled ? (message.trim() || null) : null);
      if (res.success) {
        setEnabled(nextEnabled);
        setConfirming(false);
        setResultMsg({
          ok: true,
          text: nextEnabled
            ? "Sistema deshabilitado para Docentes y Coordinadores."
            : "Sistema habilitado nuevamente para todos.",
        });
        router.refresh();
      } else {
        setResultMsg({ ok: false, text: res.error ?? "Error al actualizar el modo mantenimiento" });
      }
      setTimeout(() => setResultMsg(null), 6000);
    });
  }

  return (
    <div className="rounded-xl border border-pum-border bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: enabled ? "#dc2626" : "#16a34a" }}
        />
        <h3 className="text-sm font-semibold text-pum-text">
          {enabled ? "Sistema en mantenimiento" : "Sistema activo"}
        </h3>
      </div>

      <p className="text-xs text-pum-text-muted mb-4">
        {enabled
          ? <>Docentes y Coordinadores no pueden ingresar. Administradores y SuperAdmin siguen operando con normalidad.{enabledAt && <> Desde el {new Date(enabledAt).toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}.</>}</>
          : "Todos los roles pueden ingresar con normalidad."}
      </p>

      {!enabled && (
        <div className="mb-4">
          <label className="block text-xs text-pum-text-muted mb-1">
            Mensaje para la pantalla de aviso (opcional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Ej: El sistema estará disponible nuevamente el lunes."
            className="w-full border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text placeholder-pum-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
            disabled={isPending}
          />
        </div>
      )}

      {resultMsg && (
        <p className="text-xs font-medium mb-3" style={{ color: resultMsg.ok ? "#166534" : "#991b1b" }}>
          {resultMsg.text}
        </p>
      )}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={isPending}
          className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
          style={{ background: enabled ? "#166534" : "#991b1b" }}
        >
          {enabled ? "Habilitar el sistema nuevamente" : "Deshabilitar el sistema"}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-pum-text-muted">
            {enabled
              ? "Docentes y Coordinadores podrán volver a ingresar de inmediato. ¿Confirmar?"
              : "Docentes y Coordinadores dejarán de poder ingresar de inmediato (incluso si ya tenían sesión abierta). Administradores y SuperAdmin no se ven afectados. ¿Confirmar?"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleToggle}
              disabled={isPending}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: enabled ? "#166534" : "#991b1b" }}
            >
              {isPending ? "Aplicando…" : enabled ? "Sí, habilitar" : "Sí, deshabilitar"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-pum-text border border-pum-border transition-opacity disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
