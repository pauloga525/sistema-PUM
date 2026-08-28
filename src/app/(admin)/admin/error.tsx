"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold text-pum-text">Ocurrió un error inesperado</h2>
      <p className="text-sm text-pum-text-secondary max-w-sm">
        {error.message || "Por favor, intenta nuevamente o contacta al administrador."}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium text-white bg-pum-primary rounded-lg hover:bg-pum-primary/90 transition-colors"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
