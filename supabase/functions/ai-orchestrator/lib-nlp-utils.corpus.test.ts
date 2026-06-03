/**
 * Corpus NLP: afirmativo/negativo, horário flexível e parse de campos.
 */
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  isAffirmativeResponse,
  isNegativeResponse,
} from "./lib-nlp-utils.ts";
import { parseFieldResponse, parseFlexibleOccurrenceTime } from "./lib.ts";
import {
  loadFieldParseCorpus,
  loadNlpAffirmativeCorpus,
  loadTimeParseCorpus,
} from "../../../tests/chatbot/corpus-loader.ts";

const affirmativeCases = await loadNlpAffirmativeCorpus();
const timeCases = await loadTimeParseCorpus();
const fieldCases = await loadFieldParseCorpus();

Deno.test("corpus nlp: afirmativo e negativo (gíria/typos)", () => {
  const failures: string[] = [];
  for (const c of affirmativeCases) {
    const aff = isAffirmativeResponse(c.input);
    const neg = isNegativeResponse(c.input);
    const ok = c.expect === "affirmative" ? aff && !neg : neg;
    if (!ok) {
      failures.push(`[${c.id}] "${c.input}" → esperado ${c.expect}, aff=${aff} neg=${neg}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
});

Deno.test("corpus nlp: parseFlexibleOccurrenceTime", () => {
  const failures: string[] = [];
  for (const c of timeCases) {
    const got = parseFlexibleOccurrenceTime(c.input);
    if (got !== c.expect) {
      failures.push(`[${c.id}] "${c.input}" → esperado ${c.expect}, obtido ${got}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
});

Deno.test("corpus nlp: parseFieldResponse (campos estruturados)", () => {
  const failures: string[] = [];
  for (const c of fieldCases) {
    const parsed = parseFieldResponse(c.field, c.input) as Record<string, string>;
    const got = parsed[c.expect_key];
    if (got !== c.expect_value) {
      failures.push(
        `[${c.id}] field=${c.field} "${c.input}" → esperado ${c.expect_value}, obtido ${got ?? "undefined"}`,
      );
    }
  }
  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
});
