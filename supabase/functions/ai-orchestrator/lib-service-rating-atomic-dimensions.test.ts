/// <reference path="./deno-runtime-shim.d.ts" />
/**
 * OS-06 / RN-IA-003: fluxo único [FIELD_REQUEST:rating_dimensions] + [MULTI_DIMENSION_RATING_PICKER],
 * acúmulo a partir de [RATING_DIMENSIONS:{...}] e paridade com scores.
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
  shouldOfferServiceRatingReferral,
} from "./lib.ts";

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

Deno.test("OS-06: literal — [FIELD_REQUEST:rating_dimensions] antes de [MULTI_DIMENSION_RATING_PICKER]", () => {
  const out = formatServiceRatingDeterministicAsk(
    { visit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    "rating_dimensions",
    "**Avalie em quatro aspectos** (1 a 5 estrelas cada).",
    "[MULTI_DIMENSION_RATING_PICKER]",
  );
  assertStringIncludes(out, "[FIELD_REQUEST:rating_dimensions]");
  assertStringIncludes(out, "[MULTI_DIMENSION_RATING_PICKER]");
  assertEquals(
    out.indexOf("[FIELD_REQUEST:rating_dimensions]") < out.indexOf("[MULTI_DIMENSION_RATING_PICKER]"),
    true,
  );
});

Deno.test("OS-06: prova inequívoca — fórmula index.ts para rating_dimensions após endereço", () => {
  const accumulated = {
    visit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    service_type: "ubs",
    service_name: "UBS X",
  };
  const prompt = "**Avalie em quatro aspectos** (1 a 5 estrelas cada).";
  const out = buildDeterministicResponseLikeIndex(
    "service_rating",
    accumulated,
    "rating_dimensions",
    "",
    prompt,
    "[MULTI_DIMENSION_RATING_PICKER]",
  );
  assertStringIncludes(out, "[COLLECTION_PROGRESS:service_rating:");
  assertStringIncludes(out, "[FIELD_REQUEST:rating_dimensions]");
  assertStringIncludes(out, "\n\n[MULTI_DIMENSION_RATING_PICKER]");
  assertEquals(/\n\n\[MULTI_DIMENSION_RATING_PICKER\]$/.test(out.trimEnd()), true);
});

Deno.test("accumulateFieldsFromHistory: [RATING_DIMENSIONS:…] preenche os quatro *_score e wait_time_score", () => {
  const json =
    '{"atendimento":4,"limpeza":5,"infraestrutura":3,"tempo_espera":2}';
  const messages = [
    {
      role: "user",
      content: `Avaliação por dimensões [RATING_DIMENSIONS:${json}]`,
    },
  ];
  const acc = accumulateFieldsFromHistory(messages, "service_rating");
  assertEquals(acc.atendimento_score, 4);
  assertEquals(acc.limpeza_score, 5);
  assertEquals(acc.infraestrutura_score, 3);
  assertEquals(acc.tempo_espera_score, 2);
  assertEquals(acc.wait_time_score, 2);
  assertExists(acc.rating_dimensions);
});

Deno.test("accumulateFieldsFromHistory: FIELD_REQUEST rating_dimensions + marcador na resposta", () => {
  const json =
    '{"atendimento":5,"limpeza":5,"infraestrutura":5,"tempo_espera":1}';
  const messages = [
    {
      role: "assistant",
      content:
        `[COLLECTION_PROGRESS:service_rating:{}][FIELD_REQUEST:rating_dimensions]Pergunta\n\n[MULTI_DIMENSION_RATING_PICKER]`,
    },
    {
      role: "user",
      content: `Notas [RATING_DIMENSIONS:${json}]`,
    },
  ];
  const acc = accumulateFieldsFromHistory(messages, "service_rating");
  assertEquals(acc.tempo_espera_score, 1);
  assertEquals(acc.wait_time_score, 2);
  assertEquals(aggregateRatingDimensionsStars(acc.rating_dimensions as Record<string, number>), 4);
});

Deno.test("shouldOfferServiceRatingReferral: média 1 ou dimensão ≤2", () => {
  assertEquals(shouldOfferServiceRatingReferral(1, { atendimento: 1, limpeza: 2, infraestrutura: 1, tempo_espera: 1 }), true);
  assertEquals(shouldOfferServiceRatingReferral(3, { atendimento: 5, limpeza: 5, infraestrutura: 5, tempo_espera: 2 }), true);
  assertEquals(shouldOfferServiceRatingReferral(4, { atendimento: 4, limpeza: 4, infraestrutura: 4, tempo_espera: 4 }), false);
});

/** Pré-resumo real: JSON aninhado em COLLECTION_PROGRESS + substring enganosa no JSON. */
Deno.test("accumulateFieldsFromHistory: após preview, publicar não apaga rating_text nem cai em rating_text falso", () => {
  const progressPayload = {
    visit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    service_type: "ubs",
    service_name: "Ubs Butantã",
    rating_dimensions: { atendimento: 1, limpeza: 2, infraestrutura: 1, tempo_espera: 2 },
    rating_text: "Apenas teste para a task 1.3",
    description: 'Echo [FIELD_REQUEST:rating_text] dentro do JSON',
  };
  const previewAssistant =
    `[COLLECTION_PROGRESS:service_rating:${JSON.stringify(progressPayload)}]` +
    `[RATING_SUBMIT_PREVIEW]**Resumo**\n\nConfirme.\n\n[QUICK_REPLY:publicar,editar_comentario]`;
  const messages = [
    { role: "assistant", content: "[FIELD_REQUEST:rating_text]Comentário?" },
    { role: "user", content: "Apenas teste para a task 1.3" },
    { role: "assistant", content: previewAssistant },
    { role: "user", content: "publicar" },
  ];
  const acc = accumulateFieldsFromHistory(messages, "service_rating");
  assertEquals(acc.rating_text, "Apenas teste para a task 1.3");
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
