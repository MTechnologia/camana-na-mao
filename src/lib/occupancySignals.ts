/**
 * Regras de exibição do indicador de movimentação para o munícipe.
 * Mantidas centralizadas para facilitar ajustes de produto sem mexer na UI.
 */

export const OCCUPANCY_WINDOW_MINUTES = 120;
export const MIN_OCCUPANCY_SAMPLE_USERS = 3;

/** Rótulo curto para transparência e auditoria (indicador munícipe). */
export const OCCUPANCY_SOURCE_SHORT = "Visitas detectadas no app";

export type OccupancyLevel = "baixa" | "media" | "alta";

export function getOccupancyLevel(usersCount: number): OccupancyLevel {
  if (usersCount >= 20) return "alta";
  if (usersCount >= 8) return "media";
  return "baixa";
}

export function getOccupancyBadgeMeta(level: OccupancyLevel): { label: string; className: string } {
  if (level === "alta") {
    return {
      label: "Movimentação alta",
      className: "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300",
    };
  }
  if (level === "media") {
    return {
      label: "Movimentação média",
      className: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    };
  }
  return {
    label: "Movimentação baixa",
    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  };
}

export function getOccupancyCoverageMeta(usersCount: number): { label: string; className: string } {
  if (usersCount >= 20) {
    return {
      label: "Cobertura alta",
      className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    };
  }
  if (usersCount >= 8) {
    return {
      label: "Cobertura média",
      className: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    };
  }
  return {
    label: "Cobertura baixa",
    className: "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  };
}
