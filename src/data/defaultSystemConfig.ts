import type { ConfigEnvironment, EnvironmentConfigBundle } from "@/types/systemConfig";

/** Parâmetros e integrações ainda sem tabela dedicada; IA vem do Supabase (useAiConfig). */
const emptyAiBundle = {
  promptTemplates: [],
  rollbackPolicy: { enabled: true, maxAccuracyDropPct: 3, observationHours: 24 },
  aiVersions: [],
} satisfies Pick<EnvironmentConfigBundle, "promptTemplates" | "rollbackPolicy" | "aiVersions">;

const production: EnvironmentConfigBundle = {
  ...emptyAiBundle,
  parameters: [
    {
      key: "rating.cooldown_hours",
      label: "Intervalo entre avaliações",
      value: 48,
      type: "number",
      scope: "global",
      description: "Horas mínimas entre duas avaliações do mesmo cidadão no mesmo serviço.",
    },
    {
      key: "rating.daily_limit",
      label: "Limite diário de avaliações",
      value: 1,
      type: "number",
      scope: "global",
      description: "Máximo de avaliações por cidadão por dia.",
    },
    {
      key: "reports.auto_classify",
      label: "Classificação automática de relatos",
      value: true,
      type: "boolean",
      scope: "global",
      description: "Ativa sugestão de categoria via IA antes da triagem humana.",
    },
    {
      key: "notifications.digest_hour",
      label: "Hora do resumo diário",
      value: "08:00",
      type: "string",
      scope: "global",
      description: "Horário de envio do digest para gestores (fuso America/Sao_Paulo).",
    },
  ],
  integrations: [
    {
      id: "int-1",
      slug: "ai-orchestrator",
      displayName: "Orquestrador de IA",
      source: "catalog",
      baseUrl: "/functions/v1/ai-orchestrator",
      enabled: true,
      rateLimitPerMinute: 120,
      timeoutMs: 30000,
      healthStatus: "up",
      lastCheckedAt: "2026-05-18T16:30:00Z",
    },
    {
      id: "int-2",
      slug: "fetch-vereadores",
      displayName: "Vereadores (portal CMSP)",
      source: "catalog",
      baseUrl: "/functions/v1/fetch-vereadores",
      enabled: true,
      rateLimitPerMinute: 60,
      timeoutMs: 15000,
      healthStatus: "up",
      lastCheckedAt: "2026-05-18T16:28:00Z",
    },
    {
      id: "int-3",
      slug: "legado-relatorios",
      displayName: "API legada — relatórios internos",
      source: "custom",
      baseUrl: "https://homolog.interno.camara.sp.gov.br/api/relatorios/v2",
      enabled: false,
      rateLimitPerMinute: 30,
      timeoutMs: 20000,
      healthStatus: "degraded",
      lastCheckedAt: "2026-05-18T15:00:00Z",
    },
  ],
};

const homologation: EnvironmentConfigBundle = {
  ...production,
  integrations: production.integrations.map((i) =>
    i.source === "custom"
      ? {
          ...i,
          baseUrl: "https://homolog.interno.camara.sp.gov.br/api/relatorios/v2",
          enabled: true,
          healthStatus: "up" as const,
        }
      : i,
  ),
};

/** Fallback local para parâmetros/integrações; IA é carregada de ai_* no Supabase. */
export const defaultConfigByEnvironment: Record<ConfigEnvironment, EnvironmentConfigBundle> = {
  production,
  homologation,
};
