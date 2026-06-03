/** CHB-035: detecta fluxo por dimensões atômicas (sem estrelas legado). */
export function conversationUsesDimensionOnlyRating(
  messages: Array<{ role: string; content: string }>,
): boolean {
  return messages.some(
    (m) =>
      m.role === "assistant" &&
      (m.content.includes("[FIELD_REQUEST:rating_dimensions]") ||
        m.content.includes("[MULTI_DIMENSION_RATING_PICKER]") ||
        /\[FIELD_REQUEST:dim_\w+\]/i.test(m.content)),
  );
}
