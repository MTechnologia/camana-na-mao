/**
 * CHB-004 (legado): defaults opcionais — não usado em getNextMissingField;
 * frequência e impacto devem ser perguntados ao cidadão.
 */

export function applyTransportCollectionDefaults(fields: Record<string, unknown>): void {
  if (!fields.direction && fields.line_code) {
    fields.direction = "ida";
    fields._direction_default = true;
  }
  if (!fields.recurrence_frequency) {
    fields.recurrence_frequency = "primeira_vez";
    fields._recurrence_default = true;
  }
  const impact = Number(fields.personal_impact);
  if (!Number.isInteger(impact) || impact < 2 || impact > 5) {
    fields.personal_impact = 3;
    fields._personal_impact_default = true;
  }
}
