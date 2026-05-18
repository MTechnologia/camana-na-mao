/** Mantido em sincronia com src/lib/interestAudienciaMapping.ts */
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

export function interestCategoriesToAudienciaTemas(categories: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cat of categories) {
    const key = cat.trim().toLowerCase();
    const tema = INTEREST_TO_AUDIENCIA_TEMA[key];
    if (tema && !seen.has(tema)) {
      seen.add(tema);
      out.push(tema);
    }
  }
  return out;
}
