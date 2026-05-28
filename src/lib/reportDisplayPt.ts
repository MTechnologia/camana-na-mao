/**
 * Rótulos em português para valores técnicos / enums gravados em inglês
 * (IA, colunas estruturadas) na ficha do relato.
 */

function normKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Escopo de afetação (`urban_reports.affected_scope` + variantes). */
const AFFECTED_SCOPE_PT: Record<string, string> = {
  individual: "Somente quem relata (poucas pessoas)",
  street: "Toda a rua ou trecho da via",
  neighborhood: "Bairro inteiro",
  zone: "Zona da cidade",
  city: "Cidade inteira",
  citywide: "Cidade inteira",
  building: "Prédio ou vizinhança próxima",
  block: "Quarteirão",
  route: "Trecho de rota",
  multiple: "Vários locais",
  regional: "Região ampla",
};

/** Consequências ativas (arrays em `active_consequences`). */
const ACTIVE_CONSEQUENCE_PT: Record<string, string> = {
  power_outage: "Falta de energia elétrica",
  water_outage: "Falta de água",
  traffic_blocked: "Via ou trânsito bloqueado",
  flooding: "Alagamento",
  health_hazard: "Risco à saúde",
  service_disruption: "Interrupção de serviço essencial",
};

/** Urgência / risco quando o campo veio só como token. Texto livre permanece como está. */
const URGENCY_TOKEN_PT: Record<string, string> = {
  none: "Nenhuma",
  low: "Baixa",
  moderate: "Moderada",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
  very_high: "Muito alta",
  emergency: "Emergência",
};

/** Severidade exibida no badge do cabeçalho. */
const SEVERITY_PT: Record<string, string> = {
  critical: "Crítica",
  critico: "Crítica",
  critica: "Crítica",
  high: "Alta",
  alta: "Alta",
  moderate: "Moderada",
  medium: "Média",
  med: "Média",
  low: "Baixa",
  baixa: "Baixa",
  none: "Sem classificação",
  nenhum: "Sem classificação",
  minor: "Leve",
  leve: "Leve",
};

const SENTIMENT_PT: Record<string, string> = {
  positive: "Positivo",
  negative: "Negativo",
  neutral: "Neutro",
  mixed: "Misto",
};

const TRANSPORT_DIRECTION_PT: Record<string, string> = {
  ida: "Ida",
  volta: "Volta",
  circular: "Circular",
};

const TRANSPORT_RECURRENCE_PT: Record<string, string> = {
  primeira_vez: "Primeira vez",
  algumas_vezes_mes: "Algumas vezes no mês",
  toda_semana: "Toda semana",
  todos_os_dias: "Todos os dias",
};

function isLikelyEnumToken(s: string): boolean {
  const t = s.trim();
  if (t.length > 40) return false;
  if (/\s/.test(t)) return false;
  return /^[a-z0-9_]+$/i.test(t);
}

export function formatAffectedScopePt(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "—";
  const key = normKey(String(raw)).replace(/\s+/g, "_");
  return AFFECTED_SCOPE_PT[key] ?? String(raw).trim();
}

/**
 * `urgency_reason` costuma ser texto do cidadão; às vezes grava-se só um token (ex.: moderate).
 */
export function formatUrbanUrgencyReasonPt(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "—";
  const s = String(raw).trim();
  if (isLikelyEnumToken(s)) {
    const mapped = URGENCY_TOKEN_PT[normKey(s)];
    if (mapped) return mapped;
  }
  return s;
}

export function formatActiveConsequencesListPt(values: string[]): string {
  return values
    .map((v) => {
      const k = normKey(v);
      return ACTIVE_CONSEQUENCE_PT[k] ?? v;
    })
    .join(", ");
}

export function formatSeverityBadgePt(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "—";
  const k = normKey(String(raw));
  return SEVERITY_PT[k] ?? String(raw).trim();
}

export function formatSentimentPt(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === "") return null;
  const k = normKey(String(raw));
  return SENTIMENT_PT[k] ?? String(raw).trim();
}

/** Prioridade na aba IA (P0–P3 ou tokens em inglês). */
export function formatIaPriorityPt(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === "") return null;
  const s = String(raw).trim();
  const n = normKey(s);
  if (/^p[0-3]$/.test(n)) return n.toUpperCase();
  if (isLikelyEnumToken(s)) {
    const mapped = URGENCY_TOKEN_PT[n] ?? SEVERITY_PT[n];
    if (mapped) return mapped;
  }
  return s;
}

export function formatTransportDirectionPt(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "—";
  const k = normKey(String(raw));
  return TRANSPORT_DIRECTION_PT[k] ?? String(raw).trim();
}

export function formatTransportRecurrencePt(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "—";
  const k = normKey(String(raw));
  return TRANSPORT_RECURRENCE_PT[k] ?? String(raw).trim();
}
