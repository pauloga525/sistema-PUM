"use client";

import { useEffect } from "react";

/**
 * Pantalla de error de los paneles (error.tsx de cada rol). Se muestra dentro
 * del layout del rol, así que la navegación sigue disponible.
 *
 * En producción Next reemplaza el mensaje de los errores del servidor por uno
 * genérico; el `digest` permite ubicar el error en los logs.
 */
export function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[RouteError]", error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold text-pum-text">Ocurrió un error inesperado</h2>
      <p className="text-sm text-pum-text-muted max-w-sm">
        Intenta nuevamente. Si el problema continúa, contacta al administrador
        {error.digest ? <> e indica el código <code className="font-mono">{error.digest}</code></> : null}.
      </p>
      {process.env.NODE_ENV === "development" && error.message && (
        <pre className="max-w-xl whitespace-pre-wrap text-left text-xs text-pum-text-muted">{error.message}</pre>
      )}
      <button
        type="button"
        onClick={() => retry()}
        className="px-4 py-2 text-sm font-medium text-white bg-pum-primary rounded-lg hover:bg-pum-primary/90 transition-colors"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
