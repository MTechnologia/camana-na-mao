export const TRANSPORT_SUBCATEGORIES: Record<string, Array<{ value: string; label: string }>> = {
  atraso: [
    { value: "nao_passou", label: "Não passou" },
    { value: "atraso_maior_30", label: "Veio com mais de 30 min de atraso" },
    { value: "atraso_menor_30", label: "Veio com menos de 30 min de atraso" },
    { value: "intervalo_irregular", label: "Intervalo irregular" },
  ],
  lotacao: [
    { value: "superlotado", label: "Veículo superlotado" },
    { value: "nao_conseguiu_embarcar", label: "Não consegui embarcar" },
    { value: "fila_excessiva", label: "Fila excessiva no ponto/estação" },
    { value: "ar_condicionado_inoperante", label: "Ar-condicionado inoperante" },
  ],
  seguranca: [
    { value: "assedio", label: "Assédio/Importunação" },
    { value: "furto_roubo", label: "Furto/Roubo" },
    { value: "agressao_ameaca", label: "Agressão/Ameaça" },
    { value: "briga_confusao", label: "Briga/Confusão" },
  ],
  acessibilidade: [
    { value: "elevador_escada", label: "Elevador/Escada rolante indisponível" },
    { value: "rampa_bloqueada", label: "Rampa bloqueada/inacessível" },
    { value: "veiculo_sem_acessibilidade", label: "Veículo sem acessibilidade" },
    { value: "falta_assistencia", label: "Falta de assistência para embarque" },
  ],
  limpeza: [
    { value: "veiculo_sujo", label: "Veículo sujo" },
    { value: "mau_cheiro", label: "Mau cheiro" },
    { value: "lixo_acumulado", label: "Lixo acumulado" },
    { value: "presenca_pragas", label: "Presença de pragas/insetos" },
  ],
  conducao: [
    { value: "freada_brusca", label: "Freada brusca" },
    { value: "aceleracao_excessiva", label: "Aceleração excessiva" },
    { value: "motorista_imprudente", label: "Condução imprudente do motorista" },
    { value: "nao_parou_ponto", label: "Não parou no ponto" },
  ],
  outro: [{ value: "outro", label: "Outro (descrever)" }],
};

export function normalizeTransportSubcategory(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isValidTransportSubcategory(reportType: string, subCategory: string): boolean {
  const type = String(reportType || "").trim().toLowerCase();
  const normalized = normalizeTransportSubcategory(subCategory);
  const options = TRANSPORT_SUBCATEGORIES[type] || TRANSPORT_SUBCATEGORIES.outro;
  return options.some((o) => normalizeTransportSubcategory(o.value) === normalized);
}

export function getTransportSubcategoryLabel(reportType: string, subCategory: string): string | null {
  const type = String(reportType || "").trim().toLowerCase();
  const normalized = normalizeTransportSubcategory(subCategory);
  const options = TRANSPORT_SUBCATEGORIES[type] || TRANSPORT_SUBCATEGORIES.outro;
  const found = options.find((o) => normalizeTransportSubcategory(o.value) === normalized);
  return found?.label ?? null;
}
