import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveAiProviderConfig } from "../_shared/ai-provider.ts";

export function tryPatternBasedLabel(description: string, category: string): string | null {
  const lower = description.toLowerCase();

  const patterns: Record<string, Array<{ pattern: RegExp; label: string }>> = {
    iluminacao: [
      { pattern: /poste\s*(caido|caído|quebrado)/i, label: "Poste Caído" },
      { pattern: /luz\s*(apagad|queimad)/i, label: "Luz Apagada" },
      { pattern: /lampada\s*(queimad|quebrad)/i, label: "Lâmpada Queimada" },
      { pattern: /rua\s*sem\s*luz/i, label: "Rua sem Iluminação" },
      { pattern: /escuro|escuridao|escuridão/i, label: "Falta de Iluminação" },
    ],
    via_publica: [
      { pattern: /buraco\s*(grande|enorme|gigante)?/i, label: "Buraco na Via" },
      { pattern: /asfalto\s*(danificad|quebrad)/i, label: "Asfalto Danificado" },
      { pattern: /lombada\s*(irregular|alta)/i, label: "Lombada Irregular" },
    ],
    pavimentacao: [
      { pattern: /pavimenta[çc][ãa]o|pavimentacao|recape|recapeamento|asfaltamento|capeamento|fresagem/i, label: "Pavimentação / Recape" },
      { pattern: /obra\s*(de\s*)?paviment|requalifica[çc][ãa]o\s*vi[áa]ria|cbuq|restaura[çc][ãa]o\s*asf[áa]ltica/i, label: "Obra de Pavimentação" },
    ],
    sinalizacao: [
      { pattern: /semaforo|semáforo/i, label: "Semáforo com Defeito" },
      { pattern: /faixa\s*(de\s*pedestre|apagad)/i, label: "Faixa de Pedestre" },
      { pattern: /placa\s*(ca[íi]d|quebrad|torta)?/i, label: "Placa de Sinalização" },
      { pattern: /sinaliza[çc][ãa]o/i, label: "Problema de Sinalização" },
    ],
    drenagem: [
      { pattern: /drenagem|água\s*pluvial|pluvial|galeria|sarjeta/i, label: "Drenagem / Água Pluvial" },
      { pattern: /água\s*da\s*chuva|chuva\s*acumulad/i, label: "Acúmulo de Água da Chuva" },
      { pattern: /bueiro\s*pluvial/i, label: "Bueiro Pluvial" },
    ],
    calcada: [
      { pattern: /calcada\s*(quebrad|irregular|danificad)|calçada/i, label: "Calçada Irregular" },
      { pattern: /rampa\s*(faltando|irregular)/i, label: "Rampa de Acessibilidade" },
    ],
    lixo: [
      { pattern: /lixo\s*(acumulad|amontoado)/i, label: "Lixo Acumulado" },
      { pattern: /entulho/i, label: "Entulho Descartado" },
      { pattern: /descarte\s*irregular/i, label: "Descarte Irregular" },
    ],
    area_verde: [
      { pattern: /arvore\s*(caid|caind|tombad)|árvore/i, label: "Árvore Caída" },
      { pattern: /poda\s*(necessari|urgente)/i, label: "Necessidade de Poda" },
      { pattern: /mato\s*(alto|crescendo)/i, label: "Mato Alto" },
      { pattern: /galho\s*(pendent|caind)/i, label: "Galho Pendente" },
    ],
    esgoto: [
      { pattern: /bueiro\s*(entupid|transbordand)/i, label: "Bueiro Entupido" },
      { pattern: /esgoto\s*(a\s*ceu\s*aberto|vazand)/i, label: "Esgoto a Céu Aberto" },
      { pattern: /vazamento/i, label: "Vazamento de Água" },
      { pattern: /alagamento|alagad/i, label: "Alagamento" },
    ],
    poluicao: [
      { pattern: /barulho|som\s*alto|música\s*alta/i, label: "Perturbação Sonora" },
      { pattern: /bar\s*(barulhento|barulho)|balada|festa/i, label: "Estabelecimento Barulhento" },
      { pattern: /fumaça|fumaca|queimada/i, label: "Poluição Atmosférica" },
    ],
    outro: [
      { pattern: /patinete\s*(abandonad|jogad)/i, label: "Patinete Abandonado" },
      { pattern: /bicicleta\s*(abandonad|jogad)/i, label: "Bicicleta Abandonada" },
      { pattern: /carro\s*(abandonad)/i, label: "Veículo Abandonado" },
      { pattern: /moto\s*(abandonad)/i, label: "Moto Abandonada" },
    ],
  };

  const categoryPatterns = patterns[category] || patterns.outro;
  for (const p of categoryPatterns) {
    if (p.pattern.test(lower)) {
      return p.label;
    }
  }

  return null;
}

export function generateLabelFromDescription(description: string): string {
  if (!description || description.trim().length === 0) {
    return "Problema Urbano";
  }

  const words = description
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûçñ]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 4);

  if (words.length === 0) {
    return "Problema Urbano";
  }

  const label = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return label.substring(0, 50) || "Problema Urbano";
}

export async function generateIntelligentLabel(description: string, category: string): Promise<string> {
  const patternLabel = tryPatternBasedLabel(description, category);
  if (patternLabel) return patternLabel;

  try {
    const {
      chatCompletionsModel,
      finalAiApiKey,
      finalAiBaseUrl,
    } = await resolveAiProviderConfig({ logPrefix: "[generateIntelligentLabel]" });

    if (!finalAiBaseUrl) {
      return generateLabelFromDescription(description);
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (finalAiApiKey) {
      headers.Authorization = `Bearer ${finalAiApiKey}`;
    }

    const apiUrl = `${finalAiBaseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: chatCompletionsModel,
        messages: [{
          role: "system",
          content: `Você é um classificador de problemas urbanos de São Paulo.
Dado uma descrição de problema, gere um LABEL curto (2-4 palavras) que resuma o problema.

Regras:
- Máximo 4 palavras
- Use linguagem clara e direta
- Foque no problema principal
- Não use artigos desnecessários`,
        }, {
          role: "user",
          content: `Categoria: ${category}\nDescrição: ${description}\n\nGere o label:`,
        }],
        max_tokens: 20,
        temperature: 0.3,
      }),
    });

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const label = (data.choices?.[0]?.message?.content ?? "").trim() || "";

    if (label && label.length <= 50 && label.length >= 3) {
      console.log("[generateIntelligentLabel] AI generated:", label);
      return label;
    }
  } catch (error) {
    console.error("[generateIntelligentLabel] AI error:", error);
  }

  return generateLabelFromDescription(description);
}

export const EMERGING_PATTERNS = [
  { pattern: /patinete\s*(eletric|abandonad|jogad)/i, key: "patinete_abandonado", name: "Patinete Abandonado", parent: "outro" },
  { pattern: /bicicleta\s*(de\s*app|compartilhad|abandonad)/i, key: "bike_compartilhada", name: "Bicicleta Compartilhada", parent: "outro" },
  { pattern: /5g|antena\s*celular/i, key: "infraestrutura_telecom", name: "Infraestrutura de Telecom", parent: "outro" },
  { pattern: /drone|drones/i, key: "drones", name: "Problema com Drones", parent: "outro" },
  { pattern: /carro\s*eletrico|ponto\s*de\s*recarga/i, key: "infraestrutura_ev", name: "Infraestrutura Veículos Elétricos", parent: "outro" },
  { pattern: /delivery|entregador|motoboy/i, key: "problemas_delivery", name: "Problemas com Delivery", parent: "outro" },
] as const;

export function extractCategoryKeywords(text: string): string[] {
  const stopwords = ["o", "a", "os", "as", "um", "uma", "de", "da", "do", "em", "na", "no", "que", "e", "para", "com", "por"];
  return text
    .toLowerCase()
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûçñ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.includes(w))
    .slice(0, 10);
}

export async function detectEmergingCategory(
  description: string,
  currentCategory: string,
  supabaseClient: SupabaseClient,
): Promise<{ shouldCreate: boolean; suggestedKey?: string; suggestedName?: string; parentCategory?: string }> {
  const lower = description.toLowerCase();

  for (const ep of EMERGING_PATTERNS) {
    if (ep.pattern.test(lower)) {
      const { data: existing } = await supabaseClient
        .from("dynamic_categories")
        .select("id, usage_count")
        .eq("category_key", ep.key)
        .single();

      if (existing) {
        await supabaseClient
          .from("dynamic_categories")
          .update({
            usage_count: existing.usage_count + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        console.log(`[detectEmergingCategory] Incremented usage for: ${ep.key}`);
        return { shouldCreate: false };
      }
      return {
        shouldCreate: true,
        suggestedKey: ep.key,
        suggestedName: ep.name,
        parentCategory: ep.parent || currentCategory,
      };
    }
  }

  return { shouldCreate: false };
}

export async function createDynamicCategory(
  key: string,
  name: string,
  parentCategory: string,
  description: string,
  supabaseClient: SupabaseClient,
): Promise<void> {
  try {
    await supabaseClient
      .from("dynamic_categories")
      .insert({
        category_key: key,
        parent_category: parentCategory,
        display_name: name,
        keywords: extractCategoryKeywords(description),
        sample_descriptions: [description.substring(0, 200)],
        status: "pending",
      });

    console.log(`[createDynamicCategory] New category created: ${key} (${name})`);
  } catch (error) {
    console.error("[createDynamicCategory] Error:", error);
  }
}

export async function logCategoryUsage(
  category: string,
  subcategory: string | null,
  description: string,
  userId: string | null,
  supabaseClient: SupabaseClient,
): Promise<void> {
  try {
    const descHash = description.substring(0, 50).replace(/\s+/g, "").toLowerCase();
    await supabaseClient
      .from("category_usage_log")
      .insert({
        category,
        subcategory,
        description_hash: descHash,
        description_sample: description.substring(0, 200),
        keywords_detected: extractCategoryKeywords(description),
        user_id: userId,
      });
  } catch (error) {
    console.error("[logCategoryUsage] Error:", error);
  }
}

const FEEDBACK_MATCH_STOPWORDS = new Set([
  "o", "a", "os", "as", "um", "uma", "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos",
  "que", "e", "é", "para", "com", "por", "como", "mas", "foi", "ser", "tem", "se", "ao", "aos", "à", "às",
  "não", "nao", "mais", "muito", "muita", "já", "ja", "está", "esta", "estão", "estao", "são", "sao", "ou",
]);

export function tokenSetForFeedbackMatch(text: string): Set<string> {
  const raw = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !FEEDBACK_MATCH_STOPWORDS.has(w));
  return new Set(raw);
}

function jaccardTokenSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter++;
  }
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

export function descriptionMatchesFeedbackExcerpt(description: string, excerpt: string): boolean {
  const ex = excerpt.trim();
  const desc = description.trim();
  if (ex.length < 8 || desc.length < 5) return false;
  const dLower = desc.toLowerCase();
  const eLower = ex.toLowerCase();
  if (eLower.length >= 10 && eLower.length <= 160 && dLower.includes(eLower)) return true;
  const prefixLen = Math.min(100, ex.length, desc.length);
  if (prefixLen >= 20 && dLower.slice(0, prefixLen) === eLower.slice(0, prefixLen)) return true;
  const sim = jaccardTokenSimilarity(tokenSetForFeedbackMatch(desc), tokenSetForFeedbackMatch(ex));
  return sim >= 0.28;
}

export async function getClassificationFromFeedback(
  supabase: SupabaseClient,
  description: string,
  reportType: "urban" | "transport",
): Promise<{ category: string; subcategory: string | null } | null> {
  if (!description || description.trim().length < 5) return null;
  const { data: rows } = await supabase
    .from("report_classification_feedback")
    .select("description_excerpt, corrected_category, corrected_subcategory")
    .eq("report_type", reportType)
    .not("description_excerpt", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (!rows?.length) return null;
  for (const row of rows) {
    const excerpt = (row.description_excerpt || "").trim();
    if (excerpt.length < 8) continue;
    if (descriptionMatchesFeedbackExcerpt(description, excerpt)) {
      return {
        category: row.corrected_category,
        subcategory: row.corrected_subcategory ?? null,
      };
    }
  }
  return null;
}

export const CLASSIFICATION_PREDICTION_SOURCES = [
  "feedback_loop",
  "urgent_pattern",
  "auto_heuristic",
  "fallback_outro",
  "user_recovery",
  "fuzzy_text",
  "keyword_extract",
  "manual_form",
  "unknown",
] as const;

export type ClassificationPredictionSource = (typeof CLASSIFICATION_PREDICTION_SOURCES)[number];

export function inferUrbanClassificationSource(
  accumulated: Record<string, unknown> | undefined,
): ClassificationPredictionSource {
  const acc = accumulated || {};
  if (acc._from_feedback === true) return "feedback_loop";
  if (acc._urgent_content === true) return "urgent_pattern";
  if (acc._fallback_category === true) return "user_recovery";
  if (acc._auto_classified === true) return "auto_heuristic";
  return "unknown";
}

export function inferTransportClassificationSource(
  accumulated: Record<string, unknown> | undefined,
): ClassificationPredictionSource {
  const acc = accumulated || {};
  if (acc._from_classification_feedback === true) return "feedback_loop";
  const route = acc._transport_classification_route;
  if (route === "fuzzy_text" || route === "keyword_extract" || route === "fallback_outro") {
    return route;
  }
  if (acc._fallback_report_type === true) return "fallback_outro";
  return "unknown";
}

export async function insertClassificationPredictionLog(
  supabase: SupabaseClient,
  params: {
    userId: string;
    reportId: string;
    reportType: "urban" | "transport";
    predictedCategory: string;
    predictedSubcategory: string | null;
    classificationSource: string;
  },
): Promise<void> {
  const payload = {
    report_id: params.reportId,
    report_type: params.reportType,
    predicted_category: params.predictedCategory,
    predicted_subcategory: params.predictedSubcategory,
    classification_source: params.classificationSource,
    user_id: params.userId,
  };
  console.log("[CLASSIFICATION_METRIC]", JSON.stringify({ event: "prediction_at_registration", ...payload }));
  const { error } = await supabase.from("report_classification_prediction_log").insert(payload);
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      console.warn("[insertClassificationPredictionLog] duplicate report_id+type, ignored");
      return;
    }
    console.warn("[insertClassificationPredictionLog] insert failed:", error.message);
  }
}

export function mapLabelToCategory(label: string): string | null {
  if (!label) return null;
  const labelLower = label.toLowerCase();

  const semanticMap: Record<string, string[]> = {
    iluminacao: ["poste", "luz", "lampada", "lâmpada", "escuro", "escuridão", "iluminação", "apagado", "queimado", "caído", "caido", "torto", "inclinado", "pendendo"],
    pavimentacao: ["pavimentação", "pavimentacao", "recape", "asfaltamento", "capeamento", "fresagem", "cbuq", "obra de pavimento"],
    sinalizacao: ["semáforo", "semaforo", "sinalização", "sinalizacao", "faixa", "pedestre", "placa", "sinal"],
    drenagem: ["drenagem", "água pluvial", "pluvial", "galeria", "sarjeta", "chuva", "bueiro pluvial"],
    via_publica: ["buraco", "asfalto", "rua", "via", "cratera", "pista", "erosão", "desmoronamento", "lombada"],
    calcada: ["calçada", "calcada", "passeio", "guia", "meio-fio", "rampa", "acessibilidade"],
    lixo: ["lixo", "entulho", "sujeira", "descarte", "resíduo", "coleta", "lixeira", "container", "caçamba"],
    esgoto: ["esgoto", "bueiro", "água", "alagamento", "vazamento", "enchente", "inundação", "transbordando", "tampa"],
    area_verde: ["árvore", "arvore", "mato", "praça", "praca", "parque", "jardim", "galho", "poda", "raiz", "vegetação", "capim"],
    poluicao: ["barulho", "ruído", "ruido", "som", "música", "musica", "fumaça", "fumaca", "poluição", "poluicao", "festa", "bar", "buzina", "alarme"],
    animais: ["rato", "ratazana", "barata", "animal", "bicho", "inseto", "escorpião", "escorpiao", "cobra", "pombo", "infestação", "mosquito"],
    higiene_urbana: ["fedor", "cheiro", "urina", "fezes", "podre", "fedendo", "imundo", "nojento", "sujo", "defecação"],
  };

  for (const [category, keywords] of Object.entries(semanticMap)) {
    if (keywords.some((kw) => labelLower.includes(kw))) {
      return category;
    }
  }

  return null;
}
