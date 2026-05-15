import type { AnalyticsTabId } from "@/lib/widgetThemes";

export type ReportsAnalyticsMode = "general" | "demographic";

export const TAB_LABELS: Record<AnalyticsTabId, string> = {
  volume: "Volume",
  eficiencia: "Eficiência",
  diagnostico: "Diagnóstico",
  audiencias: "Audiências",
  territorial: "Territorial",
  drill: "Drill-down",
  cross: "Cruzamentos",
  geral: "Geral",
  sentimento: "Sentimento",
  demografia: "Demografia",
  engajamento: "Engajamento",
  criticidade: "Criticidade",
};

export const TAB_MIN_WIDTH: Record<AnalyticsTabId, string> = {
  volume: "min-w-[80px]",
  eficiencia: "min-w-[100px]",
  diagnostico: "min-w-[100px]",
  audiencias: "min-w-[100px]",
  territorial: "min-w-[100px]",
  drill: "min-w-[100px]",
  cross: "min-w-[110px]",
  geral: "min-w-[80px]",
  sentimento: "min-w-[100px]",
  demografia: "min-w-[100px]",
  engajamento: "min-w-[110px]",
  criticidade: "min-w-[100px]",
};

export const GENERAL_TAB_IDS: AnalyticsTabId[] = [
  "volume",
  "eficiencia",
  "diagnostico",
  "audiencias",
  "territorial",
  "drill",
  "geral",
  "sentimento",
  "engajamento",
  "criticidade",
];

export const DEMOGRAPHIC_TAB_IDS: AnalyticsTabId[] = ["demografia", "cross"];

export const PAGE_COPY: Record<
  ReportsAnalyticsMode,
  { title: string; description: string; defaultTab: AnalyticsTabId }
> = {
  general: {
    title: "Análise de Relatos Gerais",
    description:
      "Volume, eficiência, territorial, sentimento e criticidade — com filtros por período, categoria e região em cada aba.",
    defaultTab: "volume",
  },
  demographic: {
    title: "Análise de Relatos Demográficos",
    description:
      "Recortes por gênero, raça, classe social e faixa etária — cruzamentos e distribuição demográfica dos relatos.",
    defaultTab: "demografia",
  },
};
