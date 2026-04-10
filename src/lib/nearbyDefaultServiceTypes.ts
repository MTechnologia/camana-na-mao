import type { ServiceTypeFilterValue } from "@/components/evaluation/ServiceTypeFilter";

/** Tipos pré-selecionados em "Perto de você" para consulta mais leve (RPC com filtro de tipo). */
export const NEARBY_DEFAULT_SERVICE_TYPES: readonly ServiceTypeFilterValue[] = [
  "ubs",
  "ceu",
  "library",
  "sports_center",
  "park",
  "theater",
];
