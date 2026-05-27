export type ConversationToneKind =
  | "neutral"
  | "frustrated"
  | "direct_offense"
  | "urgent_risk";

export type ConversationExpectedBehavior =
  | "classificar"
  | "advertir_e_continuar"
  | "orientar_emergencia";

export interface ConversationToneAnalysis {
  kind: ConversationToneKind;
  expectedBehavior: ConversationExpectedBehavior;
  shouldWarn: boolean;
  shouldOrientEmergency: boolean;
  hasProfanity: boolean;
  reasons: string[];
}

function normalizeForTone(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const PROFANITY_RE = /\b(merda|porcaria|caralho|porra|cacete|inferno|bosta|droga|lixo)\b/i;
const DIRECT_OFFENSE_RE =
  /\b(voce|voces|vc|vcs|assistente|bot|robo|app|sistema|camara)\b.{0,48}\b(incompetentes?|burro|burra|idiota|imprestavel|ridiculo|ridicula|lixo|porcaria|merda)\b/i;
const URGENT_RISK_RE =
  /\b(arma|armado|fac[aao]|tiro|tiroteio|ameaca|ameacando|agressao|agredindo|briga|violencia|assedio|abuso|incendio|fogo|chamas|queimando|choque|fio caido|fios expostos|risco de vida|acidente grave|sangrando)\b/i;

export function analyzeConversationTone(input: string): ConversationToneAnalysis {
  const text = normalizeForTone(input);
  const hasProfanity = PROFANITY_RE.test(text);
  const hasDirectOffense = DIRECT_OFFENSE_RE.test(text);
  const hasUrgentRisk = URGENT_RISK_RE.test(text);
  const reasons: string[] = [];

  if (hasUrgentRisk) {
    reasons.push("urgent_risk_terms");
    return {
      kind: "urgent_risk",
      expectedBehavior: "orientar_emergencia",
      shouldWarn: false,
      shouldOrientEmergency: true,
      hasProfanity,
      reasons,
    };
  }

  if (hasDirectOffense) {
    reasons.push("direct_offense_terms");
    return {
      kind: "direct_offense",
      expectedBehavior: "advertir_e_continuar",
      shouldWarn: true,
      shouldOrientEmergency: false,
      hasProfanity,
      reasons,
    };
  }

  if (hasProfanity) {
    reasons.push("frustration_terms");
    return {
      kind: "frustrated",
      expectedBehavior: "classificar",
      shouldWarn: false,
      shouldOrientEmergency: false,
      hasProfanity,
      reasons,
    };
  }

  return {
    kind: "neutral",
    expectedBehavior: "classificar",
    shouldWarn: false,
    shouldOrientEmergency: false,
    hasProfanity: false,
    reasons,
  };
}

export function buildConversationToneInstruction(analysis: ConversationToneAnalysis): string {
  if (analysis.kind === "urgent_risk") {
    return [
      "=== TOM: RISCO IMEDIATO ===",
      "A mensagem pode envolver risco imediato. Oriente de forma breve a acionar o canal emergencial adequado (190, 192 ou 193, conforme o caso) e o 156 para serviço municipal quando aplicável.",
      "Depois continue a coleta do relato com apenas o próximo campo necessário. Não trate risco imediato como reclamação comum.",
    ].join("\n");
  }

  if (analysis.kind === "direct_offense") {
    return [
      "=== TOM: OFENSA DIRETA ===",
      "Se houver insulto direto ao assistente, app, sistema ou atendimento, responda com um limite curto de respeito em no máximo uma frase.",
      "Em seguida continue ajudando normalmente no fluxo do cidadão. Não repita o xingamento e não encerre a jornada.",
    ].join("\n");
  }

  if (analysis.kind === "frustrated") {
    return [
      "=== TOM: FRUSTRACAO DO CIDADAO ===",
      "A linguagem pode conter palavrão sobre a situação. Reconheça a frustração sem censurar nem repetir o termo, e siga a classificação/coleta normalmente.",
    ].join("\n");
  }

  return "";
}
