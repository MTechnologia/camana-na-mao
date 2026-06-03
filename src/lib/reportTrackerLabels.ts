/**
 * CHB-020: rótulos únicos para valores exibidos no tracker (alinhados ao chat e quick replies).
 */
import {
  SERVICE_RATING_DIMENSION_KEYS,
  SERVICE_RATING_DIMENSION_LABELS,
} from "@/lib/serviceRatingDimensions";

export const TRACKER_VALUE_LABELS: Record<string, Record<string, string>> = {
  report_nature: {
    reclamacao: "Reclamação",
    duvida: "Dúvida",
    sugestao: "Sugestão",
    elogio: "Elogio",
  },
  risk_level: {
    critical: "Crítico",
    moderate: "Moderado",
    low: "Baixo",
    none: "Sem risco",
  },
  affected_scope: {
    individual: "Só eu",
    local: "Rua / quadra",
    street: "Toda a rua",
    neighborhood: "Bairro todo",
    regional: "Região / bairros",
    citywide: "Cidade toda",
  },
  severity: {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    critica: "Crítica",
  },
  direction: {
    ida: "Ida",
    volta: "Volta",
    circular: "Circular",
  },
  recurrence_frequency: {
    primeira_vez: "Primeira vez",
    algumas_vezes_mes: "Algumas vezes/mês",
    toda_semana: "Toda semana",
    todos_os_dias: "Todos os dias",
  },
  category: {
    via_publica: "Via pública",
    iluminacao: "Iluminação",
    sinalizacao: "Sinalização",
    drenagem: "Drenagem",
    esgoto: "Esgoto",
    area_verde: "Área verde",
    lixo: "Lixo",
    calcada: "Calçada",
    higiene_urbana: "Higiene urbana",
    animais: "Animais",
    poluicao: "Poluição / barulho",
    feedback_camara: "Feedback da Câmara",
    outro: "Outro",
    outros: "Outro",
  },
  report_type: {
    atraso: "Atraso",
    lotacao: "Lotação",
    seguranca: "Segurança",
    limpeza: "Limpeza",
    acessibilidade: "Acessibilidade",
    conducao: "Condução",
    outro: "Outro",
  },
  service_type: {
    ubs: "UBS",
    school: "Escola",
    ceu: "CEU",
    hospital: "Hospital",
    library: "Biblioteca",
    sports_center: "Centro esportivo",
    street_market: "Feira",
    community_center: "Centro comunitário",
    daycare: "Creche",
    caps: "CAPS",
    cras: "CRAS",
    park: "Parque",
    social_assistance: "Assistência social",
    police_station: "Delegacia",
    transit_station: "Transporte",
    market: "Mercado",
    city_market: "Mercado municipal",
    theater: "Teatro / cinema",
    museum: "Museu",
    cemetery: "Cemitério",
    accessibility: "Acessibilidade",
    recycling_point: "Reciclagem",
    fire_station: "Bombeiros",
    other: "Outro",
  },
};

export function formatTrackerFieldValue(key: string, value: unknown): string {
  if (key === "wait_time_score" && value === null) return "Não se aplica";
  if (key === "wait_time_score" && typeof value === "number") {
    return `Faixa → nota ${value}`;
  }
  if (value === null || value === undefined) return "";

  const labels = TRACKER_VALUE_LABELS[key];
  if (labels && labels[String(value)]) {
    return labels[String(value)];
  }

  if (Array.isArray(value)) {
    return value.map((v) => labels?.[String(v)] || String(v)).join(", ");
  }

  if (key === "rating_stars" && typeof value === "number") {
    return `${"★".repeat(value)}${"☆".repeat(5 - value)} (${value}/5)`;
  }

  if (key === "personal_impact" && typeof value === "number") {
    if (value >= 5) return "Alto (compromisso ou não embarque)";
    if (value >= 4) return "Atraso > 30 min";
    if (value >= 3) return "Atraso < 30 min";
    return "Desconforto";
  }

  if (key === "rating_dimensions" && value && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, number>;
    return SERVICE_RATING_DIMENSION_KEYS.map(
      (k) => `${SERVICE_RATING_DIMENSION_LABELS[k]}: ${o[k] ?? "—"}/5`,
    ).join(" · ");
  }

  if (typeof value === "string" && value.length > 60) {
    return `${value.substring(0, 57)}...`;
  }

  return String(value);
}
