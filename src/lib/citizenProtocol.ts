/**
 * Código de acompanhamento legível (protocol_code) — ex.: REL-2026-000452, TRP-2026-000001.
 * O id UUID permanece só para uso interno / API.
 */
export const CITIZEN_PROTOCOL_LABEL = "Código de acompanhamento";

export function formatCitizenProtocolForDisplay(
  protocolCode: string | null | undefined,
): string | null {
  const t = protocolCode?.trim();
  return t && t.length > 0 ? t : null;
}
