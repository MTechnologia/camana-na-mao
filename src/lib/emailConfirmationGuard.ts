const PENDING_EMAIL_CONFIRMATION_KEY = "camara:pending-email-confirmation";

type PendingEmailConfirmationReason = "awaiting_email" | "supabase_auto_confirmed";

interface PendingEmailConfirmation {
  email: string;
  reason: PendingEmailConfirmationReason;
  createdAt: string;
}

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() ?? "";

const readPendingEmailConfirmation = (): PendingEmailConfirmation | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PENDING_EMAIL_CONFIRMATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingEmailConfirmation;
    if (!parsed.email || !parsed.reason) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const markEmailConfirmationPending = (
  email: string,
  reason: PendingEmailConfirmationReason,
) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    PENDING_EMAIL_CONFIRMATION_KEY,
    JSON.stringify({
      email: normalizeEmail(email),
      reason,
      createdAt: new Date().toISOString(),
    }),
  );
};

export const clearEmailConfirmationPending = (email?: string | null) => {
  if (typeof window === "undefined") return;

  const pending = readPendingEmailConfirmation();
  if (email && pending?.email !== normalizeEmail(email)) return;

  window.localStorage.removeItem(PENDING_EMAIL_CONFIRMATION_KEY);
};

export const isAutoConfirmedEmailPending = (email?: string | null) => {
  const pending = readPendingEmailConfirmation();
  return (
    Boolean(email) &&
    pending?.email === normalizeEmail(email) &&
    pending.reason === "supabase_auto_confirmed"
  );
};

export const hasEmailConfirmationCallback = () => {
  if (typeof window === "undefined") return false;

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return (
    searchParams.has("code") ||
    searchParams.get("type") === "signup" ||
    hashParams.has("access_token") ||
    hashParams.get("type") === "signup"
  );
};
