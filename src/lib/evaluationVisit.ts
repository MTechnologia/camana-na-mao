/** CHB-024: validação de contexto de avaliação por visita. */
export type EvaluationVisitRow = {
  id: string;
  status?: string | null;
  expires_at?: string | null;
  departed_at?: string | null;
  user_id?: string | null;
};

export type EvaluationVisitValidation =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "already_completed" | "invalid_status" };

export function validateEvaluationVisit(
  visit: EvaluationVisitRow | null | undefined,
  now: Date = new Date(),
): EvaluationVisitValidation {
  if (!visit?.id) return { ok: false, reason: "not_found" };

  const status = String(visit.status ?? "").toLowerCase();
  if (status === "completed" || status === "skipped") {
    return { ok: false, reason: "already_completed" };
  }
  if (status && status !== "pending" && status !== "active") {
    return { ok: false, reason: "invalid_status" };
  }

  if (visit.expires_at) {
    const expires = new Date(visit.expires_at);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() < now.getTime()) {
      return { ok: false, reason: "expired" };
    }
  }

  return { ok: true };
}

export function evaluationVisitErrorMessage(
  reason: "not_found" | "expired" | "already_completed" | "invalid_status",
): string {
  switch (reason) {
    case "expired":
      return "O prazo para avaliar esta visita expirou. Você ainda pode usar o modo livre na tela de avaliações.";
    case "already_completed":
      return "Esta visita já foi avaliada ou encerrada.";
    case "invalid_status":
      return "Esta visita não está disponível para avaliação no momento.";
    case "not_found":
    default:
      return "Visita não encontrada ou sem permissão de acesso.";
  }
}
