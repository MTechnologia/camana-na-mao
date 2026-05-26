import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeAiChatModel } from "../_shared/ai-provider.ts";

export type AiConfigEnvironment = "production" | "homologation";

export type ActiveAiConfigVersion = {
  id: string;
  versionLabel: string;
  environment: AiConfigEnvironment;
  modelId: string;
  institutionalBody: string;
  templateSlug: string;
  templateName: string;
};

type TemplateVariable = {
  key: string;
  label?: string;
  example?: string;
  required?: boolean;
};

type EnvGet = (key: string) => string | undefined;

type LoadActiveAiConfigArgs = {
  supabaseAdmin: SupabaseClient | null;
  envGet?: EnvGet;
  nowMs?: number;
};

const CACHE_TTL_MS = 60_000;

let cached:
  | {
    key: string;
    loadedAt: number;
    config: ActiveAiConfigVersion | null;
  }
  | null = null;

export function resolveAiConfigEnvironment(envGet: EnvGet = Deno.env.get.bind(Deno.env)): AiConfigEnvironment {
  const raw = (envGet("AI_CONFIG_ENVIRONMENT") || "production").trim().toLowerCase();
  if (raw === "homologation" || raw === "hml" || raw === "homolog") {
    return "homologation";
  }
  return "production";
}

/** Substitui {{chave}} pelos exemplos do template (fallback: mantém placeholder). */
export function applyTemplateVariableExamples(
  body: string,
  variables: TemplateVariable[],
): string {
  let result = body;
  for (const variable of variables) {
    const placeholder = `{{${variable.key}}}`;
    const replacement = (variable.example ?? "").trim() || placeholder;
    result = result.split(placeholder).join(replacement);
  }
  return result;
}

/** Injeta bloco institucional versionado antes do prompt operacional do assistente. */
export function buildVersionedSystemPrompt(
  operationalPrompt: string,
  config: ActiveAiConfigVersion,
): string {
  const header =
    `=== CONFIGURAÇÃO INSTITUCIONAL (versão ${config.versionLabel} · ${config.environment}) ===\n` +
    `Template: ${config.templateName}\n` +
    `Modelo configurado: ${config.modelId}\n\n`;
  return `${header}${config.institutionalBody}\n\n=== PROMPT OPERACIONAL DO ASSISTENTE ===\n\n${operationalPrompt}`;
}

export function resolveEffectiveAiChatModel(
  secretModel: string,
  versionModelId?: string | null,
): string {
  const fromVersion = (versionModelId || "").trim();
  if (fromVersion) {
    return normalizeAiChatModel(fromVersion);
  }
  return normalizeAiChatModel(secretModel);
}

export async function loadActiveAiConfigVersion(
  args: LoadActiveAiConfigArgs,
): Promise<ActiveAiConfigVersion | null> {
  const { supabaseAdmin, envGet = Deno.env.get.bind(Deno.env), nowMs = Date.now() } = args;
  const environment = resolveAiConfigEnvironment(envGet);
  const cacheKey = environment;

  if (cached && cached.key === cacheKey && nowMs - cached.loadedAt < CACHE_TTL_MS) {
    return cached.config;
  }

  if (!supabaseAdmin) {
    console.warn(
      "[ai-orchestrator] SUPABASE_SERVICE_ROLE_KEY ausente: versão ativa de IA não carregada (usa prompt/modelo do secret).",
    );
    cached = { key: cacheKey, loadedAt: nowMs, config: null };
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("ai_config_versions")
    .select(`
      id,
      environment,
      version_label,
      model_id,
      body,
      ai_prompt_templates ( slug, name, variables )
    `)
    .eq("environment", environment)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.warn("[ai-orchestrator] Falha ao carregar versão ativa de IA:", error.message);
    cached = { key: cacheKey, loadedAt: nowMs, config: null };
    return null;
  }

  if (!data) {
    console.log(
      `[ai-orchestrator] Nenhuma versão ativa em ai_config_versions para ${environment}.`,
    );
    cached = { key: cacheKey, loadedAt: nowMs, config: null };
    return null;
  }

  const template = data.ai_prompt_templates as {
    slug: string;
    name: string;
    variables: TemplateVariable[];
  } | null;

  const variables = Array.isArray(template?.variables) ? template.variables : [];
  const institutionalBody = applyTemplateVariableExamples(
    String(data.body ?? ""),
    variables,
  );

  const config: ActiveAiConfigVersion = {
    id: String(data.id),
    versionLabel: String(data.version_label),
    environment: environment as AiConfigEnvironment,
    modelId: String(data.model_id ?? "").trim() || normalizeAiChatModel(envGet("AI_CHAT_MODEL")),
    institutionalBody,
    templateSlug: template?.slug ?? "",
    templateName: template?.name ?? "—",
  };

  console.log("[ai-orchestrator] Versão ativa de IA:", {
    environment,
    version: config.versionLabel,
    modelId: config.modelId,
    template: config.templateSlug,
  });

  cached = { key: cacheKey, loadedAt: nowMs, config };
  return config;
}

/** Limpa cache (útil em testes). */
export function clearActiveAiConfigCache(): void {
  cached = null;
}
