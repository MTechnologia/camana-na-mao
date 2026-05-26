/**
 * Fase 2 — Contrato de turno: acumulação de campos, próximo campo e auto-create.
 */
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { accumulateFieldsFromHistory } from "./lib.ts";
import { getNextMissingField } from "./lib-next-missing-field.ts";
import { handleDeterministicTransportAutoCreate } from "./lib-index-transport-auto.ts";
import {
  loadTurnAccumulateCorpus,
  loadTurnAutoCreateCorpus,
  loadTurnNextFieldCorpus,
} from "../../../tests/chatbot/corpus-loader.ts";
import { assertTurnContract } from "../../../tests/chatbot/turn-contract-utils.ts";

const accumulateCases = await loadTurnAccumulateCorpus();
const nextFieldCases = await loadTurnNextFieldCorpus();
const autoCreateCases = await loadTurnAutoCreateCorpus();

function createMockSupabase() {
  const chain = {
    eq: () => chain,
    not: () => chain,
    order: () => chain,
    limit: async () => ({ data: [] }),
    maybeSingle: async () => ({ data: null }),
  };
  return {
    from: () => ({
      select: () => chain,
    }),
  };
}

Deno.test("corpus turn: accumulateFieldsFromHistory (typos e marcadores)", () => {
  const failures: string[] = [];
  for (const c of accumulateCases) {
    const fields = accumulateFieldsFromHistory(c.history, c.journey);
    if (c.expect) {
      for (const [key, val] of Object.entries(c.expect)) {
        if (fields[key] !== val) {
          failures.push(
            `[${c.id}] ${key}: esperado ${JSON.stringify(val)}, obtido ${JSON.stringify(fields[key])}`,
          );
        }
      }
    }
    if (c.expect_keys_present) {
      for (const key of c.expect_keys_present) {
        if (fields[key] === undefined || fields[key] === null || fields[key] === "") {
          failures.push(`[${c.id}] chave ausente no acumulado: ${key}`);
        }
      }
    }
  }
  if (failures.length > 0) throw new Error(failures.join("\n"));
});

Deno.test("corpus turn: getNextMissingField", async () => {
  const lib = await import("./lib.ts");
  const failures: string[] = [];
  for (const c of nextFieldCases) {
    const accumulated = { ...c.accumulated };
    const mockSupabase = createMockSupabase();
    const next = await getNextMissingField(
      c.journey,
      accumulated,
      // deno-lint-ignore no-explicit-any
      mockSupabase as any,
      // deno-lint-ignore no-explicit-any
      mockSupabase as any,
      "user-corpus",
      lib,
    );
    if (next.field !== c.expect_field) {
      failures.push(
        `[${c.id}] field: esperado ${c.expect_field}, obtido ${next.field ?? "null"}`,
      );
    }
    if (c.expect_picker_contains && !(next.picker ?? "").includes(c.expect_picker_contains)) {
      failures.push(`[${c.id}] picker: esperado conter ${c.expect_picker_contains}, obtido ${next.picker}`);
    }
  }
  if (failures.length > 0) throw new Error(failures.join("\n"));
});

Deno.test("corpus turn: auto-create / validação determinística", async () => {
  const failures: string[] = [];
  for (const c of autoCreateCases) {
    if (c.handler === "transport_auto_create") {
      const result = await handleDeterministicTransportAutoCreate({
        accumulatedFields: { ...c.accumulated },
        attachmentUrls: [],
        chatMessages: [],
        getMessageText: () => "",
        lastAssistantLower: "",
        lastAssistantMessage: "",
        lastUserMessage: "",
        msgLower: "",
        // deno-lint-ignore no-explicit-any
        supabase: createMockSupabase() as any,
        userId: "user-corpus",
        // deno-lint-ignore no-explicit-any
        lib: {
          corsHeaders: {},
          isValidTransportSubcategory: () => false,
        } as any,
      });
      if (!result.response) {
        failures.push(`[${c.id}] sem response`);
        continue;
      }
      const text = await result.response.text();
      const errs = assertTurnContract(text, {
        journey: "transport_report",
        field_request: c.expect.field_request,
        picker_contains: c.expect.picker_contains,
      });
      if (errs.length > 0) failures.push(`[${c.id}] ${errs.join("; ")}`);
    }
  }
  if (failures.length > 0) throw new Error(failures.join("\n"));
});

Deno.test("corpus turn: contagem mínima de casos", () => {
  assertEquals(accumulateCases.length >= 5, true);
  assertEquals(nextFieldCases.length >= 4, true);
  assertEquals(autoCreateCases.length >= 1, true);
});
