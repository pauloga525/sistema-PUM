/**
 * Preset Tailwind CSS para PUM Web.
 *
 * Extiende los colores y radios de Tailwind con los tokens del design system.
 * De esta forma las clases Tailwind (ej: bg-pum-primary, text-pum-muted)
 * usan exactamente los mismos valores que las variables CSS del prototipo HTML.
 *
 * Uso en tailwind.config.ts:
 *   import pumPreset from '../packages/design-tokens/tailwind-preset'
 *   export default { presets: [pumPreset], ... }
 */

/** @type {import('tailwindcss').Config} */
const pumPreset = {
  theme: {
    extend: {
      colors: {
        pum: {
          bg: "var(--pum-color-bg)",
          surface: "var(--pum-color-surface)",
          "surface-alt": "var(--pum-color-surface-alt)",

          text: "var(--pum-color-text)",
          "text-muted": "var(--pum-color-text-muted)",
          "text-disabled": "var(--pum-color-text-disabled)",
          "text-inverse": "var(--pum-color-text-inverse)",

          primary: "var(--pum-color-primary)",
          "primary-hover": "var(--pum-color-primary-hover)",
          "primary-light": "var(--pum-color-primary-light)",

          success: "var(--pum-color-success)",
          "success-light": "var(--pum-color-success-light)",
          warning: "var(--pum-color-warning)",
          "warning-light": "var(--pum-color-warning-light)",
          error: "var(--pum-color-error)",
          "error-light": "var(--pum-color-error-light)",
          info: "var(--pum-color-info)",
          "info-light": "var(--pum-color-info-light)",

          border: "var(--pum-color-border)",
          "border-strong": "var(--pum-color-border-strong)",
          "border-focus": "var(--pum-color-border-focus)",
        },
      },
      fontFamily: {
        sans: ["var(--pum-font-sans)"],
        mono: ["var(--pum-font-mono)"],
      },
      borderRadius: {
        sm: "var(--pum-radius-sm)",
        md: "var(--pum-radius-md)",
        lg: "var(--pum-radius-lg)",
        full: "var(--pum-radius-full)",
      },
      spacing: {
        sidebar: "var(--pum-sidebar-width)",
        topbar: "var(--pum-topbar-height)",
      },
      maxWidth: {
        content: "var(--pum-content-max-width)",
      },
      boxShadow: {
        "pum-sm": "var(--pum-shadow-sm)",
        "pum-md": "var(--pum-shadow-md)",
      },
    },
  },
};

module.exports = pumPreset;
