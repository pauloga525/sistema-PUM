"use client";

import { ConfirmDialog } from "@/components/ui/Dialog";

const TrashIcon = (
  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pum-error-light">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ba1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  </div>
);

/** Confirmación para eliminar una fila completa. */
export function DeleteRowDialog({
  open, onConfirm, onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => { if (!next) onCancel(); }}
      size="sm"
      tone="danger"
      icon={TrashIcon}
      title="¿Eliminar esta fila?"
      description={
        <>
          Se eliminará toda la fila con su contenido (destrezas, indicadores, metodología, recursos y evaluaciones).
          Esta acción no se puede deshacer.
        </>
      }
      confirmLabel="Eliminar fila"
      onConfirm={onConfirm}
    />
  );
}
