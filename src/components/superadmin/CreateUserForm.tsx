"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { createUserAction } from "@/app/(superadmin)/superadmin/users/actions";

const ROLE_OPTIONS = [
  { value: "TEACHER",    label: "Docente" },
  { value: "COORDINATOR",label: "Coordinador de Área" },
  { value: "ADMIN",      label: "Administrador (Vicerrector)" },
  { value: "SUPERADMIN", label: "Super Administrador" },
];

const INPUT_CLASS = "w-full px-3 py-2 text-sm rounded-lg border border-pum-border bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-shadow";
const LABEL_CLASS = "block text-sm font-medium text-pum-text mb-1.5";

export function CreateUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", cedula: "", role: "TEACHER", coordinatorArea: "",
  });

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createUserAction({
        name: form.name,
        email: form.email,
        cedula: form.cedula,
        role: form.role as "TEACHER" | "COORDINATOR" | "ADMIN" | "SUPERADMIN",
        coordinatorArea: form.role === "COORDINATOR" ? (form.coordinatorArea || undefined) : undefined,
      });
      if (result.success) {
        router.push(ROUTES.SUPERADMIN.USERS);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid rgba(153,27,27,0.2)" }}>
          {error}
        </div>
      )}

      <div>
        <label className={LABEL_CLASS}>Nombre completo *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Ej: Juan Pérez Rodríguez"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Email institucional *</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="usuario@uets.edu.ec"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Cédula *</label>
        <input
          type="text"
          required
          maxLength={10}
          value={form.cedula}
          onChange={(e) => set("cedula", e.target.value.replace(/\D/g, ""))}
          placeholder="0000000000"
          className={INPUT_CLASS}
        />
        <p className="text-xs text-pum-text-muted mt-1">10 dígitos. Se usará como contraseña inicial.</p>
      </div>

      <div>
        <label className={LABEL_CLASS}>Rol *</label>
        <select
          value={form.role}
          onChange={(e) => set("role", e.target.value)}
          className={INPUT_CLASS}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {form.role === "COORDINATOR" && (
        <div>
          <label className={LABEL_CLASS}>Área de coordinación</label>
          <input
            type="text"
            value={form.coordinatorArea}
            onChange={(e) => set("coordinatorArea", e.target.value)}
            placeholder="Ej: Matemáticas y Ciencias Exactas"
            className={INPUT_CLASS}
          />
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity cursor-pointer"
          style={{ background: "#4c1d95" }}
        >
          {isPending ? "Creando..." : "Crear usuario"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 text-sm font-medium rounded-lg border border-pum-border text-pum-text hover:bg-pum-bg transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
