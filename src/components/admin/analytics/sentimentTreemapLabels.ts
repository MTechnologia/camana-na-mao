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

/**
 * Quebra o rótulo em até `maxLines` linhas que cabem na largura — para nomes
 * longos (ex.: bairros "Vila Andrade", "Jardim Esmeralda") aproveitarem a altura
 * de células quadradas em vez de cortar tudo em uma linha. Palavra maior que a
 * linha é truncada com reticências; sobra além das linhas marca "…" na última.
 */
export function wrapLabel(label: string, available: number, charPx = 5.7, maxLines = 2): string[] {
  const text = (label ?? "").trim();
  if (!text) return [];
  if (maxLines <= 1) {
    const one = fitLabel(text, available, charPx);
    return one ? [one] : [];
  }
  const maxChars = Math.max(1, Math.floor((available - 12) / charPx));
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    const candidate = cur ? `${cur} ${word}` : word;
    if (candidate.length <= maxChars) {
      cur = candidate;
      continue;
    }
    if (cur) lines.push(cur);
    cur = word.length <= maxChars ? word : `${word.slice(0, Math.max(1, maxChars - 1))}…`;
    if (lines.length === maxLines) {
      cur = "";
      break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  // Sobrou conteúdo além do que coube nas linhas → sinaliza com "…" na última.
  const used = lines.join(" ").replace(/…/g, "").trim();
  if (used.length < text.length && lines.length > 0) {
    const last = lines[lines.length - 1];
    if (!last.endsWith("…")) {
      lines[lines.length - 1] = last.length >= maxChars
        ? `${last.slice(0, Math.max(1, maxChars - 1))}…`
        : `${last}…`;
    }
  }
  return lines;
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
