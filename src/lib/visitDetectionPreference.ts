/**
 * Preferência `user_preferences.visit_detection_enabled`.
 * DEFAULT no banco é true; linha inexistente ou null tratamos como permitido (comportamento legado).
 */
export function visitDetectionAllowedFromPreference(
  visitDetectionEnabled: boolean | null | undefined,
): boolean {
  return visitDetectionEnabled !== false;
}
