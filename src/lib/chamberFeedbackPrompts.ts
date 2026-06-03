/**
 * Helpers do fluxo de feedback à Câmara (sobre um vereador).
 *
 * O tipo do feedback (reclamação / sugestão / elogio) costuma ser perguntado pelo
 * LLM em linguagem natural, sem o marcador [QUICK_REPLY]. Este detector reconhece
 * essa pergunta para que o chat ofereça os 3 botões — sem "dúvida", que não faz
 * sentido para feedback sobre um parlamentar.
 */

/** Valores de natureza válidos para feedback à Câmara (não inclui "duvida"). */
export const CHAMBER_FEEDBACK_NATURE_VALUES = ["reclamacao", "sugestao", "elogio"] as const;

/** Detecta a pergunta "...é uma reclamação, uma sugestão ou um elogio?" no contexto de vereador. */
export function looksLikeChamberFeedbackNatureQuestion(content: string): boolean {
  if (!content) return false;
  const c = content.toLowerCase();
  const mentionsChamberContext =
    c.includes("feedback") || c.includes("vereador") || c.includes("vereadora");
  return (
    mentionsChamberContext &&
    c.includes("reclama") &&
    c.includes("sugest") &&
    c.includes("elogio")
  );
}
