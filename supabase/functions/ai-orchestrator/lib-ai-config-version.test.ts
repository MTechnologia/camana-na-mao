import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  applyTemplateVariableExamples,
  buildVersionedSystemPrompt,
  clearActiveAiConfigCache,
  resolveAiConfigEnvironment,
  resolveEffectiveAiChatModel,
} from "./lib-ai-config-version.ts";

Deno.test("resolveAiConfigEnvironment — production default", () => {
  assertEquals(resolveAiConfigEnvironment(() => undefined), "production");
  assertEquals(resolveAiConfigEnvironment(() => "production"), "production");
});

Deno.test("resolveAiConfigEnvironment — homologation aliases", () => {
  assertEquals(resolveAiConfigEnvironment(() => "homologation"), "homologation");
  assertEquals(resolveAiConfigEnvironment(() => "hml"), "homologation");
  assertEquals(resolveAiConfigEnvironment(() => "homolog"), "homologation");
});

Deno.test("applyTemplateVariableExamples substitui placeholders", () => {
  const body = "Contexto: {{regiao}} | {{categoria}}";
  const result = applyTemplateVariableExamples(body, [
    { key: "regiao", example: "Zona Sul" },
    { key: "categoria", example: "Saúde" },
  ]);
  assertEquals(result, "Contexto: Zona Sul | Saúde");
});

Deno.test("buildVersionedSystemPrompt inclui bloco institucional e operacional", () => {
  const merged = buildVersionedSystemPrompt("BASE", {
    id: "1",
    versionLabel: "2026.05.1",
    environment: "production",
    modelId: "gemini-3.1-flash-lite-preview",
    institutionalBody: "Institucional",
    templateSlug: "tpl-assistente-relatos",
    templateName: "Triagem",
  });
  assertEquals(merged.includes("CONFIGURAÇÃO INSTITUCIONAL"), true);
  assertEquals(merged.includes("Institucional"), true);
  assertEquals(merged.includes("PROMPT OPERACIONAL"), true);
  assertEquals(merged.includes("BASE"), true);
});

Deno.test("resolveEffectiveAiChatModel prioriza versão", () => {
  assertEquals(
    resolveEffectiveAiChatModel("gemini-2.5-flash", "gemini-3.1-flash-lite-preview"),
    "gemini-3.1-flash-lite-preview",
  );
  assertEquals(resolveEffectiveAiChatModel("google/gemini-2.5-flash", null), "gemini-2.5-flash");
});

Deno.test("clearActiveAiConfigCache não lança", () => {
  clearActiveAiConfigCache();
});
