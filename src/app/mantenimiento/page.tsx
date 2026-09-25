import Link from "next/link";
import { appConfig } from "@/config/app.config";
import { getMaintenanceMode } from "@/modules/system/system-settings.service";
import { ROUTES } from "@/constants/routes";

export const metadata = { title: "Sistema en mantenimiento" };

export default async function MaintenancePage() {
  const maintenance = await getMaintenanceMode();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <main className="w-full max-w-[420px] flex flex-col items-center gap-5">
        <div
          className="w-full flex flex-col gap-5 px-8 py-9 text-center"
          style={{
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.55)",
            borderRadius: "1.5rem",
            boxShadow: "0 8px 40px rgba(0,39,83,0.10), inset 0 1px 0 rgba(255,255,255,0.90)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto"
            style={{
              background: "linear-gradient(135deg, #002753 0%, #003d7a 100%)",
              boxShadow: "0 4px 16px rgba(0,39,83,0.30), inset 0 1px 0 rgba(255,255,255,0.20)",
            }}
            aria-hidden="true"
          >
            🛠
          </div>

          <div>
            <h1 className="text-xl font-bold text-pum-text leading-tight">
              Sistema temporalmente deshabilitado
            </h1>
            <p className="text-sm text-pum-text-muted mt-1">
              {appConfig.institutionName}
            </p>
          </div>

          <div
            className="w-full h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,39,83,0.10), transparent)" }}
          />

          <p className="text-sm text-pum-text leading-relaxed">
            {maintenance.enabled && maintenance.message
              ? maintenance.message
              : "El acceso para Docentes y Coordinadores está temporalmente deshabilitado. Estará disponible nuevamente en unos días."}
          </p>

          {!maintenance.enabled && (
            <Link
              href={ROUTES.LOGIN}
              className="pum-navy-btn w-full py-2.5 text-white text-sm font-semibold rounded-xl cursor-pointer mt-1"
            >
              Ir a iniciar sesión
            </Link>
          )}
        </div>

        <footer className="text-center">
          <p className="text-xs text-pum-text-disabled">
            Sistema PUM Web &nbsp;·&nbsp; Uso exclusivo institucional
          </p>
        </footer>
      </main>
    </div>
  );
}
