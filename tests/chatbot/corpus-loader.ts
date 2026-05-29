/**
 * Carrega casos de teste do chatbot a partir de JSON em tests/chatbot/corpus/.
 * Usado pelos testes Deno do ai-orchestrator.
 */

export type JourneyIntent =
  | "urban_report"
  | "transport_report"
  | "service_rating"
  | "services"
  | "audiencias"
  | "general"
  | "history"
  | "occupancy"
  | "vereadores"
  | "noticias";

export interface IntentCorpusCase {
  id: string;
  input: string;
  expect_intent: JourneyIntent;
  /** Mensagens anteriores (opcional). A última mensagem do usuário é `input`. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  languageProfile?: string;
  expectedBehavior?: string;
  notes?: string;
}

export interface IntentCorpusFile {
  journey: JourneyIntent;
  description?: string;
  cases: IntentCorpusCase[];
}

export interface NlpAffirmativeCase {
  id: string;
  input: string;
  expect: "affirmative" | "negative";
}

export interface TimeParseCase {
  id: string;
  input: string;
  expect: string | null;
}

export interface FieldParseCase {
  id: string;
  field: string;
  input: string;
  expect_key: string;
  expect_value: string;
}

const CORPUS_DIR = new URL("./corpus/", import.meta.url);

async function readJsonFile<T>(name: string): Promise<T> {
  const text = await Deno.readTextFile(new URL(name, CORPUS_DIR));
  return JSON.parse(text) as T;
}

export async function loadAllIntentCorpus(): Promise<IntentCorpusCase[]> {
  const files = [
    "urban-intent.json",
    "transport-intent.json",
    "service-rating-intent.json",
    "services-intent.json",
    "audiencias-intent.json",
    "history-intent.json",
    "general-intent.json",
    "occupancy-intent.json",
    "vereadores-intent.json",
    "noticias-intent.json",
    "bus-informational-intent.json",
    "ambiguous-intent.json",
    "journey-switch-intent.json",
    "conversation-robust-intent.json",
  ];
  const all: IntentCorpusCase[] = [];
  for (const file of files) {
    const doc = await readJsonFile<IntentCorpusFile>(file);
    for (const c of doc.cases) {
      all.push({ ...c, expect_intent: c.expect_intent ?? doc.journey });
    }
  }
  return all;
}

export async function loadNlpAffirmativeCorpus(): Promise<NlpAffirmativeCase[]> {
  const doc = await readJsonFile<{ cases: NlpAffirmativeCase[] }>("nlp-affirmative-negative.json");
  return doc.cases;
}

export async function loadTimeParseCorpus(): Promise<TimeParseCase[]> {
  const doc = await readJsonFile<{ cases: TimeParseCase[] }>("nlp-time-parsing.json");
  return doc.cases;
}

export async function loadFieldParseCorpus(): Promise<FieldParseCase[]> {
  const doc = await readJsonFile<{ cases: FieldParseCase[] }>("nlp-field-parsing.json");
  return doc.cases;
}

export interface TurnAccumulateCase {
  id: string;
  journey: "urban_report" | "transport_report" | "service_rating";
  history: Array<{ role: "user" | "assistant"; content: string }>;
  expect?: Record<string, unknown>;
  expect_keys_present?: string[];
}

export interface TurnNextFieldCase {
  id: string;
  journey: "urban_report" | "transport_report" | "service_rating";
  accumulated: Record<string, unknown>;
  expect_field: string;
  expect_picker_contains?: string;
}

export interface TurnAutoCreateCase {
  id: string;
  handler: "transport_auto_create";
  accumulated: Record<string, unknown>;
  expect: {
    field_request?: string;
    picker_contains?: string;
  };
}

export async function loadTurnAccumulateCorpus(): Promise<TurnAccumulateCase[]> {
  const doc = await readJsonFile<{ cases: TurnAccumulateCase[] }>("turn-accumulate.json");
  return doc.cases;
}

export async function loadTurnNextFieldCorpus(): Promise<TurnNextFieldCase[]> {
  const doc = await readJsonFile<{ cases: TurnNextFieldCase[] }>("turn-next-field.json");
  return doc.cases;
}

export async function loadTurnAutoCreateCorpus(): Promise<TurnAutoCreateCase[]> {
  const doc = await readJsonFile<{ cases: TurnAutoCreateCase[] }>("turn-auto-create.json");
  return doc.cases;
}

/** Monta histórico de conversa para detectCollectionIntent. */
export function buildHistory(
  input: string,
  history?: IntentCorpusCase["history"],
): Array<{ role: string; content: string }> {
  const msgs: Array<{ role: string; content: string }> = [...(history ?? [])];
  msgs.push({ role: "user", content: input });
  return msgs;
}
