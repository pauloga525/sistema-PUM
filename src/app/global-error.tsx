"use client";

/**
 * Error en el layout raíz. Reemplaza todo el documento, así que no hay
 * estilos globales: se usan estilos en línea mínimos.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f8f9fa", color: "#191c1d" }}>
        <main role="alert" style={{ textAlign: "center", padding: 32, maxWidth: 420 }}>
          <title>Error — PUM Web</title>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>El sistema no está disponible en este momento</h1>
          <p style={{ fontSize: 14, color: "#43474f", marginBottom: 20 }}>
            Intenta de nuevo en unos minutos.
            {error.digest ? <> Código: <code>{error.digest}</code></> : null}
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ padding: "8px 16px", borderRadius: 8, border: 0, background: "#002753", color: "#fff", cursor: "pointer" }}
          >
            Intentar de nuevo
          </button>
        </main>
      </body>
    </html>
  );
}
