import { supabase } from "@/integrations/supabase/client";
import type {
  AiConfigVersion,
  AiRollbackPolicy,
  ConfigEnvironment,
  PromptTemplateDefinition,
  PromptTemplateVariable,
} from "@/types/systemConfig";

type TemplateRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  body: string;
  variables: PromptTemplateVariable[];
};

type VersionRow = {
  id: string;
  environment: ConfigEnvironment;
  version_label: string;
  status: "draft" | "active" | "archived";
  template_id: string;
  model_id: string;
  body: string;
  variable_keys: string[];
  accuracy_pct: number | null;
  published_at: string | null;
  published_by: string | null;
  ai_prompt_templates: { id: string; name: string; slug: string } | null;
  publisher: { full_name: string | null } | null;
};

type RollbackRow = {
  environment: ConfigEnvironment;
  enabled: boolean;
  max_accuracy_drop_pct: number;
  observation_hours: number;
};

function mapTemplate(row: TemplateRow): PromptTemplateDefinition {
  return {
    id: row.slug,
    name: row.name,
    description: row.description,
    body: row.body,
    variables: Array.isArray(row.variables) ? row.variables : [],
  };
}

function mapVersion(row: VersionRow): AiConfigVersion {
  return {
    id: row.id,
    version: row.version_label,
    status: row.status,
    templateId: row.ai_prompt_templates?.slug ?? row.template_id,
    templateName: row.ai_prompt_templates?.name ?? "—",
    modelId: row.model_id,
    body: row.body,
    variables: row.variable_keys ?? [],
    accuracyPct: row.accuracy_pct != null ? Number(row.accuracy_pct) : null,
    publishedAt: row.published_at,
    publishedBy: row.publisher?.full_name ?? null,
  };
}

export type AiConfigBundle = {
  aiVersions: AiConfigVersion[];
  promptTemplates: PromptTemplateDefinition[];
  rollbackPolicy: AiRollbackPolicy;
};

export async function fetchAiConfigBundle(environment: ConfigEnvironment): Promise<AiConfigBundle> {
  const [templatesRes, versionsRes, policyRes] = await Promise.all([
    supabase.from("ai_prompt_templates").select("*").order("name"),
    supabase
      .from("ai_config_versions")
      .select(
        `
        *,
        ai_prompt_templates ( id, name, slug ),
        publisher:profiles!ai_config_versions_published_by_fkey ( full_name )
      `,
      )
      .eq("environment", environment)
      .order("created_at", { ascending: false }),
    supabase.from("ai_rollback_policies").select("*").eq("environment", environment).maybeSingle(),
  ]);

  if (templatesRes.error) throw templatesRes.error;
  if (versionsRes.error) throw versionsRes.error;
  if (policyRes.error) throw policyRes.error;

  const promptTemplates = (templatesRes.data ?? []).map((row) => mapTemplate(row as TemplateRow));

  const aiVersions = (versionsRes.data ?? []).map((row) => mapVersion(row as VersionRow));

  const policyRow = policyRes.data as RollbackRow | null;
  const rollbackPolicy: AiRollbackPolicy = policyRow
    ? {
        enabled: policyRow.enabled,
        maxAccuracyDropPct: policyRow.max_accuracy_drop_pct,
        observationHours: policyRow.observation_hours,
      }
    : { enabled: true, maxAccuracyDropPct: 3, observationHours: 24 };

  return { aiVersions, promptTemplates, rollbackPolicy };
}

export async function publishAiVersion(versionId: string): Promise<void> {
  const { error } = await supabase.rpc("publish_ai_config_version", { _version_id: versionId });
  if (error) throw error;
}

export async function reactivateAiVersion(versionId: string): Promise<void> {
  const { error } = await supabase.rpc("reactivate_ai_config_version", { _version_id: versionId });
  if (error) throw error;
}

export async function createAiDraft(environment: ConfigEnvironment): Promise<string> {
  const { data, error } = await supabase.rpc("create_ai_config_draft", {
    p_environment: environment,
  });
  if (error) throw error;
  return data as string;
}

export async function saveRollbackPolicy(
  environment: ConfigEnvironment,
  policy: AiRollbackPolicy,
): Promise<void> {
  const { error } = await supabase.rpc("upsert_ai_rollback_policy", {
    p_environment: environment,
    p_enabled: policy.enabled,
    p_max_accuracy_drop_pct: policy.maxAccuracyDropPct,
    p_observation_hours: policy.observationHours,
  });
  if (error) throw error;
}

export async function updatePromptTemplate(
  slug: string,
  patch: Pick<PromptTemplateDefinition, "name" | "description" | "body" | "variables">,
): Promise<void> {
  const { error } = await supabase
    .from("ai_prompt_templates")
    .update({
      name: patch.name,
      description: patch.description,
      body: patch.body,
      variables: patch.variables,
    })
    .eq("slug", slug);
  if (error) throw error;
}

export async function runAiSandboxTest(message: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const supabaseUrl = import.meta.env.CAMARA_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    import.meta.env.CAMARA_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl) throw new Error("URL do Supabase não configurada.");

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-orchestrator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Erro ${response.status} ao chamar o assistente.`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Resposta vazia do assistente.");

  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr) as {
          choices?: { delta?: { content?: string } }[];
        };
        const chunk = parsed.choices?.[0]?.delta?.content;
        if (chunk) text += chunk;
      } catch {
        /* ignora linhas não-JSON */
      }
    }
  }

  const cleaned = text.replace(/\[[A-Z_]+:[^\]]*\]/g, "").trim();
  return cleaned || "Resposta recebida (sem texto visível).";
}
