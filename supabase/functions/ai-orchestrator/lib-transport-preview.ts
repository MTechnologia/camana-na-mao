import { getTransportSubcategoryLabel } from "./lib-transport-subcategories.ts";

export function generateTransportLabelFromDescription(description: string): string {
  if (!description || description.trim().length === 0) {
    return "Problema no Transporte";
  }

  const transportLabelPatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /motorista\s*(rude|grosso|mal\s*educado)?/i, label: "Problema com Motorista" },
    { pattern: /cobrador/i, label: "Problema com Cobrador" },
    { pattern: /ar\s*condicionado|ar\s*quebrado|calor/i, label: "Problema de Climatização" },
    { pattern: /porta\s*(quebrad|não\s*abre)/i, label: "Porta com Defeito" },
    { pattern: /banco\s*(quebrad|sujo|rasgad)/i, label: "Banco Danificado" },
    { pattern: /freada|freio|freiada\s*bruscas?/i, label: "Condução Perigosa" },
    { pattern: /não\s*para|passou\s*direto/i, label: "Veículo Não Parou" },
    { pattern: /quebrou|pane|enguiçou/i, label: "Veículo Quebrado" },
    { pattern: /rota\s*(errada|diferente)|caminho\s*diferente/i, label: "Rota Alterada" },
    { pattern: /integração|baldeação/i, label: "Problema de Integração" },
    { pattern: /cartão|bilhete|passagem/i, label: "Problema com Bilhetagem" },
  ];

  const descLower = description.toLowerCase();
  for (const lp of transportLabelPatterns) {
    if (lp.pattern.test(descLower)) {
      return lp.label;
    }
  }

  const words = description
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûçñ]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 4);

  if (words.length === 0) {
    return "Problema no Transporte";
  }

  const label = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return label.substring(0, 50) || "Problema no Transporte";
}

export function getTransportTypeLabel(reportType: string): string {
  const labels: Record<string, string> = {
    atraso: "Atraso de Veículo",
    lotacao: "Veículo Lotado",
    seguranca: "Problema de Segurança",
    acessibilidade: "Problema de Acessibilidade",
    limpeza: "Problema de Limpeza",
    conducao: "Problema de Condução",
    outro: "Outro Problema",
  };
  return labels[reportType] || "Problema no Transporte";
}

export function formatTransportPreviewTypeLine(fields: Record<string, unknown>): string {
  const shortType: Record<string, string> = {
    atraso: "Atraso",
    lotacao: "Lotação",
    seguranca: "Segurança",
    acessibilidade: "Acessibilidade",
    limpeza: "Limpeza",
    conducao: "Condução",
    outro: "Outro",
  };
  const rt = String(fields.report_type || "").trim().toLowerCase();
  const sub = String(fields.sub_category || "").trim();
  const typeLabel = shortType[rt] || getTransportTypeLabel(rt);
  if (!sub) return typeLabel;
  const subLabel = getTransportSubcategoryLabel(rt, sub);
  return subLabel ? `${typeLabel} — ${subLabel}` : typeLabel;
}
