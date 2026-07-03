"use client";

import { useState, useActionState } from "react";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "@/app/(teacher)/teacher/change-password/actions";

function getStrength(pw: string): { level: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: "", color: "" };
  if (pw.length < 8)   return { level: 1, label: "Muy corta", color: "#ba1a1a" };
  let score = 0;
  if (/[a-z]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  if (score <= 2) return { level: 2, label: "Débil",    color: "#d97706" };
  if (score <= 3) return { level: 3, label: "Moderada", color: "#2563eb" };
  return { level: 4, label: "Fuerte", color: "#16a34a" };
}

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    null
  );
  const [password, setPassword] = useState("");

  const strength = getStrength(password);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Nueva contraseña */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-xs font-semibold text-pum-text-muted uppercase tracking-wide">
          Nueva contraseña
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="pum-glass-input w-full px-3.5 py-2.5 text-sm text-pum-text placeholder:text-pum-text-disabled"
        />

        {/* Indicador de fortaleza */}
        {password.length > 0 && (
          <div className="flex flex-col gap-1 mt-0.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((segment) => (
                <div
                  key={segment}
                  className="h-1 flex-1 rounded-full transition-colors duration-200"
                  style={{
                    background: strength.level >= segment ? strength.color : "rgba(0,39,83,0.10)",
                  }}
                />
              ))}
            </div>
            <p className="text-[11px] font-medium" style={{ color: strength.color }}>
              {strength.label}
            </p>
          </div>
        )}
      </div>

      {/* Confirmar contraseña */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-xs font-semibold text-pum-text-muted uppercase tracking-wide">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          className="pum-glass-input w-full px-3.5 py-2.5 text-sm text-pum-text placeholder:text-pum-text-disabled"
        />
      </div>

      {/* Error */}
      {state?.error && (
        <div
          role="alert"
          className="w-full rounded-xl px-4 py-3 flex gap-2 items-start"
          style={{ background: "#fdecea", border: "1px solid rgba(198,40,40,0.20)" }}
        >
          <span className="text-pum-error mt-0.5 flex-shrink-0 text-sm" aria-hidden="true">⚠</span>
          <p className="text-sm text-pum-error">{state.error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="pum-navy-btn w-full py-2.5 text-white text-sm font-semibold rounded-xl cursor-pointer disabled:opacity-60 mt-1"
      >
        {isPending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
