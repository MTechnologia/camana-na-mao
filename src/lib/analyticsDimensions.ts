import { bairroParaZona, ZONA_DESCONHECIDA, type ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";

/**
 * HU-3.5 — Biblioteca de dimensões analíticas para drill-across.
 *
 * Cada dimensão expõe:
 *   - `extract(report)` → calcula o valor da dimensão a partir de um relato unificado.
 *   - `values`           → lista canônica de valores possíveis (linhas/colunas do heatmap).
 *   - `label(value)`     → tradução para exibição.
 *
 * Um `UnifiedReport` agrega os campos comuns das três fontes (urban_reports,
 * transport_reports, service_ratings) + dados demográficos do autor, permitindo
 * que cada extrator seja agnóstico da origem.
 */

export type DimensionKey =
  | "category"
  | "status"
  | "severity"
  | "zone"
  | "time_month"
  | "time_weekday"
  | "time_hour"
  | "sentiment"
  | "gender"
  | "race"
  | "social_class"
  | "age_group"
  | "source";

export interface UnifiedReport {
  id: string;
  /** Categoria macro: "Urbano" | "Transporte" | "Avaliação" */
  category: "Urbano" | "Transporte" | "Avaliação";
  status: string | null;
  severity: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string | null;
  /** Sentimento bruto da IA (qualquer string ou null). */
  sentimentRaw: string | null;
  /** Como o relato chegou — para urban: ai_classification.source ou similar. Default "manual". */
  source: "manual" | "ai" | "import" | "unknown";
  userId: string | null;
  /** Demografia do autor — null quando não há cadastro. */
  demoGender: string | null;
  demoRace: string | null;
  demoSocialClass: string | null;
  /** Idade calculada a partir de birth_date no momento da carga. */
  demoAge: number | null;
}

const NOT_INFORMED = "not_informed";

// ---------------------------------------------------------------------------
// Helpers de normalização
// ---------------------------------------------------------------------------

function normalizeStatus(value: string | null): string {
  const s = (value ?? "").toLowerCase().trim();
  if (!s) return "Pendente";
  if (s === "resolved" || s === "resolvido" || s === "concluido" || s === "concluído") return "Resolvido";
  if (s === "rejected" || s === "rejeitado") return "Rejeitado";
  if (s.includes("andamento") || s === "in_progress") return "Em andamento";
  if (s === "pending" || s.includes("pendente")) return "Pendente";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeSeverity(value: string | null): string {
  const s = (value ?? "").toLowerCase().trim();
  if (!s) return "Sem classificação";
  if (s.includes("crit") || s.includes("crít")) return "Crítico";
  if (s.includes("alto") || s === "alta" || s === "high") return "Alto";
  if (s.includes("med") || s.includes("méd") || s === "medium") return "Médio";
  if (s.includes("bai") || s === "low") return "Baixo";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeSentiment(value: string | null): string {
  const s = (value ?? "").toLowerCase().trim();
  if (!s) return "Neutro";
  if (s.includes("posit")) return "Positivo";
  if (s.includes("negativ")) return "Negativo";
  return "Neutro";
}

function ageToGroup(age: number | null): string {
  if (age === null || age === undefined || Number.isNaN(age)) return NOT_INFORMED;
  if (age < 18) return "under_18";
  if (age <= 24) return "18_24";
  if (age <= 34) return "25_34";
  if (age <= 44) return "35_44";
  if (age <= 54) return "45_54";
  if (age <= 64) return "55_64";
  return "65_plus";
}

const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// ---------------------------------------------------------------------------
// Definições das dimensões
// ---------------------------------------------------------------------------

export interface DimensionDef {
  key: DimensionKey;
  label: string;
  /** Curta descrição para tooltips/dropdowns. */
  description: string;
  /** Valores em ordem canônica de exibição. Pode ser ordenado por count na UI. */
  values: string[];
  /** Tradução pt-BR de cada valor. */
  valueLabel: (value: string) => string;
  /** Extrai o valor da dimensão a partir de um relato unificado. */
  extract: (r: UnifiedReport) => string;
}

const GENDER_LABELS: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  nao_binario: "Não-binário",
  outro: "Outro",
  prefer_not_to_say: "Prefere não dizer",
  [NOT_INFORMED]: "Não informado",
};

const RACE_LABELS: Record<string, string> = {
  branca: "Branca",
  preta: "Preta",
  parda: "Parda",
  amarela: "Amarela",
  indigena: "Indígena",
  prefer_not_to_say: "Prefere não dizer",
  [NOT_INFORMED]: "Não informado",
};

const CLASS_LABELS: Record<string, string> = {
  A: "Classe A", B: "Classe B", AB: "Classe AB",
  C: "Classe C", D: "Classe D", E: "Classe E",
  [NOT_INFORMED]: "Não informado",
};

const AGE_LABELS: Record<string, string> = {
  under_18: "Menos de 18", "18_24": "18-24", "25_34": "25-34",
  "35_44": "35-44", "45_54": "45-54", "55_64": "55-64",
  "65_plus": "65 ou mais",
  [NOT_INFORMED]: "Não informado",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Cadastro manual",
  ai: "Classificação IA",
  import: "Importação",
  unknown: "Origem desconhecida",
};

export const DIMENSIONS: Record<DimensionKey, DimensionDef> = {
  category: {
    key: "category",
    label: "Tipo de relato",
    description: "Urbano / Transporte / Avaliação",
    values: ["Urbano", "Transporte", "Avaliação"],
    valueLabel: (v) => v,
    extract: (r) => r.category,
  },
  status: {
    key: "status",
    label: "Status",
    description: "Estado de tratamento",
    values: ["Pendente", "Em andamento", "Resolvido", "Rejeitado"],
    valueLabel: (v) => v,
    extract: (r) => normalizeStatus(r.status),
  },
  severity: {
    key: "severity",
    label: "Severidade",
    description: "Criticidade do relato",
    values: ["Crítico", "Alto", "Médio", "Baixo", "Sem classificação"],
    valueLabel: (v) => v,
    extract: (r) => normalizeSeverity(r.severity),
  },
  zone: {
    key: "zone",
    label: "Zona da cidade",
    description: "Norte / Sul / Leste / Oeste / Centro",
    values: ["Centro", "Zona Norte", "Zona Sul", "Zona Leste", "Zona Oeste", ZONA_DESCONHECIDA],
    valueLabel: (v) => v,
    extract: (r) => {
      const z: ZonaVolumeOuDesconhecida = bairroParaZona(
        r.neighborhood ?? "",
        r.latitude,
        r.longitude,
      );
      return String(z);
    },
  },
  time_month: {
    key: "time_month",
    label: "Mês",
    description: "Mês do relato (Jan-Dez)",
    values: MONTH_LABELS.map((_, i) => String(i + 1)),
    valueLabel: (v) => MONTH_LABELS[parseInt(v, 10) - 1] || v,
    extract: (r) => {
      if (!r.createdAt) return NOT_INFORMED;
      const d = new Date(r.createdAt);
      if (Number.isNaN(d.getTime())) return NOT_INFORMED;
      return String(d.getMonth() + 1);
    },
  },
  time_weekday: {
    key: "time_weekday",
    label: "Dia da semana",
    description: "Domingo a Sábado",
    values: WEEKDAY_LABELS,
    valueLabel: (v) => v,
    extract: (r) => {
      if (!r.createdAt) return NOT_INFORMED;
      const d = new Date(r.createdAt);
      if (Number.isNaN(d.getTime())) return NOT_INFORMED;
      return WEEKDAY_LABELS[d.getDay()];
    },
  },
  time_hour: {
    key: "time_hour",
    label: "Hora do dia",
    description: "0h a 23h",
    values: Array.from({ length: 24 }, (_, h) => String(h)),
    valueLabel: (v) => `${v}h`,
    extract: (r) => {
      if (!r.createdAt) return NOT_INFORMED;
      const d = new Date(r.createdAt);
      if (Number.isNaN(d.getTime())) return NOT_INFORMED;
      return String(d.getHours());
    },
  },
  sentiment: {
    key: "sentiment",
    label: "Sentimento",
    description: "Positivo / Neutro / Negativo",
    values: ["Positivo", "Neutro", "Negativo"],
    valueLabel: (v) => v,
    extract: (r) => normalizeSentiment(r.sentimentRaw),
  },
  gender: {
    key: "gender",
    label: "Gênero",
    description: "Sexo autodeclarado pelo autor",
    values: Object.keys(GENDER_LABELS),
    valueLabel: (v) => GENDER_LABELS[v] || v,
    extract: (r) => r.demoGender || NOT_INFORMED,
  },
  race: {
    key: "race",
    label: "Raça/Cor",
    description: "Cor autodeclarada",
    values: Object.keys(RACE_LABELS),
    valueLabel: (v) => RACE_LABELS[v] || v,
    extract: (r) => r.demoRace || NOT_INFORMED,
  },
  social_class: {
    key: "social_class",
    label: "Classe social",
    description: "Classe econômica",
    values: Object.keys(CLASS_LABELS),
    valueLabel: (v) => CLASS_LABELS[v] || v,
    extract: (r) => r.demoSocialClass || NOT_INFORMED,
  },
  age_group: {
    key: "age_group",
    label: "Faixa etária",
    description: "Idade do autor",
    values: Object.keys(AGE_LABELS),
    valueLabel: (v) => AGE_LABELS[v] || v,
    extract: (r) => ageToGroup(r.demoAge),
  },
  source: {
    key: "source",
    label: "Fonte do relato",
    description: "Como chegou ao sistema",
    values: Object.keys(SOURCE_LABELS),
    valueLabel: (v) => SOURCE_LABELS[v] || v,
    extract: (r) => r.source,
  },
};

/** Lista ordenada para uso em UI (dropdowns). */
export const DIMENSION_KEYS: DimensionKey[] = [
  "category",
  "status",
  "severity",
  "zone",
  "time_month",
  "time_weekday",
  "time_hour",
  "sentiment",
  "gender",
  "race",
  "social_class",
  "age_group",
  "source",
];

// Exports para teste
export const __test__ = {
  normalizeStatus,
  normalizeSeverity,
  normalizeSentiment,
  ageToGroup,
  NOT_INFORMED,
};
