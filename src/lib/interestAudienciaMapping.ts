/**
 * Mapeia categorias de interesse do perfil (user_interests.interest_category)
 * para temas de audiência usados em alertas e filtros (audiencia_topic_alerts.tema).
 */
export const INTEREST_TO_AUDIENCIA_TEMA: Record<string, string> = {
  legislativo: "Legislativo",
  mobilidade: "Mobilidade",
  cultura: "Cultura",
  saude: "Saúde",
  educacao: "Educação",
  meio_ambiente: "Meio Ambiente",
  habitacao: "Urbanismo",
  economia: "Economia",
};

/** Temas extras no app (não vêm do perfil de interesses). */
export const EXTRA_AUDIENCIA_TOPICS = ["Segurança", "Esportes"] as const;

/** Rótulos para busca textual quando não há tema canônico em alertas. */
export const INTEREST_SEARCH_LABEL: Record<string, string> = {
  legislativo: "Legislativo",
  economia: "Economia",
  ...INTEREST_TO_AUDIENCIA_TEMA,
};

/**
 * Sinônimos para casar com tema/comissão/título reais no banco
 * (ex.: comissão "Trânsito e Transportes" para interesse mobilidade).
 */
export const INTEREST_SEARCH_SYNONYMS: Record<string, string[]> = {
  mobilidade: ["mobilidade", "transporte", "trânsito", "transito", "ônibus", "onibus"],
  saude: ["saúde", "saude", "hospital", "ubs"],
  educacao: ["educação", "educacao", "ensino", "escola"],
  cultura: ["cultura", "cultural", "arte"],
  meio_ambiente: ["meio ambiente", "ambiental", "sustentabilidade", "verde"],
  habitacao: ["habitação", "habitacao", "urbanismo", "moradia", "fundiário", "fundiario"],
  legislativo: ["legislativo", "legislação", "legislacao", "lei", "plenário", "plenario"],
  economia: ["economia", "econômico", "economico", "emprego", "comércio", "comercio"],
};

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function interestCategoryToAudienciaTema(category: string): string | null {
  const key = category.trim().toLowerCase();
  return INTEREST_TO_AUDIENCIA_TEMA[key] ?? null;
}

export function interestCategoriesToAudienciaTemas(categories: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cat of categories) {
    const tema = interestCategoryToAudienciaTema(cat);
    if (tema && !seen.has(tema)) {
      seen.add(tema);
      out.push(tema);
    }
  }
  return out;
}

/** Temas do perfil + opcionais (Segurança, Esportes), sem duplicar. */
export function buildAudienciaTopicsForUi(profileCategories: string[]): {
  fromProfile: string[];
  optional: string[];
  all: string[];
} {
  const fromProfile = interestCategoriesToAudienciaTemas(profileCategories);
  const profileSet = new Set(fromProfile);
  const optional = EXTRA_AUDIENCIA_TOPICS.filter((t) => !profileSet.has(t));
  return { fromProfile, optional, all: [...fromProfile, ...optional] };
}

export function interestCategoriesToSearchTerms(categories: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cat of categories) {
    const key = cat.trim().toLowerCase();
    const synonyms = INTEREST_SEARCH_SYNONYMS[key] ?? [];
    const label = INTEREST_SEARCH_LABEL[key] ?? INTEREST_TO_AUDIENCIA_TEMA[key];
    const candidates = label ? [label, ...synonyms] : synonyms;
    for (const term of candidates) {
      const norm = normalizeForMatch(term);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        out.push(term);
      }
    }
  }
  return out;
}

/** Filtro PostgREST (.or) para audiências futuras alinhadas aos interesses. */
export function buildAudienciasInterestOrFilter(terms: string[]): string {
  const parts: string[] = [];
  for (const term of terms) {
    const safe = term.trim().replace(/%/g, "");
    if (!safe) continue;
    parts.push(`tema.ilike.%${safe}%`);
    parts.push(`titulo.ilike.%${safe}%`);
    parts.push(`descricao.ilike.%${safe}%`);
    parts.push(`comissao.ilike.%${safe}%`);
  }
  return parts.join(",");
}

export function audienciaMatchesInterestTerms(
  audiencia: {
    tema?: string | null;
    titulo?: string | null;
    descricao?: string | null;
    comissao?: string | null;
  },
  searchTerms: string[],
): boolean {
  if (searchTerms.length === 0) return false;
  const haystack = normalizeForMatch(
    [audiencia.tema, audiencia.titulo, audiencia.descricao, audiencia.comissao]
      .filter(Boolean)
      .join(" "),
  );
  return searchTerms.some((term) => haystack.includes(normalizeForMatch(term)));
}
