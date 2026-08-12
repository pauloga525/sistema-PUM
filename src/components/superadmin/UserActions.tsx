"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changeRoleAction,
  deactivateUserAction,
  reactivateUserAction,
  resetPasswordAction,
  updateUserAction,
} from "@/app/(superadmin)/superadmin/users/actions";

const ROLE_OPTIONS = [
  { value: "TEACHER",    label: "Docente" },
  { value: "COORDINATOR",label: "Coordinador de Área" },
  { value: "ADMIN",      label: "Administrador (Vicerrector)" },
  { value: "SUPERADMIN", label: "Super Administrador" },
];

const INPUT_STYLE: React.CSSProperties = {
  background:   "rgba(243,244,245,0.90)",
  border:       "1px solid rgba(0,39,83,0.14)",
  borderRadius: "0.5rem",
  color:        "#191c1d",
  width:        "100%",
  fontSize:     "0.875rem",
  padding:      "0.5rem 0.75rem",
  outline:      "none",
};

interface UserActionsProps {
  userId:      string;
  currentRole: string;
  isActive:    boolean;
  hasCedula:   boolean;
  isSelf:      boolean;
  // Valores actuales para prellenar el formulario de edición
  currentName:   string | null;
  currentEmail:  string;
  currentCedula: string | null;
}

interface Message { type: "success" | "error"; text: string }

export function UserActions({
  userId, currentRole, isActive, hasCedula, isSelf,
  currentName, currentEmail, currentCedula,
}: UserActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [msg, setMsg] = useState<Message | null>(null);

  // Estado del formulario de edición
  const [editName,   setEditName]   = useState(currentName   ?? "");
  const [editEmail,  setEditEmail]  = useState(currentEmail);
  const [editCedula, setEditCedula] = useState(currentCedula ?? "");

  const flash = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 6000);
  };

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => { await fn(); });
  };

  const handleEditSave = () => {
    run(async () => {
      const r = await updateUserAction(userId, {
        name:   editName.trim()   || undefined,
        email:  editEmail.trim()  || undefined,
        cedula: editCedula.trim() || undefined,
      });
      if (r.success) { flash("success", "Datos actualizados correctamente"); router.refresh(); }
      else flash("error", r.error);
    });
  };

  const handleChangeRole = () => {
    if (selectedRole === currentRole) return;
    run(async () => {
      const r = await changeRoleAction(userId, selectedRole);
      if (r.success) { flash("success", "Rol actualizado correctamente"); router.refresh(); }
      else flash("error", r.error);
    });
  };

  const handleToggleStatus = () => {
    run(async () => {
      const r = isActive ? await deactivateUserAction(userId) : await reactivateUserAction(userId);
      if (r.success) { flash("success", isActive ? "Usuario desactivado" : "Usuario reactivado"); router.refresh(); }
      else flash("error", r.error);
    });
  };

  const handleResetPassword = () => {
    run(async () => {
      const r = await resetPasswordAction(userId);
      if (r.success) flash("success", "Contraseña restablecida. La nueva contraseña es la cédula del usuario.");
      else flash("error", r.error);
    });
  };

  const editDirty =
    editName.trim()   !== (currentName   ?? "") ||
    editEmail.trim()  !== currentEmail           ||
    editCedula.trim() !== (currentCedula ?? "");

  return (
    <div className="space-y-4">
      {msg && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: msg.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: msg.type === "success" ? "#166534" : "#991b1b",
            border: `1px solid ${msg.type === "success" ? "rgba(22,101,52,0.2)" : "rgba(153,27,27,0.2)"}`,
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Editar datos personales */}
      <div className="rounded-xl border border-pum-border p-4 bg-white">
        <p className="text-sm font-semibold text-pum-text mb-3">Editar datos</p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-pum-text-muted">Nombre completo</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={isPending}
              placeholder="Nombre completo"
              style={INPUT_STYLE}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-pum-text-muted">Correo electrónico</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              disabled={isPending}
              placeholder="correo@institución.edu.ec"
              style={INPUT_STYLE}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-pum-text-muted">Cédula</label>
            <input
              type="text"
              value={editCedula}
              onChange={(e) => setEditCedula(e.target.value.replace(/\D/g, "").slice(0, 10))}
              disabled={isPending}
              placeholder="0000000000"
              maxLength={10}
              style={{ ...INPUT_STYLE, fontFamily: "monospace" }}
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={handleEditSave}
              disabled={isPending || !editDirty}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition-opacity cursor-pointer"
              style={{ background: "#4c1d95" }}
            >
              {isPending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>

      {/* Cambiar rol */}
      <div className="rounded-xl border border-pum-border p-4 bg-white">
        <p className="text-sm font-semibold text-pum-text mb-3">Cambiar rol</p>
        {isSelf ? (
          <p className="text-xs text-pum-text-muted">No puedes modificar tu propio rol.</p>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={isPending}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-pum-border bg-white focus:outline-none"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={handleChangeRole}
              disabled={isPending || selectedRole === currentRole}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition-opacity cursor-pointer"
              style={{ background: "#4c1d95" }}
            >
              Guardar
            </button>
          </div>
        )}
      </div>

      {/* Estado de la cuenta */}
      <div className="rounded-xl border border-pum-border p-4 bg-white">
        <p className="text-sm font-semibold text-pum-text mb-1">Estado de la cuenta</p>
        <p className="text-xs text-pum-text-muted mb-3">
          {isSelf
            ? "No puedes desactivar tu propia cuenta."
            : isActive
            ? "El usuario puede iniciar sesión. Desactívalo para bloquear el acceso."
            : "El usuario está bloqueado y no puede acceder al sistema."}
        </p>
        {!isSelf && (
          <button
            onClick={handleToggleStatus}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg border disabled:opacity-40 transition-colors cursor-pointer"
            style={
              isActive
                ? { background: "#fef2f2", color: "#991b1b", borderColor: "rgba(153,27,27,0.2)" }
                : { background: "#f0fdf4", color: "#166534", borderColor: "rgba(22,101,52,0.2)" }
            }
          >
            {isPending ? "Procesando..." : isActive ? "Desactivar usuario" : "Reactivar usuario"}
          </button>
        )}
      </div>

      {/* Restablecer contraseña */}
      <div className="rounded-xl border border-pum-border p-4 bg-white">
        <p className="text-sm font-semibold text-pum-text mb-1">Restablecer contraseña</p>
        <p className="text-xs text-pum-text-muted mb-3">
          {hasCedula
            ? "La contraseña se restablecerá a la cédula del usuario y deberá cambiarla al iniciar sesión."
            : "Este usuario no tiene cédula registrada. No es posible restablecer la contraseña."}
        </p>
        <button
          onClick={handleResetPassword}
          disabled={isPending || !hasCedula}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition-opacity cursor-pointer"
          style={{ background: "#b45309" }}
        >
          {isPending ? "Procesando..." : "Restablecer contraseña"}
        </button>
      </div>
    </div>
  );
}
