/** Rótulos de exibição para chaves de categoria (urban_reports, transporte, equipamentos). */
const REPORT_CATEGORY_LABELS: Record<string, string> = {
  // Relatos urbanos
  iluminacao: "Iluminação",
  calcada: "Calçada",
  via_publica: "Via pública",
  pavimentacao: "Pavimentação",
  sinalizacao: "Sinalização",
  drenagem: "Drenagem",
  lixo: "Lixo e limpeza",
  area_verde: "Área verde",
  poluicao: "Poluição",
  seguranca: "Segurança",
  transito: "Trânsito",
  esgoto: "Esgoto",
  higiene_urbana: "Higiene urbana",
  animais: "Animais",
  feedback_camara: "Feedback da Câmara",
  outro: "Outro",
  outros: "Outro",
  // Transporte
  atraso: "Atraso",
  lotacao: "Lotação",
  manutencao: "Manutenção",
  acessibilidade: "Acessibilidade",
  conducao: "Condução",
  limpeza: "Limpeza",
  // Equipamentos / avaliações
  ubs: "UBS",
  school: "Escola",
  ceu: "CEU",
  hospital: "Hospital",
  police_station: "Delegacia",
  fire_station: "Corpo de bombeiros",
  transit_station: "Estação de trânsito",
  bicycle: "Bicicletário",
  subprefeitura: "Subprefeitura",
};

const CATEGORY_ACRONYMS = new Set(["ubs", "ceu"]);

function humanizeCategoryKey(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (CATEGORY_ACRONYMS.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** Converte chave técnica (ex.: via_publica) em rótulo para gráficos e listas. */
export function formatReportCategoryLabel(category: string | null | undefined): string {
  if (!category?.trim()) return "Não informado";
  const normalized = category.trim().toLowerCase();
  return REPORT_CATEGORY_LABELS[normalized] ?? humanizeCategoryKey(normalized);
}
