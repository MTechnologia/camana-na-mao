import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

import { handleCouncilShortcuts } from "./lib-index-council-shortcuts.ts";

Deno.test("handleCouncilShortcuts sugere vereadores sem criar novo relato", async () => {
  let suggestArgs: { description: string; district?: string; issueType: string } | null = null;

  const result = await handleCouncilShortcuts({
    chatMessages: [
      { role: "assistant", content: "Mensagem anterior" },
      { role: "user", content: "Pode encaminhar meu relato para um vereador?" },
    ],
    corsHeaders: {},
    lastAssistantContent:
      "Relato registrado\nCategoria: Iluminação\nDescrição: Poste apagado\nEndereço:\n- Rua Exemplo, 10\n- Vila Mariana\n- CEP 04000-000",
    lastAssistantText: "Relato registrado",
    lastAssistantTextEarly: "relato registrado",
    lastUserTextEarly: "pode encaminhar meu relato para um vereador?",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      suggestCouncilMember: async (issueType: string, description: string, district?: string) => {
        suggestArgs = { description, district, issueType };
        return "Vereador Exemplo";
      },
    } as any,
  });

  assertExists(result.response);
  assertEquals(suggestArgs, {
    description: "Poste apagado",
    district: "Vila Mariana",
    issueType: "urbanismo",
  });
  const text = await result.response!.text();
  assertEquals(text.includes("Vereador Exemplo"), true);
});

Deno.test("handleCouncilShortcuts sugere vereadores após relato de transporte registrado", async () => {
  let suggestArgs: { description: string; district?: string; issueType: string } | null = null;

  const result = await handleCouncilShortcuts({
    chatMessages: [
      {
        role: "assistant",
        content:
          "[TRANSPORT_CREATED:123e4567-e89b-12d3-a456-426614174111]\n✅ Relato de transporte registrado!\n📝 Descrição: Ônibus atrasou e perdi compromisso",
      },
      { role: "user", content: "Quero encaminhar meu relato para um vereador" },
    ],
    corsHeaders: {},
    lastAssistantContent:
      "[TRANSPORT_CREATED:123e4567-e89b-12d3-a456-426614174111]\n✅ Relato de transporte registrado!\n📝 Descrição: Ônibus atrasou e perdi compromisso",
    lastAssistantText:
      "[TRANSPORT_CREATED:123e4567-e89b-12d3-a456-426614174111]\n✅ Relato de transporte registrado!\n📝 Descrição: Ônibus atrasou e perdi compromisso",
    lastAssistantTextEarly:
      "[transport_created:123e4567-e89b-12d3-a456-426614174111] ✅ relato de transporte registrado! 📝 descrição: ônibus atrasou e perdi compromisso",
    lastUserTextEarly: "quero encaminhar meu relato para um vereador",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-transport",
    // deno-lint-ignore no-explicit-any
    lib: {
      suggestCouncilMember: async (issueType: string, description: string, district?: string) => {
        suggestArgs = { description, district, issueType };
        return "Vereador Transporte";
      },
    } as any,
  });

  assertExists(result.response);
  assertEquals(suggestArgs, {
    description: "Ônibus atrasou e perdi compromisso",
    district: undefined,
    issueType: "urbanismo",
  });
  const text = await result.response!.text();
  assertEquals(text.includes("Vereador Transporte"), true);
});

Deno.test("handleCouncilShortcuts registra encaminhamento quando usuário escolhe vereador", async () => {
  let insertedRow: Record<string, unknown> | null = null;
  const supabase = {
    from: (table: string) => {
      assertEquals(table, "council_member_referrals");
      return {
        insert: async (row: Record<string, unknown>) => {
          insertedRow = row;
          return { error: null };
        },
      };
    },
  } as unknown as SupabaseClient;

  const result = await handleCouncilShortcuts({
    chatMessages: [
      { role: "assistant", content: "Deseja que eu encaminhe sua demanda para algum deles?" },
      { role: "assistant", content: "Relato criado [REPORT_CREATED:123e4567-e89b-12d3-a456-426614174000]" },
      { role: "user", content: "Adrilles Jorge (UNIAO)" },
    ],
    corsHeaders: {},
    lastAssistantContent: "Deseja que eu encaminhe sua demanda para algum deles?",
    lastAssistantText: "Deseja que eu encaminhe sua demanda para algum deles?",
    lastAssistantTextEarly: "deseja que eu encaminhe sua demanda para algum deles?",
    lastUserTextEarly: "Adrilles Jorge (UNIAO)",
    supabase,
    userId: "user-42",
    // deno-lint-ignore no-explicit-any
    lib: {} as any,
  });

  assertExists(result.response);
  assertEquals(insertedRow, {
    council_member_id: "adrilles-jorge",
    council_member_name: "Adrilles Jorge",
    council_member_party: "UNIAO",
    status: "pending",
    urban_report_id: "123e4567-e89b-12d3-a456-426614174000",
    user_id: "user-42",
  });
  const text = await result.response!.text();
  assertEquals(text.includes("Encaminhamento registrado"), true);
});

Deno.test("handleCouncilShortcuts registra encaminhamento quando usuário escolhe vereador por número", async () => {
  let insertedRow: Record<string, unknown> | null = null;
  const supabase = {
    from: (table: string) => {
      assertEquals(table, "council_member_referrals");
      return {
        insert: async (row: Record<string, unknown>) => {
          insertedRow = row;
          return { error: null };
        },
      };
    },
  } as unknown as SupabaseClient;

  const assistantList = [
    "Claro! Seu relato já foi registrado. Para encaminhar a um vereador, seguem sugestões de parlamentares que podem ajudar com esse tipo de demanda:",
    "",
    "Para questões de urbanismo, você pode procurar:",
    "",
    "1. Adrilles Jorge (UNIAO)",
    "2. Alessandro Guedes (PT)",
    "3. Amanda Paschoal (PSOL)",
    "",
    "Deseja que eu encaminhe sua demanda para algum deles?",
  ].join("\n");

  const result = await handleCouncilShortcuts({
    chatMessages: [
      { role: "assistant", content: assistantList },
      { role: "assistant", content: "Relato criado [REPORT_CREATED:123e4567-e89b-12d3-a456-426614174000]" },
      { role: "user", content: "3" },
    ],
    corsHeaders: {},
    lastAssistantContent: assistantList,
    lastAssistantText: assistantList,
    lastAssistantTextEarly: assistantList.toLowerCase(),
    lastUserTextEarly: "3",
    supabase,
    userId: "user-99",
    // deno-lint-ignore no-explicit-any
    lib: {} as any,
  });

  assertExists(result.response);
  assertEquals(insertedRow, {
    council_member_id: "amanda-paschoal",
    council_member_name: "Amanda Paschoal",
    council_member_party: "PSOL",
    status: "pending",
    urban_report_id: "123e4567-e89b-12d3-a456-426614174000",
    user_id: "user-99",
  });
  const text = await result.response!.text();
  assertEquals(text.includes("Amanda Paschoal"), true);
  assertEquals(text.includes("Encaminhamento registrado"), true);
});

Deno.test("handleCouncilShortcuts bloqueia perguntas ofensivas sobre vereadores", async () => {
  const result = await handleCouncilShortcuts({
    chatMessages: [],
    corsHeaders: {},
    lastAssistantContent: "",
    lastAssistantText: "",
    lastAssistantTextEarly: "",
    lastUserTextEarly: "qual vereador é mais ladrão?",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {} as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("Não posso responder perguntas"), true);
});
