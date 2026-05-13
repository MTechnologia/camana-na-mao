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

export function extractChamberFields(context: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    category: "feedback_camara",
  };

  if (
    context.includes("elogiar") ||
    context.includes("elogio") ||
    context.includes("agradecer") ||
    context.includes("parabenizar")
  ) {
    fields.subcategory = "elogio";
  } else if (
    context.includes("reclamar") ||
    context.includes("reclamação") ||
    context.includes("reclamacao") ||
    context.includes("denunciar") ||
    context.includes("denúncia")
  ) {
    fields.subcategory = "reclamacao";
  } else if (context.includes("sugestão") || context.includes("sugestao") || context.includes("sugerir")) {
    fields.subcategory = "sugestao";
  }

  const namePatterns = [
    /(?:vereador|vereadora)\s+([a-záàâãéèêíïóôõöúç\s]+?)(?:\s+por|\s+pelo|\s*,|\s+é|\s+foi|$)/i,
    /(?:ao|à|a)\s+(?:vereador|vereadora)\s+([a-záàâãéèêíïóôõöúç\s]+?)(?:\s+por|\s+pelo|\s*,|$)/i,
  ];

  for (const pattern of namePatterns) {
    const match = context.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      const rawName = match[1].trim();
      const validation = findCouncilMemberMatches(rawName);

      if (validation.found && validation.matches.length === 1) {
        fields.council_member_name = validation.matches[0].name;
        fields.council_member_party = validation.matches[0].party;
      } else {
        fields.council_member_name = rawName;
        fields._ambiguous_name = true;
        fields._possible_matches = validation.matches.map((m) => `${m.name} (${m.party})`);
      }
      break;
    }
  }

  return fields;
}
