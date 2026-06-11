/**
 * Testes unitários para autoClassifyCategory() e classify_report_category (via executeTool).
 * Executar: npx deno test --no-check --allow-env --allow-net supabase/functions/ai-orchestrator/lib-classify.test.ts
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { autoClassifyCategory, executeTool } from "./lib.ts";
import { normalizeUrbanCategoryAlias } from "./lib-urban-rules.ts";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
const mockSupabase = {} as any;

/** Extrai e parseia o JSON do progress marker embutido na mensagem. */
function extractProgressMarker(message: string): Record<string, unknown> | null {
  const match = message.match(/\[COLLECTION_PROGRESS:urban_report:(.+?)\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ═════════════════════════════════════════════════════════
// Part 1 — autoClassifyCategory
// ═════════════════════════════════════════════════════════

// ─── Grupo A: alta confiança (weight ≥ 9 → confidence ≥ 0.9) ────────────────

Deno.test("A1: 'poste apagado' → iluminacao, confidence 0.9, label 'Poste Apagado'", () => {
  const r = autoClassifyCategory("poste apagado");
  assertEquals(r.category, "iluminacao");
  assertEquals(r.confidence, 0.9);
  assertEquals(r.suggestedLabel, "Poste Apagado");
});

Deno.test("A2: 'sem luz na rua' → iluminacao, confidence 0.9, label 'Falta de Iluminação'", () => {
  const r = autoClassifyCategory("sem luz na rua");
  assertEquals(r.category, "iluminacao");
  assertEquals(r.confidence, 0.9);
  assertEquals(r.suggestedLabel, "Falta de Iluminação");
});

Deno.test("A3: 'bar com som alto' → poluicao, confidence 0.9, label 'Perturbação Sonora' (som alto bate antes de bar no labelPatterns)", () => {
  const r = autoClassifyCategory("bar com som alto");
  assertEquals(r.category, "poluicao");
  assertEquals(r.confidence, 0.9);
  // 'som alto' aparece antes de 'bar' em labelPatterns → label é 'Perturbação Sonora'
  assertEquals(r.suggestedLabel, "Perturbação Sonora");
});

Deno.test("A3b: 'balada barulhenta' → poluicao, label 'Estabelecimento Barulhento'", () => {
  const r = autoClassifyCategory("balada barulhenta");
  assertEquals(r.category, "poluicao");
  // 'balada' não tem som alto → cai no pattern de bar/balada
  assertEquals(r.suggestedLabel, "Estabelecimento Barulhento");
});

Deno.test("A4: 'alagamento na esquina' → esgoto, confidence 1.0, label 'Alagamento'", () => {
  const r = autoClassifyCategory("alagamento na esquina");
  assertEquals(r.category, "esgoto");
  assertEquals(r.confidence, 1.0);
  assertEquals(r.suggestedLabel, "Alagamento");
});

Deno.test("A5: 'vazamento de água' → esgoto, confidence 1.0, label 'Vazamento de Água'", () => {
  const r = autoClassifyCategory("vazamento de água");
  assertEquals(r.category, "esgoto");
  assertEquals(r.confidence, 1.0);
  assertEquals(r.suggestedLabel, "Vazamento de Água");
});

// ─── Grupo B: confiança média (weight 7–8.6) + suggestedLabel ────────────────

Deno.test("B1: 'buraco na rua' → via_publica, confidence 0.8, label 'Buraco na Via'", () => {
  const r = autoClassifyCategory("buraco na rua");
  assertEquals(r.category, "via_publica");
  assertEquals(r.confidence, 0.8);
  assertEquals(r.suggestedLabel, "Buraco na Via");
});

Deno.test("B2: 'calçada quebrada' → calcada, confidence 0.8, label 'Calçada Danificada'", () => {
  const r = autoClassifyCategory("calçada quebrada");
  assertEquals(r.category, "calcada");
  assertEquals(r.confidence, 0.8);
  assertEquals(r.suggestedLabel, "Calçada Danificada");
});

Deno.test("B3: 'árvore caída' → area_verde, confidence 0.8, label 'Árvore com Risco'", () => {
  const r = autoClassifyCategory("árvore caída");
  assertEquals(r.category, "area_verde");
  assertEquals(r.confidence, 0.8);
  assertEquals(r.suggestedLabel, "Árvore com Risco");
});

Deno.test("B4: 'lixo acumulado na rua' → lixo, confidence 0.7", () => {
  // 'lixo acumulado na calçada' seria capturado por calcada (weight 8) antes de lixo (weight 7)
  const r = autoClassifyCategory("lixo acumulado na rua");
  assertEquals(r.category, "lixo");
  assertEquals(r.confidence, 0.7);
});

Deno.test("B5: 'fedor forte no beco' → higiene_urbana, confidence 0.7, label 'Mau Cheiro'", () => {
  const r = autoClassifyCategory("fedor forte no beco");
  assertEquals(r.category, "higiene_urbana");
  assertEquals(r.confidence, 0.7);
  assertEquals(r.suggestedLabel, "Mau Cheiro");
});

Deno.test("B6: 'rato na cozinha' → animais, confidence 0.8, label 'Infestação de Ratos'", () => {
  const r = autoClassifyCategory("rato na cozinha");
  assertEquals(r.category, "animais");
  assertEquals(r.confidence, 0.8);
  assertEquals(r.suggestedLabel, "Infestação de Ratos");
});

Deno.test("B7: 'pavimentação esburacada' → pavimentacao, confidence 8.6/10, label null (sem padrão de label)", () => {
  const r = autoClassifyCategory("pavimentação esburacada");
  assertEquals(r.category, "pavimentacao");
  assertEquals(r.confidence, 8.6 / 10);
  // pavimentacao não tem padrão em labelPatterns → null
  assertEquals(r.suggestedLabel, null);
});

Deno.test("B8: 'semáforo quebrado' → sinalizacao, confidence 8.5/10, label 'Semáforo com Defeito'", () => {
  const r = autoClassifyCategory("semáforo quebrado");
  assertEquals(r.category, "sinalizacao");
  assertEquals(r.confidence, 8.5 / 10);
  assertEquals(r.suggestedLabel, "Semáforo com Defeito");
});

Deno.test("B9: 'drenagem entupida' → drenagem, confidence 8.5/10, label null (sem padrão de label)", () => {
  const r = autoClassifyCategory("drenagem entupida");
  assertEquals(r.category, "drenagem");
  assertEquals(r.confidence, 8.5 / 10);
  // drenagem não tem padrão em labelPatterns → null
  assertEquals(r.suggestedLabel, null);
});

// ─── Grupo C: baixa confiança / fallback ──────────────────────────────────────

Deno.test("C1: 'barulho no bairro' → poluicao, confidence 0.7 (padrão sonora weight 7)", () => {
  // 'barulho na madrugada' bate no padrão weight 9
  // 'barulho no bairro' bate no padrão sonora genérico weight 7
  const r = autoClassifyCategory("barulho no bairro");
  assertEquals(r.category, "poluicao");
  assertEquals(r.confidence, 0.7);
});

Deno.test("P1: 'poluição sonora do vizinho' → poluicao, label Perturbação Sonora", () => {
  const r = autoClassifyCategory("poluição sonora do vizinho");
  assertEquals(r.category, "poluicao");
  assertEquals(r.suggestedLabel, "Perturbação Sonora");
});

Deno.test("P2: 'fumaça tóxica da fábrica poluição do ar' → poluicao, label Poluição Atmosférica ou Ambiental", () => {
  const r = autoClassifyCategory("fumaça tóxica da fábrica poluição do ar");
  assertEquals(r.category, "poluicao");
  assertEquals(r.suggestedLabel, "Poluição Atmosférica");
});

Deno.test("P3: 'poluição atmosférica industrial' → poluicao, label Poluição Ambiental", () => {
  const r = autoClassifyCategory("poluição atmosférica industrial");
  assertEquals(r.category, "poluicao");
  assertEquals(r.suggestedLabel, "Poluição Ambiental");
});

Deno.test("C2: 'situação irregular no bairro' → outro, confidence 0.2", () => {
  const r = autoClassifyCategory("situação irregular no bairro");
  assertEquals(r.category, "outro");
  assertEquals(r.confidence, 0.2);
});

Deno.test("C3: 'vereador proposta de lei' → feedback_camara, confidence 0.5", () => {
  const r = autoClassifyCategory("vereador proposta de lei");
  assertEquals(r.category, "feedback_camara");
  assertEquals(r.confidence, 0.5);
});

// ─── Grupo D: sem match → null ───────────────────────────────────────────────

Deno.test("D1: string vazia → null, confidence 0, suggestedLabel null", () => {
  const r = autoClassifyCategory("");
  assertEquals(r.category, null);
  assertEquals(r.confidence, 0);
  assertEquals(r.suggestedLabel, null);
});

Deno.test("D2: 'bom dia' → null, confidence 0", () => {
  const r = autoClassifyCategory("bom dia");
  assertEquals(r.category, null);
  assertEquals(r.confidence, 0);
});

Deno.test("D3: 'oi tudo bem' → null, confidence 0", () => {
  const r = autoClassifyCategory("oi tudo bem");
  assertEquals(r.category, null);
  assertEquals(r.confidence, 0);
});

// ─── Grupo E: ambiguidade — peso maior ganha ──────────────────────────────────

Deno.test("E1: 'bueiro entupido causando alagamento' → esgoto (weight 10 > weight 8)", () => {
  const r = autoClassifyCategory("bueiro entupido causando alagamento");
  assertEquals(r.category, "esgoto");
});

Deno.test("E2: 'rua com lixo e fedor' → lixo (empate weight 7: score > bestMatch.score é strict, primeiro na lista ganha)", () => {
  const r = autoClassifyCategory("rua com lixo e fedor");
  assertEquals(r.category, "lixo");
});

// ─── Grupo F: suggestedLabel correto ─────────────────────────────────────────

Deno.test("F1: 'escorpião no quintal' → suggestedLabel 'Escorpiões'", () => {
  const r = autoClassifyCategory("escorpião no quintal");
  assertEquals(r.suggestedLabel, "Escorpiões");
});

Deno.test("F2: 'mato alto na praça' → suggestedLabel 'Mato Alto'", () => {
  const r = autoClassifyCategory("mato alto na praça");
  assertEquals(r.suggestedLabel, "Mato Alto");
});

Deno.test("F3: 'rampa de acessibilidade quebrada' → suggestedLabel 'Problema de Acessibilidade'", () => {
  const r = autoClassifyCategory("rampa de acessibilidade quebrada");
  assertEquals(r.suggestedLabel, "Problema de Acessibilidade");
});

// ─── Grupo L: case insensitivity ─────────────────────────────────────────────

Deno.test("L1: 'BURACO NA RUA' maiúsculas → via_publica (toLowerCase normaliza)", () => {
  const r = autoClassifyCategory("BURACO NA RUA");
  assertEquals(r.category, "via_publica");
  assertEquals(r.confidence, 0.8);
});

Deno.test("L2: 'POSTE APAGADO' maiúsculas → iluminacao, label 'Poste Apagado'", () => {
  const r = autoClassifyCategory("POSTE APAGADO");
  assertEquals(r.category, "iluminacao");
  assertEquals(r.confidence, 0.9);
  assertEquals(r.suggestedLabel, "Poste Apagado");
});

Deno.test("L3: 'Árvore Caída' mixed case → area_verde", () => {
  const r = autoClassifyCategory("Árvore Caída");
  assertEquals(r.category, "area_verde");
});

// ═════════════════════════════════════════════════════════
// Part 2 — classify_report_category via executeTool
// ═════════════════════════════════════════════════════════

// ─── Grupo G: categoria inválida ─────────────────────────────────────────────

Deno.test("G1: categoria 'inexistente' → success false, mensagem com 'Categoria inválida'", async () => {
  const r = await executeTool(
    "classify_report_category",
    { category: "inexistente", confidence: 0.9, user_confirmed: false, reasoning: "test" },
    "test-user",
    mockSupabase
  );
  assertEquals(r.success, false);
  assertStringIncludes(r.message, "Categoria inválida");
});

Deno.test("G2: categoria vazia '' → success false", async () => {
  const r = await executeTool(
    "classify_report_category",
    { category: "", confidence: 0.9, user_confirmed: false, reasoning: "test" },
    "test-user",
    mockSupabase
  );
  assertEquals(r.success, false);
});

// ─── Grupo H: alta confiança (≥ 0.8), user_confirmed false ───────────────────

Deno.test("H1: iluminacao confidence 0.9 → success true, mensagem com label, CEP e progress marker válido", async () => {
  const r = await executeTool(
    "classify_report_category",
    {
      category: "iluminacao",
      confidence: 0.9,
      user_confirmed: false,
      reasoning: "poste apagado",
      alternative_categories: [],
    },
    "test-user",
    mockSupabase
  );
  assertEquals(r.success, true);
  assertStringIncludes(r.message, "Iluminação");
  assertStringIncludes(r.message, "CEP");

  // valida o JSON interno do progress marker
  const progress = extractProgressMarker(r.message);
  assertExists(progress, "progress marker ausente ou JSON inválido");
  assertEquals(progress.category, "iluminacao");
  assertEquals(progress.category_confidence, 0.9);
  assertEquals(progress.category_user_confirmed, false);
});

Deno.test("H2: via_publica confidence 1.0 → success true, data.category e data.confidence corretos", async () => {
  const r = await executeTool(
    "classify_report_category",
    {
      category: "via_publica",
      confidence: 1.0,
      user_confirmed: false,
      reasoning: "buraco na rua",
      alternative_categories: [],
    },
    "test-user",
    mockSupabase
  );
  assertEquals(r.success, true);
  const data = r.data as Record<string, unknown>;
  assertEquals(data.category, "via_publica");
  assertEquals(data.confidence, 1.0);
});

Deno.test("H3: iluminacao confidence exatamente 0.8 → success true (limiar inclusivo, sem needs_confirmation)", async () => {
  const r = await executeTool(
    "classify_report_category",
    {
      category: "iluminacao",
      confidence: 0.8,
      user_confirmed: false,
      reasoning: "poste com problema",
      alternative_categories: [],
    },
    "test-user",
    mockSupabase
  );
  assertEquals(r.success, true);
  const data = r.data as Record<string, unknown>;
  assertEquals(data.needs_confirmation, undefined);
});

// ─── Grupo I: baixa confiança + alternativas → pede confirmação ──────────────

Deno.test("I1: lixo confidence 0.6 com alternativas → needs_confirmation true, menciona alternativa em PT", async () => {
  const r = await executeTool(
    "classify_report_category",
    {
      category: "lixo",
      confidence: 0.6,
      user_confirmed: false,
      reasoning: "resíduo na rua",
      alternative_categories: ["higiene_urbana", "via_publica"],
    },
    "test-user",
    mockSupabase
  );
  assertEquals(r.success, true);
  const data = r.data as Record<string, unknown>;
  assertEquals(data.needs_confirmation, true);
  assertEquals(data.user_confirmed, false);
  assertStringIncludes(r.message, "Higiene Urbana");
});

Deno.test("I2: lixo confidence 0.79 (abaixo do limiar) com alternativas → needs_confirmation true", async () => {
  const r = await executeTool(
    "classify_report_category",
    {
      category: "lixo",
      confidence: 0.79,
      user_confirmed: false,
      reasoning: "lixo espalhado",
      alternative_categories: ["esgoto"],
    },
    "test-user",
    mockSupabase
  );
  assertEquals(r.success, true);
  const data = r.data as Record<string, unknown>;
  assertEquals(data.needs_confirmation, true);
  assertStringIncludes(r.message, "Esgoto");
});

// ─── Grupo J: baixa confiança MAS user_confirmed true → confirma direto ──────

Deno.test("J1: poluicao confidence 0.5, user_confirmed true → 'Entendido', sem needs_confirmation, progress marker presente", async () => {
  const r = await executeTool(
    "classify_report_category",
    {
      category: "poluicao",
      confidence: 0.5,
      user_confirmed: true,
      reasoning: "barulho confirmado pelo usuário",
      alternative_categories: ["outro"],
    },
    "test-user",
    mockSupabase
  );
  assertEquals(r.success, true);
  assertStringIncludes(r.message, "Entendido");
  const data = r.data as Record<string, unknown>;
  assertEquals(data.needs_confirmation, undefined);
  assertEquals(data.user_confirmed, true);

  // confirmação explícita também emite progress marker
  const progress = extractProgressMarker(r.message);
  assertExists(progress, "progress marker ausente após user_confirmed=true");
  assertEquals(progress.category_user_confirmed, true);
});

// ─── Grupo K: baixa confiança sem alternativas → confirma (lista vazia) ──────

Deno.test("K1: animais confidence 0.4, alternative_categories vazio → confirma sem pedir, label 'Animais' na mensagem", async () => {
  const r = await executeTool(
    "classify_report_category",
    {
      category: "animais",
      confidence: 0.4,
      user_confirmed: false,
      reasoning: "bicho no bairro",
      alternative_categories: [],
    },
    "test-user",
    mockSupabase
  );
  assertEquals(r.success, true);
  assertStringIncludes(r.message, "Animais");
  const data = r.data as Record<string, unknown>;
  assertEquals(data.needs_confirmation, undefined);
});

// ─────────────────────────────────────────────────────────
// (A) Otimização de regras: cobertura de "falta de energia" + normalização de apelidos
// ─────────────────────────────────────────────────────────

Deno.test("M1: 'falta de energia na minha rua' → iluminacao", () => {
  const r = autoClassifyCategory("falta de energia na minha rua");
  assertEquals(r.category, "iluminacao");
});

Deno.test("M2: 'estou sem energia há 12 horas' → iluminacao", () => {
  const r = autoClassifyCategory("estou sem energia há 12 horas");
  assertEquals(r.category, "iluminacao");
});

Deno.test("M3: 'apagão no bairro inteiro' → iluminacao", () => {
  const r = autoClassifyCategory("apagão no bairro inteiro");
  assertEquals(r.category, "iluminacao");
});

Deno.test("N1: normalizeUrbanCategoryAlias mapeia apelidos para canônico", () => {
  assertEquals(normalizeUrbanCategoryAlias("verde"), "area_verde");
  assertEquals(normalizeUrbanCategoryAlias("Área Verde"), "area_verde");
  assertEquals(normalizeUrbanCategoryAlias("iluminação"), "iluminacao");
  assertEquals(normalizeUrbanCategoryAlias("poluição"), "poluicao");
});

Deno.test("N2: normalizeUrbanCategoryAlias mantém categorias canônicas e desconhecidas", () => {
  assertEquals(normalizeUrbanCategoryAlias("area_verde"), "area_verde");
  assertEquals(normalizeUrbanCategoryAlias("via_publica"), "via_publica");
  assertEquals(normalizeUrbanCategoryAlias("inexistente"), "inexistente");
});
