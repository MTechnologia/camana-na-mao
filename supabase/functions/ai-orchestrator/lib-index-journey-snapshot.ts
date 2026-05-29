import type { CollectionIntent } from "./lib.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type JourneySnapshotV1 = {
  schema_version: "journey_snapshot.v1";
  journey_type: CollectionIntent["type"];
  fields: Record<string, unknown>;
  updated_at: string;
  source: "history+intent";
};

function toSerializableValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => toSerializableValue(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const normalized = toSerializableValue(v);
      if (normalized !== undefined) out[k] = normalized;
    }
    return out;
  }
  return undefined;
}

export function buildJourneySnapshotV1(
  journeyType: CollectionIntent["type"],
  fields: Record<string, unknown>,
): JourneySnapshotV1 {
  const normalizedFields = toSerializableValue(fields);
  return {
    schema_version: "journey_snapshot.v1",
    journey_type: journeyType,
    fields: normalizedFields && typeof normalizedFields === "object"
      ? (normalizedFields as Record<string, unknown>)
      : {},
    updated_at: new Date().toISOString(),
    source: "history+intent",
  };
}

export function isJourneySnapshotMetadataEnabled(envGet: (key: string) => string | undefined = Deno.env.get.bind(Deno.env)): boolean {
  const raw = String(envGet("AI_ENABLE_JOURNEY_SNAPSHOT_METADATA") ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export async function persistJourneySnapshotMetadata(args: {
  supabase: SupabaseClient;
  conversationId?: string;
  userId: string;
  snapshot: JourneySnapshotV1 | null;
  envGet?: (key: string) => string | undefined;
}): Promise<{ persisted: boolean; reason?: string }> {
  const { supabase, conversationId, userId, snapshot, envGet = Deno.env.get.bind(Deno.env) } = args;
  if (!snapshot) return { persisted: false, reason: "missing_snapshot" };
  if (!conversationId) return { persisted: false, reason: "missing_conversation_id" };
  if (!isJourneySnapshotMetadataEnabled(envGet)) return { persisted: false, reason: "feature_disabled" };

  try {
    const { data: current, error: selectError } = await supabase
      .from("ai_conversations")
      .select("metadata")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (selectError) {
      console.warn("[ai-orchestrator] Journey snapshot metadata select failed:", selectError);
      return { persisted: false, reason: "select_failed" };
    }
    const metadataBase = current && typeof current.metadata === "object" && current.metadata !== null
      ? (current.metadata as Record<string, unknown>)
      : {};
    const nextMetadata = {
      ...metadataBase,
      journey_snapshot: snapshot,
    };

    const { error: updateError } = await supabase
      .from("ai_conversations")
      .update({ metadata: nextMetadata })
      .eq("id", conversationId)
      .eq("user_id", userId);
    if (updateError) {
      console.warn("[ai-orchestrator] Journey snapshot metadata update failed:", updateError);
      return { persisted: false, reason: "update_failed" };
    }
    return { persisted: true };
  } catch (error) {
    console.warn("[ai-orchestrator] Journey snapshot metadata persist failed:", error);
    return { persisted: false, reason: "exception" };
  }
}
