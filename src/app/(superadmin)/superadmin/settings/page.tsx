import { getMaintenanceMode } from "@/modules/system/system-settings.service";
import { MaintenanceModeToggle } from "@/components/superadmin/MaintenanceModeToggle";

export const metadata = { title: "Sistema — SuperAdmin PUM" };

export default async function SystemSettingsPage() {
  const maintenance = await getMaintenanceMode();

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-pum-text">Sistema</h1>
        <p className="text-sm text-pum-text-muted mt-1">
          Control de acceso general del sistema.
        </p>
      </div>

      <MaintenanceModeToggle
        initialEnabled={maintenance.enabled}
        initialMessage={maintenance.message}
        enabledAt={maintenance.enabledAt}
      />
    </div>
  );
}
