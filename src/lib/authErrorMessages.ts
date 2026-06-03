/** Mensagens de erro do Supabase Auth em português. */

export function getAuthErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null) {
    const o = e as { message?: unknown; msg?: unknown };
    if (typeof o.message === "string" && o.message) return o.message;
    if (typeof o.msg === "string" && o.msg) return o.msg;
  }
  return "";
}

export function getAuthErrorCode(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function translateAuthError(message: string, code?: string): string {
  if (code === "same_password") {
    return "A nova senha deve ser diferente da senha atual.";
  }

  const translations: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos",
    "Email not confirmed": "E-mail não confirmado. Verifique sua caixa de entrada",
    "Email confirmation pending": "Confirme seu e-mail antes de acessar o app",
    "User already registered": "Este e-mail já está cadastrado",
    "Password should be at least 6 characters": "A senha deve ter no mínimo 6 caracteres",
    "Invalid email": "E-mail inválido",
    "Email rate limit exceeded":
      "Limite de e-mails excedido. Aguarde cerca de 1 hora para tentar de novo",
    "Signup requires a valid password": "Senha inválida",
    "Unable to validate email address": "Não foi possível validar o e-mail",
    signup_disabled: "Cadastro desabilitado pelo administrador",
    email_exists: "Este e-mail já está cadastrado",
    "New password should be different from the old password.":
      "A nova senha deve ser diferente da senha atual.",
  };

  const normalized = message.trim();
  if (translations[normalized]) return translations[normalized];

  const lower = normalized.toLowerCase();
  if (lower.includes("password should contain at least one character of each")) {
    return "A senha deve ter pelo menos 8 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial.";
  }
  if (lower.includes("different from the old password") || lower.includes("same password")) {
    return "A nova senha deve ser diferente da senha atual.";
  }
  if (lower.includes("email rate limit") || lower.includes("rate limit exceeded")) {
    return "Limite de e-mails excedido. Aguarde cerca de 1 hora para tentar de novo";
  }
  if (
    lower.includes("unexpected status code returned from hook") ||
    (lower.includes("hook") &&
      (normalized.includes("502") || normalized.includes("500") || normalized.includes("503")))
  ) {
    return "Não foi possível enviar o e-mail de recuperação (serviço de envio indisponível ou remetente não validado). Tente de novo em alguns minutos ou fale com o suporte.";
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("network error") ||
    lower.includes("load failed") ||
    lower.includes("connection timed out") ||
    lower.includes("err_connection") ||
    lower.includes("auth_session_timeout") ||
    code === "AUTH_NETWORK_UNAVAILABLE"
  ) {
    return "Não foi possível conectar ao servidor de autenticação. Verifique sua internet, VPN ou firewall e tente novamente em alguns minutos.";
  }

  return message;
}

export function formatAuthErrorForUser(error: unknown, fallback = "Erro"): string {
  const translated = translateAuthError(getAuthErrorMessage(error), getAuthErrorCode(error));
  return translated.trim() || fallback;
}
