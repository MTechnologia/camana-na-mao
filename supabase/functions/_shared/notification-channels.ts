/**
 * RN-NOT-004: interpretação de notification_settings para envio multi-canal.
 * Sem linha em notification_settings: mantém compatibilidade (push tratado como habilitado).
 */

export type NotificationSettingsChannels = {
  push_enabled?: boolean | null;
  email_enabled?: boolean | null;
  sms_enabled?: boolean | null;
} | null;

export function resolveChannelFlags(settings: NotificationSettingsChannels): {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  /** Algum canal externo (push / e-mail / SMS) deve ser tentado. */
  anyExternalChannelEnabled: boolean;
  /** Há preferências persistidas (linha em notification_settings). */
  hasSettingsRow: boolean;
} {
  if (settings == null) {
    return {
      pushEnabled: true,
      emailEnabled: false,
      smsEnabled: false,
      anyExternalChannelEnabled: true,
      hasSettingsRow: false,
    };
  }
  const pushEnabled = settings.push_enabled !== false;
  const emailEnabled = settings.email_enabled === true;
  const smsEnabled = settings.sms_enabled === true;
  return {
    pushEnabled,
    emailEnabled,
    smsEnabled,
    anyExternalChannelEnabled: pushEnabled || emailEnabled || smsEnabled,
    hasSettingsRow: true,
  };
}
