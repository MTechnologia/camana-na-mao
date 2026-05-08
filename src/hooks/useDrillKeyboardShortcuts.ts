import { useEffect } from "react";

/**
 * HU-3.3 — Atalhos de teclado para drill-up.
 *
 *   Backspace  → sobe um nível (`onUp`)
 *   Esc        → volta ao topo  (`onReset`)
 *
 * Os atalhos são ignorados quando o foco está em campos de texto (input,
 * textarea, contenteditable, select) para não atrapalhar quem está digitando.
 *
 * `enabled=false` desliga totalmente — útil para registrar o hook só quando a
 * aba relevante está ativa.
 */

export interface UseDrillKeyboardShortcutsOptions {
  /** Sobe um nível (Backspace). */
  onUp?: () => void;
  /** Volta ao topo (Esc). */
  onReset?: () => void;
  /** Liga/desliga os listeners. Default: true. */
  enabled?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  // Radix popover/dialog/select usa role="combobox"/"listbox" — ignorar também
  const role = target.getAttribute("role");
  if (role === "combobox" || role === "listbox" || role === "textbox") return true;
  return false;
}

export function useDrillKeyboardShortcuts(options: UseDrillKeyboardShortcutsOptions): void {
  const { onUp, onReset, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      // Modificadores tornam o atalho menos previsível — ignora ctrl/meta/alt
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "Backspace" && onUp) {
        event.preventDefault();
        onUp();
      } else if (event.key === "Escape" && onReset) {
        // Sem preventDefault no Esc — diálogos/popovers usam ele também e
        // a precedência é deles. Só disparamos onReset se nada mais consumir.
        // Para este uso, basta delegar.
        onReset();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onUp, onReset]);
}
