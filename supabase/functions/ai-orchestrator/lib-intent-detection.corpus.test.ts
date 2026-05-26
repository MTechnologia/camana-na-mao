/**
 * Bateria de testes de intenção do chatbot — corpus em tests/chatbot/corpus/*.json
 * Cobre todas as jornadas + typos/gíria do munícipe.
 */
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { detectCollectionIntent } from "./lib.ts";
import {
  buildHistory,
  loadAllIntentCorpus,
  type IntentCorpusCase,
} from "../../../tests/chatbot/corpus-loader.ts";

const corpus = await loadAllIntentCorpus();

function runIntentCase(c: IntentCorpusCase): void {
  const history = buildHistory(c.input, c.history);
  const result = detectCollectionIntent(c.input, history);

  assertEquals(
    result?.type ?? null,
    c.expect_intent,
    `[${c.id}] input="${c.input}" → esperado ${c.expect_intent}, obtido ${result?.type ?? "null"}`,
  );
}

Deno.test("corpus intent: todas as jornadas (typos e gíria)", () => {
  const failures: string[] = [];
  for (const c of corpus) {
    try {
      runIntentCase(c);
    } catch (e) {
      failures.push((e as Error).message);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `${failures.length}/${corpus.length} casos falharam:\n${failures.slice(0, 15).join("\n")}${
        failures.length > 15 ? `\n... e mais ${failures.length - 15}` : ""
      }`,
    );
  }
});

/** Relatório por jornada (útil ao rodar com --reporter). */
Deno.test("corpus intent: contagem por jornada", () => {
  const byJourney = new Map<string, number>();
  for (const c of corpus) {
    byJourney.set(c.expect_intent, (byJourney.get(c.expect_intent) ?? 0) + 1);
  }
  assertEquals(corpus.length >= 80, true, `corpus deve ter volume mínimo; tem ${corpus.length}`);
  assertEquals(byJourney.has("urban_report"), true);
  assertEquals(byJourney.has("transport_report"), true);
  assertEquals(byJourney.has("service_rating"), true);
  assertEquals(byJourney.has("services"), true);
  assertEquals(byJourney.has("audiencias"), true);
  assertEquals(byJourney.has("general"), true);
  assertEquals(byJourney.has("history"), true);
  assertEquals(byJourney.has("occupancy"), true);
  assertEquals(byJourney.has("vereadores"), true);
  assertEquals(byJourney.has("noticias"), true);
});
