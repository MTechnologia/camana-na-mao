/** Helpers de rotulagem do SentimentTreemap (puros, sem JSX) — separados do
 * componente para não disparar o aviso react-refresh/only-export-components. */

/** Trunca o rótulo ao que cabe na dimensão disponível (≈ 6.8px/char em 12px/600). */
export function fitLabel(label: string, available: number): string {
  const max = Math.max(0, Math.floor((available - 16) / 6.8));
  if (label.length <= max) return label;
  if (max <= 1) return "";
  return `${label.slice(0, max - 1)}…`;
}

export type TreemapLabelMode = "horizontal" | "vertical" | "none";

/**
 * Decide como rotular a célula. No mobile o squarify gera colunas finas e altas
 * (as zonas de menor volume, à esquerda) onde o rótulo horizontal não cabe — daí
 * ficavam sem texto. Nessas usamos rótulo VERTICAL (girado), aproveitando a
 * altura; nas largas, horizontal; nas minúsculas, nenhum (resta o tooltip nativo).
 */
export function treemapLabelMode(width: number, height: number): TreemapLabelMode {
  if (width > 64 && height > 30) return "horizontal";
  if (width >= 22 && height > 56) return "vertical";
  return "none";
}
