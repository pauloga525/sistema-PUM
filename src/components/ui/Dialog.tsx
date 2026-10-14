"use client";

import type { ReactNode } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";

/**
 * Diálogo modal accesible (Base UI): role="dialog", aria-modal, título y
 * descripción enlazados, foco atrapado dentro, cierre con Esc y devolución
 * del foco al elemento que lo abrió.
 *
 * Reemplaza a los overlays `fixed inset-0` hechos a mano.
 */

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
} as const;

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Ícono o ilustración sobre el título. */
  icon?: ReactNode;
  children?: ReactNode;
  size?: keyof typeof SIZES;
  /**
   * false: no se cierra con Esc ni con clic fuera (p. ej. mientras se guarda o
   * cuando se muestra una contraseña temporal que no debe perderse).
   */
  dismissible?: boolean;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  size = "md",
  dismissible = true,
  className = "",
}: DialogProps) {
  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !dismissible) return;
        onOpenChange(next);
      }}
      disablePointerDismissal={!dismissible}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <BaseDialog.Popup
          className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] ${SIZES[size]} max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-pum-border/80 bg-white p-6 shadow-2xl outline-none transition-[opacity,transform] duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 ${className}`}
        >
          {icon && <div className="mb-4 flex justify-center">{icon}</div>}
          <BaseDialog.Title className="text-base font-semibold text-pum-text">{title}</BaseDialog.Title>
          {description && (
            <BaseDialog.Description className="mt-1 text-sm text-pum-text-muted">{description}</BaseDialog.Description>
          )}
          {children && <div className="mt-4">{children}</div>}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

const CONFIRM_TONES = {
  primary: "bg-pum-primary hover:bg-pum-primary/90",
  danger:  "bg-red-700 hover:bg-red-800",
} as const;

export interface ConfirmDialogProps extends Omit<DialogProps, "children"> {
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  tone?: keyof typeof CONFIRM_TONES;
  pending?: boolean;
  /** Mensaje de error del último intento. */
  error?: string | null;
  /** Contenido adicional entre la descripción y los botones (p. ej. un campo). */
  children?: ReactNode;
  confirmDisabled?: boolean;
}

/** Confirmación con botones Cancelar / Confirmar. */
export function ConfirmDialog({
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  tone = "primary",
  pending = false,
  error,
  children,
  confirmDisabled = false,
  onOpenChange,
  ...dialog
}: ConfirmDialogProps) {
  return (
    <Dialog {...dialog} onOpenChange={onOpenChange} dismissible={!pending && (dialog.dismissible ?? true)}>
      {children}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={pending}
          className="flex-1 rounded-xl border border-pum-border px-4 py-2.5 text-sm font-medium text-pum-text hover:bg-pum-surface-container disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending || confirmDisabled}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${CONFIRM_TONES[tone]}`}
        >
          {pending ? "Procesando…" : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
