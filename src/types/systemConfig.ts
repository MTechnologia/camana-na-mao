export type ConfigEnvironment = "production" | "homologation";

export type AiVersionStatus = "draft" | "active" | "archived";

export type PromptTemplateVariable = {
  key: string;
  label: string;
  example: string;
  required: boolean;
};

export type AiConfigVersion = {
  id: string;
  version: string;
  status: AiVersionStatus;
  templateId: string;
  templateName: string;
  modelId: string;
  body: string;
  variables: string[];
  accuracyPct: number | null;
  publishedAt: string | null;
  publishedBy: string | null;
};

export type AiRollbackPolicy = {
  enabled: boolean;
  /** Queda máxima permitida vs. versão anterior (pontos percentuais) */
  maxAccuracyDropPct: number;
  /** Janela de observação após publicação (horas) */
  observationHours: number;
};

export type SystemParameter = {
  key: string;
  label: string;
  value: string | number | boolean;
  type: "string" | "number" | "boolean";
  scope: "global" | "region" | "category";
  description: string;
};

export type ApiIntegrationSource = "catalog" | "custom";

export type ApiHealthStatus = "up" | "degraded" | "down" | "unknown";

export type ApiIntegration = {
  id: string;
  slug: string;
  displayName: string;
  source: ApiIntegrationSource;
  baseUrl: string;
  enabled: boolean;
  rateLimitPerMinute: number;
  timeoutMs: number;
  healthStatus: ApiHealthStatus;
  lastCheckedAt: string | null;
};

export type EnvironmentConfigBundle = {
  aiVersions: AiConfigVersion[];
  rollbackPolicy: AiRollbackPolicy;
  parameters: SystemParameter[];
  integrations: ApiIntegration[];
  promptTemplates: PromptTemplateDefinition[];
};

export type PromptTemplateDefinition = {
  id: string;
  name: string;
  description: string;
  body: string;
  variables: PromptTemplateVariable[];
};
