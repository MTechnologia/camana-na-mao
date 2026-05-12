/**
 * HU-10.1 — Catálogo de prioridades e helpers do funil de triagem.
 *
 * Mantém em um lugar só os labels PT-BR, cores e descrições para uso
 * consistente em toda UI (editor, kanban, badges, timeline).
 */

export type TriagePriority = "P0" | "P1" | "P2" | "P3";

export type TriageStatus =
  | "untriaged"
  | "triaged"
  | "in_progress"
  | "resolved"
  | "closed";

export interface TriagePriorityMeta {
  code: TriagePriority;
  label: string;
  shortLabel: string;
  description: string;
  colorClass: string;
  bgClass: string;
  rank: number;
}

export const TRIAGE_PRIORITIES: Record<TriagePriority, TriagePriorityMeta> = {
  P0: {
    code: "P0",
    label: "P0 — Crítica",
    shortLabel: "Crítica",
    description: "Atenção imediata. Risco iminente ou impacto severo em larga escala.",
    colorClass: "text-destructive-foreground",
    bgClass: "bg-destructive",
    rank: 4,
  },
  P1: {
    code: "P1",
    label: "P1 — Alta",
    shortLabel: "Alta",
    description: "Tratar nas próximas 24-48h. Impacto relevante.",
    colorClass: "text-white",
    bgClass: "bg-orange-500",
    rank: 3,
  },
  P2: {
    code: "P2",
    label: "P2 — Média",
    shortLabel: "Média",
    description: "Tratar na semana. Demanda comum.",
    colorClass: "text-amber-900",
    bgClass: "bg-amber-300",
    rank: 2,
  },
  P3: {
    code: "P3",
    label: "P3 — Baixa",
    shortLabel: "Baixa",
    description: "Pode aguardar. Melhoria contínua, baixa urgência.",
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted",
    rank: 1,
  },
};

export const TRIAGE_PRIORITY_ORDER: TriagePriority[] = ["P0", "P1", "P2", "P3"];

export interface TriageStatusMeta {
  code: TriageStatus;
  label: string;
  description: string;
  next?: TriageStatus;
  /** Cor de fundo da coluna do kanban. */
  bgClass: string;
}

export const TRIAGE_STATUSES: Record<TriageStatus, TriageStatusMeta> = {
  untriaged: {
    code: "untriaged",
    label: "A triar",
    description: "Aguardando avaliação inicial pelo gestor.",
    next: "triaged",
    bgClass: "bg-muted/40",
  },
  triaged: {
    code: "triaged",
    label: "Triado",
    description: "Prioridade e responsável definidos; aguardando execução.",
    next: "in_progress",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
  },
  in_progress: {
    code: "in_progress",
    label: "Em andamento",
    description: "Sendo trabalhado pelo responsável.",
    next: "resolved",
    bgClass: "bg-amber-50 dark:bg-amber-950/20",
  },
  resolved: {
    code: "resolved",
    label: "Resolvido",
    description: "Solução aplicada; aguarda fechamento.",
    next: "closed",
    bgClass: "bg-green-50 dark:bg-green-950/20",
  },
  closed: {
    code: "closed",
    label: "Fechado",
    description: "Ciclo concluído.",
    bgClass: "bg-muted/30",
  },
};

export const TRIAGE_STATUS_ORDER: TriageStatus[] = [
  "untriaged",
  "triaged",
  "in_progress",
  "resolved",
  "closed",
];

/** Retorna o número de dias entre `iso` e agora, arredondado. */
export function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Verifica se uma triagem está "estagnada" (sem mudança há N dias). */
export function isStale(updatedAt: string | null, days: number): boolean {
  return daysSince(updatedAt) >= days;
}
