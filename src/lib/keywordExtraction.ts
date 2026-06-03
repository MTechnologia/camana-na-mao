import type { WordData } from "@/components/analytics/WordCloud";

/**
 * Extração simples de "termos em destaque" a partir das descrições dos relatos.
 *
 * Não é NLP de verdade (sem stemming/lematização), mas filtra stopwords do
 * português e ruído numérico/curto para que a nuvem mostre termos relevantes —
 * em vez de "muito", "porque", "quando" etc. Cada termo recebe o sentimento
 * predominante entre os relatos em que aparece.
 */

/** Stopwords PT (apenas formas com ≥ 4 caracteres; tokens menores já são descartados). */
const PT_STOPWORDS = new Set<string>([
  "para",
  "pela",
  "pelo",
  "pelas",
  "pelos",
  "como",
  "mais",
  "menos",
  "muito",
  "muita",
  "muitos",
  "muitas",
  "pouco",
  "pouca",
  "esta",
  "este",
  "estas",
  "estes",
  "isso",
  "isto",
  "aqui",
  "onde",
  "quando",
  "porque",
  "também",
  "então",
  "sobre",
  "entre",
  "sendo",
  "desde",
  "após",
  "cada",
  "todo",
  "toda",
  "todos",
  "todas",
  "outro",
  "outra",
  "outros",
  "outras",
  "mesmo",
  "mesma",
  "ainda",
  "apenas",
  "sempre",
  "nunca",
  "agora",
  "depois",
  "antes",
  "alguns",
  "algumas",
  "alguma",
  "algum",
  "nada",
  "tudo",
  "quem",
  "qual",
  "quais",
  "essa",
  "esse",
  "essas",
  "esses",
  "aquele",
  "aquela",
  "aqueles",
  "aquelas",
  "minha",
  "meus",
  "minhas",
  "seus",
  "suas",
  "nosso",
  "nossa",
  "nossos",
  "nossas",
  "dele",
  "dela",
  "deles",
  "delas",
  "você",
  "vocês",
  "fazer",
  "feito",
  "feita",
  "tinha",
  "tenho",
  "temos",
  "estão",
  "estava",
  "estavam",
  "estou",
  "fica",
  "ficar",
  "ficou",
  "estar",
  "está",
  "foram",
  "será",
  "seria",
  "haver",
  "houve",
  "pois",
  "logo",
  "assim",
  "porém",
  "contudo",
  "embora",
  "qualquer",
  "deste",
  "desta",
  "nesse",
  "nessa",
  "neste",
  "nesta",
  "naquele",
  "naquela",
  "favor",
  "gostaria",
  "preciso",
  "consigo",
  "sendo",
]);

export type KeywordSourceReport = {
  description?: string | null;
  sentiment?: string | null;
};

function classifySentiment(value?: string | null): WordData["sentiment"] {
  const lower = (value ?? "").toLowerCase();
  if (lower.includes("positiv")) return "positive";
  if (lower.includes("negativ")) return "negative";
  return "neutral";
}

/** Normaliza um token: minúsculas, remove pontuação, mantém acentos PT. */
function normalizeToken(raw: string): string | null {
  const clean = raw.toLowerCase().replace(/[^a-zà-ÿ]/gi, "");
  if (clean.length < 4) return null;
  if (PT_STOPWORDS.has(clean)) return null;
  return clean;
}

export function extractKeywords(reports: KeywordSourceReport[], limit = 40): WordData[] {
  const map = new Map<string, { count: number; pos: number; neg: number; neu: number }>();

  for (const report of reports) {
    if (!report.description) continue;
    const sentiment = classifySentiment(report.sentiment);
    // Conta cada termo no máximo uma vez por relato (evita um texto verboso dominar).
    const seen = new Set<string>();
    for (const raw of report.description.split(/\s+/)) {
      const token = normalizeToken(raw);
      if (!token || seen.has(token)) continue;
      seen.add(token);
      const entry = map.get(token) ?? { count: 0, pos: 0, neg: 0, neu: 0 };
      entry.count += 1;
      if (sentiment === "positive") entry.pos += 1;
      else if (sentiment === "negative") entry.neg += 1;
      else entry.neu += 1;
      map.set(token, entry);
    }
  }

  return Array.from(map.entries())
    .filter(([, e]) => e.count >= 2) // ignora termos que aparecem 1x só (ruído)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([text, e]) => {
      const sentiment: WordData["sentiment"] =
        e.neg > e.pos && e.neg > e.neu
          ? "negative"
          : e.pos > e.neg && e.pos > e.neu
            ? "positive"
            : "neutral";
      return { text, count: e.count, sentiment };
    });
}
