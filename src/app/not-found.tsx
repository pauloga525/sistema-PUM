import Link from "next/link";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center bg-pum-bg">
      <p className="text-5xl font-bold text-pum-primary">404</p>
      <h1 className="text-lg font-semibold text-pum-text">No encontramos esta página</h1>
      <p className="text-sm text-pum-text-muted max-w-sm">
        Puede que el enlace sea incorrecto o que el PUM ya no esté disponible para tu cuenta.
      </p>
      <Link
        href="/"
        className="px-4 py-2 text-sm font-medium text-white bg-pum-primary rounded-lg hover:bg-pum-primary/90 transition-colors"
      >
        Ir al inicio
      </Link>
    </main>
  );
}
