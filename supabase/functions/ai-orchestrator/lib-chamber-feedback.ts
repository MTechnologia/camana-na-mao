export const COUNCIL_MEMBERS = [
  { name: "Milton Leite", party: "UNIÃO" },
  { name: "Rubinho Nunes", party: "UNIÃO" },
  { name: "Rodrigo Goulart", party: "PSD" },
  { name: "Celso Giannazi", party: "PSOL" },
  { name: "Soninha Francine", party: "CIDADANIA" },
  { name: "Erika Hilton", party: "PSOL" },
  { name: "Amanda Paschoal", party: "PSOL" },
  { name: "Luna Zarattini", party: "PT" },
  { name: "Janaína Lima", party: "PP" },
  { name: "Rinaldi Digilio", party: "REPUBLICANOS" },
  { name: "José Turin", party: "REPUBLICANOS" },
  { name: "José Ferreira", party: "MDB" },
  { name: "Juliana Cardoso", party: "PT" },
  { name: "Eduardo Suplicy", party: "PT" },
  { name: "Rute Costa", party: "PL" },
  { name: "Thammy Miranda", party: "PL" },
  { name: "Ricardo Teixeira", party: "UNIÃO" },
  { name: "Eliseu Gabriel", party: "PSB" },
  { name: "Atílio Francisco", party: "REPUBLICANOS" },
  { name: "Eli Corrêa", party: "UNIÃO" },
  { name: "Zé Luiz", party: "REPUBLICANOS" },
  { name: "Professor Toninho Vespoli", party: "PSOL" },
  { name: "Sandra Tadeu", party: "PL" },
  { name: "Fabio Riva", party: "MDB" },
  { name: "Senival Moura", party: "PT" },
  { name: "Tito Bernardes", party: "PSDB" },
];

export function findCouncilMemberMatches(
  partialName: string,
): { found: boolean; matches: Array<{ name: string; party: string }>; suggestion?: string } {
  const nameLower = partialName.toLowerCase().trim();

  const exactMatch = COUNCIL_MEMBERS.find((v) => v.name.toLowerCase() === nameLower);
  if (exactMatch) {
    return { found: true, matches: [exactMatch], suggestion: `${exactMatch.name} (${exactMatch.party})` };
  }

  const matches = COUNCIL_MEMBERS.filter((v) => {
    const vLower = v.name.toLowerCase();
    const parts = vLower.split(" ");
    return parts.some((part) => part.startsWith(nameLower) || nameLower.startsWith(part)) || vLower.includes(nameLower);
  });

  if (matches.length === 1) {
    return { found: true, matches, suggestion: `${matches[0].name} (${matches[0].party})` };
  }

  if (matches.length > 1) {
    return { found: false, matches: matches.slice(0, 5), suggestion: undefined };
  }

  return { found: false, matches: [], suggestion: undefined };
}

/**
 * Detecta se um texto é apenas a FRASE DE INTENÇÃO/SELEÇÃO do fluxo de feedback à Câmara
 * ("quero falar sobre um vereador", "feedback sobre o vereador", "Vereador(a): Nome (PARTIDO)"),
 * e NÃO a mensagem real do feedback. Usado para não aceitar a frase-gatilho como descrição —
 * o cidadão ainda precisa contar o que quer elogiar/reclamar/sugerir.
 *
 * Falso-positivo aqui é barato (o bot só repete "o que você quer elogiar?"); falso-negativo
 * é caro (registra um relato sem conteúdo). Por isso o limiar de tamanho é conservador.
 */
export function isChamberIntentOrSelectionText(description: string): boolean {
  const d = (description ?? "").toLowerCase().trim();
  if (d.length < 12) return true; // curto demais para ser um feedback real
  if (/^vereador(?:\(a\)|a)?\s*:/.test(d)) return true; // marcador de seleção do picker
  const mentionsVereador = /\bvereador/.test(d);
  const startsWithIntent =
    /^(quero|preciso|gostaria|gostara|vou|vim|desejo|pretendo)\b/.test(d) ||
    /^(falar|feedback|dar\s+feedback|deixar\s+feedback)\b/.test(d);
  // Frase curta de intenção mencionando "vereador" sem conteúdo do feedback.
  if (mentionsVereador && startsWithIntent && d.length < 45) return true;
  if (/^feedback\s+sobre\s+(um|o|a)?\s*vereador/.test(d)) return true;
  return false;
}

export function extractChamberFields(context: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    category: "feedback_camara",
  };

  // A natureza vai em `report_nature` (campo que o fluxo de coleta consome) — assim
  // "Quero elogiar/reclamar/sugerir a um vereador" NÃO pergunta o tipo de novo.
  if (
    context.includes("elogiar") ||
    context.includes("elogio") ||
    context.includes("agradecer") ||
    context.includes("parabenizar")
  ) {
    fields.report_nature = "elogio";
    fields.subcategory = "elogio";
  } else if (
    context.includes("reclamar") ||
    context.includes("reclamação") ||
    context.includes("reclamacao") ||
    context.includes("denunciar") ||
    context.includes("denúncia")
  ) {
    fields.report_nature = "reclamacao";
    fields.subcategory = "reclamacao";
  } else if (context.includes("sugestão") || context.includes("sugestao") || context.includes("sugerir")) {
    fields.report_nature = "sugestao";
    fields.subcategory = "sugestao";
  }

  const namePatterns = [
    /(?:vereador|vereadora)\s+([a-záàâãéèêíïóôõöúç\s]+?)(?:\s+por|\s+pelo|\s*,|\s+é|\s+foi|$)/i,
    /(?:ao|à|a)\s+(?:vereador|vereadora)\s+([a-záàâãéèêíïóôõöúç\s]+?)(?:\s+por|\s+pelo|\s*,|$)/i,
  ];

  // Só preenche council_member_name quando o trecho capturado corresponde a UM
  // vereador real da lista oficial. Caso contrário NÃO seta o campo: o trecho após
  // "vereador" pode ser a própria natureza ("...sobre um vereador elogio") ou um nome
  // inexistente. Um valor não validado aqui suprimia o [VEREADOR_PICKER] na coleta
  // (getNextMissingField só checa se o campo está vazio) e o relato saía sem vereador.
  for (const pattern of namePatterns) {
    const match = context.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      const validation = findCouncilMemberMatches(match[1].trim());
      if (validation.found && validation.matches.length === 1) {
        fields.council_member_name = validation.matches[0].name;
        fields.council_member_party = validation.matches[0].party;
        break;
      }
      // Capturou algo que não é um vereador real → segue sem setar (o picker pedirá a seleção).
    }
  }

  return fields;
}
