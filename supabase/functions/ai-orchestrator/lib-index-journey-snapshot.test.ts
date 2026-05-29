import { assertEquals, assertMatch } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildJourneySnapshotV1,
  isJourneySnapshotMetadataEnabled,
  persistJourneySnapshotMetadata,
} from "./lib-index-journey-snapshot.ts";

Deno.test("buildJourneySnapshotV1 cria snapshot canônico v1", () => {
  const snapshot = buildJourneySnapshotV1("urban_report", {
    category: "lixo",
    description: "acúmulo de lixo na calçada",
    nested: { ok: true, count: 2 },
  });

  assertEquals(snapshot.schema_version, "journey_snapshot.v1");
  assertEquals(snapshot.journey_type, "urban_report");
  assertEquals(snapshot.source, "history+intent");
  assertEquals(snapshot.fields.category, "lixo");
  assertMatch(snapshot.updated_at, /^\d{4}-\d{2}-\d{2}T/);
});

Deno.test("buildJourneySnapshotV1 remove valores não serializáveis", () => {
  const snapshot = buildJourneySnapshotV1("transport_report", {
    line_code: "875A",
    invalid: () => "noop",
    nested: {
      keep: "ok",
      drop: Symbol("x"),
    },
    list: ["a", undefined, 2],
  });

  assertEquals(snapshot.fields.line_code, "875A");
  assertEquals("invalid" in snapshot.fields, false);
  assertEquals(snapshot.fields.nested, { keep: "ok" });
  assertEquals(snapshot.fields.list, ["a", 2]);
});

Deno.test("isJourneySnapshotMetadataEnabled reconhece flag", () => {
  assertEquals(isJourneySnapshotMetadataEnabled(() => "true"), true);
  assertEquals(isJourneySnapshotMetadataEnabled(() => "1"), true);
  assertEquals(isJourneySnapshotMetadataEnabled(() => "false"), false);
});

Deno.test("persistJourneySnapshotMetadata não persiste sem flag", async () => {
  const snapshot = buildJourneySnapshotV1("general", { topic: "camara" });
  const result = await persistJourneySnapshotMetadata({
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    conversationId: "conv-1",
    userId: "user-1",
    snapshot,
    envGet: () => "false",
  });
  assertEquals(result, { persisted: false, reason: "feature_disabled" });
});
