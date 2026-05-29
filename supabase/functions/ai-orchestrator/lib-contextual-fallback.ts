import type { CollectionIntent } from "./lib.ts";
import type { NextFieldInfo } from "./lib-next-missing-field.ts";

const FIELD_RETRY_HINTS: Record<string, string> = {
  description: "Conte em poucas palavras o que aconteceu.",
  category: "Escolha o tema que melhor descreve o problema.",
  subcategory: "Descreva o tipo do problema em uma frase curta.",
  risk_level: "Toque em uma opção de gravidade ou descreva o que está acontecendo agora.",
  affected_scope: "Toque em uma opção: só você, a rua ou o bairro.",
  report_type: "Escolha o tipo de problema de transporte.",
  line_code: "Informe o número ou nome da linha.",
  stop_name: "Informe o ponto ou escreva «pular» se não souber.",
  stop_location: "Informe o local do ponto ou escreva «pular» se não souber.",
  rating_dimensions: "Toque nas estrelas de cada dimensão da avaliação.",
  photos: "Responda se deseja anexar fotos (sim ou não).",
};

const JOURNEY_RETRY_HINTS: Record<string, string> = {
  urban_report: "Vamos continuar seu relato urbano.",
  transport_report: "Vamos continuar seu relato de transporte.",
  service_rating: "Vamos continuar sua avaliação de serviço.",
};

export function extractLastFieldRequestFromHistory(
  chatMessages: Array<{ role: string; content: string }>,
): string | null {
  for (let i = chatMessages.length - 1; i >= 0; i--) {
    const msg = chatMessages[i];
    if (msg.role !== "assistant") continue;
    const match = msg.content.match(/\[FIELD_REQUEST:(\w+)\]/);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function buildContextualEmptyFallbackMessage(params: {
  collectionIntent: CollectionIntent | null;
  lastFieldRequest: string | null;
  nextFieldInfo: NextFieldInfo;
}): string {
  const { collectionIntent, lastFieldRequest, nextFieldInfo } = params;
  const field = nextFieldInfo.field ?? lastFieldRequest;
  const journeyHint = collectionIntent?.type
    ? JOURNEY_RETRY_HINTS[collectionIntent.type]
    : null;
  const fieldHint = field ? FIELD_RETRY_HINTS[field] : null;

  if (journeyHint && fieldHint) {
    return `${journeyHint} ${fieldHint} Se preferir, reformule sua última resposta.`;
  }
  if (fieldHint) {
    return `Não consegui processar sua resposta. ${fieldHint}`;
  }
  if (journeyHint) {
    return `${journeyHint} Pode repetir ou reformular sua última mensagem?`;
  }
  return "Desculpe, não consegui processar sua mensagem. Pode reformular ou repetir de outro jeito?";
}
