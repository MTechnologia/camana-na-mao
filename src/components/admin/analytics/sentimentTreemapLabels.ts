/** Helpers de rotulagem do SentimentTreemap (puros, sem JSX) — separados do
 * componente para não disparar o aviso react-refresh/only-export-components. */

/**
 * Trunca o rótulo ao que cabe na dimensão disponível. `charPx` é a largura média
 * por caractere na fonte usada (≈ 6.8px em 12px/600; ≈ 5.7px em 10px). Com fonte
 * menor cabe mais texto, então mais zonas exibem o nome.
 */
export function fitLabel(label: string, available: number, charPx = 6.8): string {
  const max = Math.max(0, Math.floor((available - 12) / charPx));
  if (label.length <= max) return label;
  if (max <= 1) return "";
  return `${label.slice(0, max - 1)}…`;
}

export type TreemapLabelMode = "horizontal" | "vertical" | "none";

/**
 * Decide como rotular a célula. No mobile o squarify gera colunas finas e altas
 * (as zonas de menor volume, à esquerda) onde o rótulo horizontal não cabe — daí
 * ficavam sem texto. Com a fonte reduzida, baixamos os limiares: horizontal nas
 * células com alguma largura, VERTICAL (girado) nas finas e altas, e nenhum só
 * nas minúsculas (resta o tooltip nativo).
 */
export function treemapLabelMode(width: number, height: number): TreemapLabelMode {
  if (width > 52 && height > 24) return "horizontal";
  if (width >= 22 && height > 48) return "vertical";
  return "none";
}
