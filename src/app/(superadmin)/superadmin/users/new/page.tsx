import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { CreateUserForm } from "@/components/superadmin/CreateUserForm";

export const metadata = { title: "Nuevo usuario — SuperAdmin PUM" };

export default function NewUserPage() {
  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <Link
          href={ROUTES.SUPERADMIN.USERS}
          className="text-sm text-pum-text-muted hover:text-pum-text underline-offset-2 hover:underline transition-colors"
        >
          ← Volver a usuarios
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-pum-text">Nuevo usuario</h1>
        <p className="text-sm text-pum-text-muted mt-1">
          El usuario recibirá su cédula como contraseña inicial y deberá cambiarla al primer ingreso.
        </p>
      </div>

      <div className="rounded-xl border border-pum-border bg-white p-6">
        <CreateUserForm />
      </div>
    </div>
  );
}
