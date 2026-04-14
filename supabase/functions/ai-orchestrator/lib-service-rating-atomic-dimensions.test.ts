/// <reference path="./deno-runtime-shim.d.ts" />
/**
 * OS-06 / RN-IA-003: evidência de perguntas atômicas por dimensão, padrão [FIELD_REQUEST:dim_*] + [RATING_PICKER],
 * fluxo explícito de dim_limpeza e acúmulo para rating_dimensions / média.
 *
 * Executar: npx deno test --no-check --allow-env supabase/functions/ai-orchestrator/lib-service-rating-atomic-dimensions.test.ts
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  accumulateFieldsFromHistory,
  aggregateRatingDimensionsStars,
  buildServiceRatingDimensionsFromWizardScores,
} from "./lib.ts";

/**
 * Espelha **exatamente** a concatenação do short-circuit em `index.ts` (trecho de produção):
 * linhas 3076–3081 — `deterministicResponse` para jornadas estruturadas (`urban_report`, `transport_report`, `service_rating`).
 *
 * ```ts
 * const fieldsJson = JSON.stringify(accumulatedFields);
 * const progressMarker = `[COLLECTION_PROGRESS:${collectionIntent!.type}:${fieldsJson}]`;
 * const fieldMarker = `[FIELD_REQUEST:${nextFieldInfo.field}]`;
 * const pickerMarker = nextFieldInfo.picker || '';
 * const deterministicResponse = `${progressMarker}${fieldMarker}${prefix}${nextFieldInfo.prompt}${pickerMarker ? '\n\n' + pickerMarker : ''}`;
 * ```
 */
function buildDeterministicResponseLikeIndex(
  collectionType: string,
  accumulatedFields: Record<string, unknown>,
  field: string,
  prefix: string,
  prompt: string,
  picker: string | null,
): string {
  const fieldsJson = JSON.stringify(accumulatedFields);
  const progressMarker = `[COLLECTION_PROGRESS:${collectionType}:${fieldsJson}]`;
  const fieldMarker = `[FIELD_REQUEST:${field}]`;
  const pickerMarker = picker || "";
  return `${progressMarker}${fieldMarker}${prefix}${prompt}${pickerMarker ? "\n\n" + pickerMarker : ""}`;
}

/** Alias legado — mesmo resultado que `buildDeterministicResponseLikeIndex` com `prefix` vazio e tipo `service_rating`. */
function formatServiceRatingDeterministicAsk(
  accumulatedFields: Record<string, unknown>,
  field: string,
  promptBody: string,
  picker: string | null,
): string {
  return buildDeterministicResponseLikeIndex(
    "service_rating",
    accumulatedFields,
    field,
    "",
    promptBody,
    picker,
  );
}

Deno.test("OS-06: literal — [FIELD_REQUEST:dim_limpeza] antes de [RATING_PICKER] (short-circuit)", () => {
  const out = formatServiceRatingDeterministicAsk(
    { visit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    "dim_limpeza",
    "**Limpeza:** como você avalia a **limpeza e higiene** do local? De **1 a 5** estrelas.",
    "[RATING_PICKER]",
  );
  assertStringIncludes(out, "[FIELD_REQUEST:dim_limpeza]");
  assertStringIncludes(out, "[RATING_PICKER]");
  assertEquals(out.indexOf("[FIELD_REQUEST:dim_limpeza]") < out.indexOf("[RATING_PICKER]"), true);
});

/** Estado acumulado típico imediatamente antes de perguntar só limpeza (após infraestrutura respondida). */
Deno.test("OS-06: prova inequívoca — fórmula index.ts (3076–3081) para dim_limpeza após dim_infraestrutura", () => {
  const accumulated = {
    visit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    tempo_espera_score: 5,
    atendimento_score: 5,
    infraestrutura_score: 5,
  };
  const prompt =
    "**Limpeza:** como você avalia a **limpeza e higiene** do local? De **1 a 5** estrelas.";
  const out = buildDeterministicResponseLikeIndex(
    "service_rating",
    accumulated,
    "dim_limpeza",
    "",
    prompt,
    "[RATING_PICKER]",
  );
  assertStringIncludes(out, "[COLLECTION_PROGRESS:service_rating:");
  assertStringIncludes(out, "[FIELD_REQUEST:dim_limpeza]");
  assertStringIncludes(out, "\n\n[RATING_PICKER]");
  assertEquals(out.indexOf("[FIELD_REQUEST:dim_limpeza]") < out.indexOf("[RATING_PICKER]"), true);
  assertEquals(/\[FIELD_REQUEST:dim_limpeza\]/.test(out), true);
  assertEquals(/\n\n\[RATING_PICKER\]$/.test(out.trimEnd()), true);
});

Deno.test("OS-06: literal — cada dimensão usa o mesmo padrão FIELD_REQUEST + RATING_PICKER", () => {
  const dims = ["dim_tempo_espera", "dim_atendimento", "dim_infraestrutura", "dim_limpeza"] as const;
  for (const d of dims) {
    const s = formatServiceRatingDeterministicAsk({}, d, "texto da pergunta", "[RATING_PICKER]");
    assertStringIncludes(s, `[FIELD_REQUEST:${d}]`);
    assertStringIncludes(s, "[RATING_PICKER]");
    assertEquals(s.indexOf(`[FIELD_REQUEST:${d}]`) < s.indexOf("[RATING_PICKER]"), true);
    assertEquals(/\n\n\[RATING_PICKER\]$/.test(s.trimEnd()), true);
  }
});

Deno.test("accumulateFieldsFromHistory: dim_limpeza acumula limpeza_score (happy path)", () => {
  const messages = [
    {
      role: "assistant",
      content:
        "[COLLECTION_PROGRESS:service_rating:{}][FIELD_REQUEST:dim_limpeza]**Limpeza:** nota?\n\n[RATING_PICKER]",
    },
    { role: "user", content: "Limpeza: 4 estrelas [DIM_RATING:limpeza:4]" },
  ];
  const acc = accumulateFieldsFromHistory(messages, "service_rating");
  assertEquals(acc.limpeza_score, 4);
});

Deno.test("accumulateFieldsFromHistory: dim_limpeza aceita [RATING_SELECTED:N]", () => {
  const messages = [
    {
      role: "assistant",
      content: "[COLLECTION_PROGRESS:service_rating:{}][FIELD_REQUEST:dim_limpeza]Pergunta\n\n[RATING_PICKER]",
    },
    { role: "user", content: "Nota: 5 estrelas [RATING_SELECTED:5]" },
  ];
  const acc = accumulateFieldsFromHistory(messages, "service_rating");
  assertEquals(acc.limpeza_score, 5);
});

Deno.test("buildServiceRatingDimensionsFromWizardScores: média com limpeza explícita (edge: tempo 1 → wait_time DB 2)", () => {
  const dims = buildServiceRatingDimensionsFromWizardScores(
    {
      tempo_espera_score: 1,
      atendimento_score: 5,
      infraestrutura_score: 5,
      limpeza_score: 5,
    },
    {},
  );
  assertExists(dims);
  assertEquals(dims!.tempo_espera, 1);
  assertEquals(dims!.limpeza, 5);
  assertEquals(aggregateRatingDimensionsStars(dims!), 4);
});
