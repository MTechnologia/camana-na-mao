import type { SupabaseClient } from "@supabase/supabase-js";

import { isValidUrbanReportDescription } from "./lib-nlp-utils.ts";

export const VALID_URBAN_CATEGORIES = [
  "iluminacao", "calcada", "via_publica", "pavimentacao", "sinalizacao", "drenagem", "lixo", "esgoto",
  "area_verde", "higiene_urbana", "animais", "poluicao", "feedback_camara", "outro",
] as const;

/**
 * Apelidos comuns (LLM/parser) que devem mapear para a categoria canônica — evita REJEITAR
 * (ou persistir) uma categoria quase-certa como inválida. Ex.: a LLM às vezes responde "verde"
 * em vez de "area_verde", ou devolve a variante acentuada ("iluminação", "poluição").
 */
const URBAN_CATEGORY_ALIASES: Record<string, string> = {
  "verde": "area_verde",
  "área verde": "area_verde",
  "area verde": "area_verde",
  "áreas verdes": "area_verde",
  "areas verdes": "area_verde",
  "iluminação": "iluminacao",
  "sinalização": "sinalizacao",
  "poluição": "poluicao",
  "pavimentação": "pavimentacao",
  "calçada": "calcada",
  "câmara": "feedback_camara",
  "feedback câmara": "feedback_camara",
  "feedback camara": "feedback_camara",
};

/** Normaliza apelidos/variantes para a categoria canônica; mantém o valor (em minúsculas) se não houver apelido. */
export function normalizeUrbanCategoryAlias(category: string | null | undefined): string {
  const c = String(category ?? "").trim().toLowerCase();
  return URBAN_CATEGORY_ALIASES[c] ?? c;
}

export const URBAN_RISK_COLLECTION_CATEGORIES: readonly string[] = [
  "via_publica",
  "pavimentacao",
  "iluminacao",
  "esgoto",
  "area_verde",
  "calcada",
  "sinalizacao",
  "drenagem",
  "poluicao",
  "lixo",
  "higiene_urbana",
  "animais",
  "outro",
];

export const URBAN_REPORT_NATURE_VALUES = ["reclamacao", "duvida", "sugestao", "elogio"] as const;
export type UrbanReportNature = (typeof URBAN_REPORT_NATURE_VALUES)[number];

export const REPORT_NATURE_LABELS: Record<UrbanReportNature, string> = {
  reclamacao: "Reclamação",
  duvida: "Dúvida",
  sugestao: "Sugestão",
  elogio: "Elogio",
};

const URBAN_PREVIEW_RISK_LEVEL_LABELS: Record<string, string> = {
  critical: "Crítico",
  moderate: "Moderado",
  low: "Baixo",
  none: "Nenhum",
};

const URBAN_PREVIEW_AFFECTED_SCOPE_LABELS: Record<string, string> = {
  individual: "Individual",
  local: "Local (rua/quadra)",
  street: "Toda a rua",
  neighborhood: "Bairro",
  regional: "Regional (bairro)",
  citywide: "Cidade toda",
};

const URBAN_PREVIEW_RISK_TYPE_LABELS: Record<string, string> = {
  electrical: "Elétrico",
  traffic: "Trânsito",
  flooding: "Alagamento",
  structural: "Estrutural",
  health: "Saúde",
  fire: "Incêndio",
  pedestrian: "Pedestre",
  vehicle: "Veicular",
  environmental: "Ambiental",
};

export function formatUrbanReportPreviewAfterCategory(fields: Record<string, unknown>): string {
  const sub = fields.subcategory;
  if (sub == null || String(sub).trim() === "") return "";
  return `\n• **Tipo / detalhe:** ${String(sub).trim()}`;
}

export function formatUrbanReportPreviewAfterDescription(fields: Record<string, unknown>): string {
  const chunks: string[] = [];
  const rl = fields.risk_level;
  if (rl != null && String(rl).trim() !== "") {
    const key = String(rl).toLowerCase();
    const label = URBAN_PREVIEW_RISK_LEVEL_LABELS[key] ?? String(rl);
    chunks.push(`• **Gravidade:** ${label}`);
  }
  const rt = fields.risk_types;
  if (Array.isArray(rt) && rt.length > 0) {
    const joined = rt
      .map((x) => {
        const k = String(x).trim().toLowerCase();
        return URBAN_PREVIEW_RISK_TYPE_LABELS[k] ?? String(x).trim();
      })
      .filter(Boolean)
      .join(", ");
    if (joined) chunks.push(`• **Tipos de risco:** ${joined}`);
  }
  const af = fields.affected_scope;
  if (af != null && String(af).trim() !== "") {
    const key = String(af).toLowerCase();
    const label = URBAN_PREVIEW_AFFECTED_SCOPE_LABELS[key] ?? String(af);
    chunks.push(`• **Afetação:** ${label}`);
  }
  const cep = fields.cep;
  if (cep != null && String(cep).trim() !== "") {
    chunks.push(`• **CEP:** ${String(cep).trim()}`);
  }
  return chunks.length ? `\n${chunks.join("\n")}` : "";
}

export function normalizeReportNature(raw: string | undefined | null): UrbanReportNature | null {
  if (raw == null || String(raw).trim() === "") return null;
  const s = String(raw).trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (/^reclam/.test(s) || s === "reclamacao") return "reclamacao";
  if (/^duvid/.test(s) || s === "duvida") return "duvida";
  if (/^sugest/.test(s) || s === "sugestao") return "sugestao";
  if (/^elog/.test(s) || s === "elogio") return "elogio";
  return null;
}

export function isBareUrbanReportNatureReply(text: string): boolean {
  const t = text.trim().replace(/\.+$/g, "").trim();
  if (!t || t.length > 28) return false;
  if (/\s/.test(t)) return false;
  return normalizeReportNature(t) !== null;
}

const URBAN_NON_COMPLAINT_NATURES: UrbanReportNature[] = ["duvida", "sugestao", "elogio"];

/** Dúvida, sugestão e elogio não exigem endereço nem coleta de "problema" no local. */
export function urbanNatureSkipsLocationCollection(
  reportNature: string | undefined | null,
): boolean {
  const nature = normalizeReportNature(reportNature);
  return nature != null && URBAN_NON_COMPLAINT_NATURES.includes(nature);
}

/** Dúvida/sugestão/elogio com descrição e categoria → turno conversacional via LLM, sem auto-registro. */
export function isUrbanNonComplaintReadyForLlmTurn(
  fields: Record<string, unknown>,
): boolean {
  const nature = normalizeReportNature(
    fields.report_nature != null ? String(fields.report_nature) : null,
  );
  if (!nature || !URBAN_NON_COMPLAINT_NATURES.includes(nature)) return false;
  if (!fields.category) return false;
  // Feedback à Câmara sobre um vereador (elogio/sugestão) é REGISTRO formal
  // (feedback_camara), não conversa — segue para a coleta determinística (vereador →
  // tipo → mensagem) e o fechamento oferece a avaliação do canal (estrelas). Exceção:
  // dúvida sobre a Câmara permanece conversacional (é pergunta, não feedback a registrar).
  if (String(fields.category) === "feedback_camara" && nature !== "duvida") return false;
  const desc = String(fields.description ?? "").trim();
  if (!desc) return false;
  return isValidUrbanReportDescription(desc, nature);
}

/** @deprecated Use isUrbanNonComplaintReadyForLlmTurn — mantido para compatibilidade de testes. */
export function isUrbanDuvidaReadyForAnswer(fields: Record<string, unknown>): boolean {
  const nature = normalizeReportNature(
    fields.report_nature != null ? String(fields.report_nature) : null,
  );
  return nature === "duvida" && isUrbanNonComplaintReadyForLlmTurn(fields);
}

export function buildUrbanNonComplaintLlmInstruction(
  fields: Record<string, unknown>,
): string {
  const nature = normalizeReportNature(
    fields.report_nature != null ? String(fields.report_nature) : null,
  );
  const description = String(fields.description ?? "").trim();
  const excerpt = description.slice(0, 300) + (description.length > 300 ? "…" : "");

  if (nature === "sugestao") {
    return `\n\n**MODO SUGESTÃO URBANA:** O cidadão compartilhou uma **ideia de melhoria** (não um problema pontual em endereço).
- **RECONHEÇA** a sugestão com empatia e objetividade.
- Se útil, oriente canais oficiais da Câmara usando \`search_knowledge_base\` quando aplicável (NÃO encaminhe para 156/Prefeitura/secretarias do Executivo).
- **NÃO** peça CEP, GPS, "onde fica o problema", gravidade, afetação nem relatos próximos.
- **NÃO** chame \`create_urban_report\` nesta resposta — converse sobre a ideia; registro formal só se o cidadão pedir depois.
- **NÃO** sugira encaminhamento para vereador neste fluxo informativo.
- Encerre com frase curta; **sem** \`[SHOW_SERVICES_CHIPS]\` nem pedido de avaliação (o app oferece estrelas após agradecimento).
- Sugestão do cidadão: "${excerpt}"`;
  }

  if (nature === "elogio") {
    return `\n\n**MODO ELOGIO URBANO:** O cidadão compartilhou um **reconhecimento positivo** (não um problema a registrar em endereço).
- **AGRADEÇA** o elogio com calor humano e objetividade.
- Valorize o que está funcionando bem; se fizer sentido, mencione como a Câmara pode dar visibilidade a boas práticas.
- **NÃO** peça CEP, GPS, "onde fica o problema", gravidade, afetação nem relatos próximos.
- **NÃO** chame \`create_urban_report\` nesta resposta — converse sobre o elogio; registro formal só se o cidadão pedir depois.
- **NÃO** sugira encaminhamento para vereador neste fluxo informativo.
- Encerre com frase curta; **sem** \`[SHOW_SERVICES_CHIPS]\` nem pedido de avaliação (o app oferece estrelas após agradecimento).
- Elogio do cidadão: "${excerpt}"`;
  }

  return `\n\n**MODO DÚVIDA URBANA (OBRIGATÓRIO):** O cidadão fez uma **pergunta** (não um relato de problema em endereço fixo).
- **RESPONDA PRIMEIRO E DIRETAMENTE** à pergunta literal abaixo, em 2–4 parágrafos curtos e linguagem simples.
- Se existir bloco \`[Contexto da base (dúvida urbana)]\` no sistema, use **somente** trechos que respondem à pergunta; não repita lista genérica da Câmara.
- Se existir bloco \`[Contexto dúvida urbana — sem trecho na base]\`, diga com honestidade que a base da Câmara não tem detalhe operacional sobre o tema; explique **brevemente** o papel da Câmara (fiscalizar, propor leis, audiências) **sem inventar** procedimentos. Em caso de emergência, pode citar 190/192/193; NÃO encaminhe para 156/Prefeitura/secretarias do Executivo.
- **PROIBIDO** nesta resposta: listar Portal da Câmara, Presidência, vereadores, transparência, biblioteca ou estrutura institucional — **salvo** se a pergunta for especificamente sobre a Câmara.
- **NÃO** invoque \`search_knowledge_base\` com termos genéricos ("câmara", "vereadores", "estrutura"); a busca já foi feita pelo sistema.
- **NÃO** peça CEP, GPS, "onde fica o problema", gravidade, afetação nem relatos próximos.
- **NÃO** chame \`create_urban_report\` nesta resposta — só esclareça a dúvida.
- **NÃO** sugira encaminhamento para vereador nem liste vereadores neste fluxo.
- Ao terminar a resposta, encerre com **uma frase curta** (ex.: "Se quiser aprofundar algum ponto, é só perguntar.") — **sem** despedida longa, **sem** \`[SHOW_SERVICES_CHIPS]\` e **sem** pedir avaliação (o app oferece estrelas quando o cidadão agradecer).
- Pergunta do cidadão: "${excerpt}"`;
}

export function urbanNonComplaintLlmStatusLine(
  fields: Record<string, unknown>,
): string {
  const nature = normalizeReportNature(
    fields.report_nature != null ? String(fields.report_nature) : null,
  );
  if (nature === "sugestao") {
    return "\n**STATUS:** Reconheça e converse sobre a sugestão (modo informativo). Não finalize registro de relato.";
  }
  if (nature === "elogio") {
    return "\n**STATUS:** Agradeça e converse sobre o elogio (modo informativo). Não finalize registro de relato.";
  }
  return "\n**STATUS:** Responda à dúvida do cidadão (modo informativo). Não finalize registro de relato.";
}

/** Dúvida, sugestão e elogio não passam pelo menu de tema de reclamação (buraco, iluminação…). */
export function applyUrbanNatureCategoryDefaults(
  fields: Record<string, unknown>,
  generateLabelFromDescription: (description: string) => string,
): void {
  const nature = normalizeReportNature(
    fields.report_nature != null ? String(fields.report_nature) : null,
  );
  if (!nature || nature === "reclamacao" || fields.category) return;

  const description = String(fields.description ?? "").trim();
  if (!description) return;

  const dl = description.toLowerCase();
  if (
    nature === "duvida" &&
    /c[âa]mara|vereador|legislativ|plen[aá]rio|comiss[ãa]o|infraestrutura\s+da\s+c[âa]mara/i.test(dl)
  ) {
    fields.category = "feedback_camara";
  } else {
    fields.category = "outro";
  }
  fields.subcategory = generateLabelFromDescription(description);
  fields._auto_classified = true;
  fields._nature_non_complaint = true;
}

const URBAN_INCIDENT_STARTER_PATTERNS: RegExp[] = [
  /inc[eê]ndio|incendio|pegando\s*fogo|em\s*chamas|queimando/i,
  /alagando|alagada|alagado|alagamento|rua\s+alag|enchente|inundando|inundada|inundado|inundou|água\s*subindo|agua\s*subindo|chovendo\s*(muito\s*)?(forte|pesad)|chuva\s*(muito\s*)?(forte|pesad)/i,
  /fios?\s*expostos|cabos?\s*soltos|choque\s*el[eé]tric/i,
  /explos[aã]o|transformador/i,
  /desabamento|desmoron|risco\s*de\s*desab/i,
  /acidente|atropelamento/i,
  /armado|tirote|viol[eê]ncia|tr[aá]fico\s*de\s*droga|drogas?\s*na\s*rua/i,
];

export function messageLooksLikeUrbanIncidentStarter(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  return URBAN_INCIDENT_STARTER_PATTERNS.some((p) => p.test(t));
}

export const classifiedCategories = new Map<string, { category: string; confidence: number; user_confirmed: boolean }>();

export function extractUrbanFields(context: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const cepMatch = context.match(/\b(\d{5}[-]?\d{3})\b/);
  if (cepMatch) {
    fields.cep = cepMatch[1].replace("-", "");
  }
  return fields;
}

export function autoClassifyCategory(description: string): {
  category: string | null;
  confidence: number;
  suggestedLabel: string | null;
} {
  const desc = description.toLowerCase();

  const labelPatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /inc[eê]ndio|pegando\s*fogo|em\s*chamas|pr[eé]dio.*(fogo|chamas|inc[eê]ndio)/i, label: "Incêndio / Fogo" },
    { pattern: /polui[çc][ãa]o\s*(sonora|ac[uú]stica)|polui[çc][ãa]o\s+(causada\s+)?(por|pelo|de)\s*(barulho|som|ru[ií]do|incomod)/i, label: "Perturbação Sonora" },
    { pattern: /fuma[çc]a|queimada|fumacca|chamin[ée]/, label: "Poluição Atmosférica" },
    { pattern: /polui[çc][ãa]o\s*(atmosf|ambiental|do\s*ar|visual|lumin|h[íi]dric)/i, label: "Poluição Ambiental" },
    { pattern: /som\s*alto|m[úu]sica\s*alta|musica\s*alta/, label: "Perturbação Sonora" },
    { pattern: /bar\s*(barulho|barulhento|som|muito)?|balada|danceteria|boate|casa\s*noturna/, label: "Estabelecimento Barulhento" },
    { pattern: /festa|evento|show/, label: "Evento com Barulho" },
    { pattern: /vizinho\s*(barulho|som|incomoda)?/, label: "Perturbação por Vizinho" },
    { pattern: /obra\s*(barulho|cedo|madrugada|domingo)?/, label: "Barulho de Obra" },
    { pattern: /buzina|alarme/, label: "Poluição Sonora" },
    { pattern: /latido|cachorro|cao|cães/, label: "Barulho de Animais" },
    { pattern: /contamina[çc][ãa]o|qu[ií]mico|t[óo]xico|emiss[aã]o\s+(de\s*)?(g[áa]s|poluente)/i, label: "Contaminação Ambiental" },
    { pattern: /carro\s*abandonad|ve[íi]culo\s*abandonad|moto\s*abandonad/, label: "Veículo Abandonado" },
    { pattern: /invas[ãa]o|ocupação\s*irregular|invadid/, label: "Ocupação Irregular" },
    { pattern: /obra\s*(irregular|sem\s*alvara|ilegal)/, label: "Obra Irregular" },
    { pattern: /com[ée]rcio\s*irregular|ambulante|camelô/, label: "Comércio Irregular" },
    { pattern: /ponto\s*de\s*drogas|tr[áa]fico/, label: "Atividade Ilícita" },
    { pattern: /morador\s*de\s*rua|pessoa\s*em\s*situa[çc][ãa]o/, label: "Questão Social" },
    { pattern: /seguran[çc]a|perigoso|assalto|roubo/, label: "Questão de Segurança" },
    { pattern: /poste\s*(ca[íi]d|quebrad|danificad|torto|pendend|inclinad|pend[êe]nd)/i, label: "Poste com Problema" },
    { pattern: /poste\s*(apagad|sem\s*luz|escuro)/i, label: "Poste Apagado" },
    { pattern: /sem\s*luz|falta\s*de?\s*luz|luz\s*apagad/i, label: "Falta de Iluminação" },
    { pattern: /l[âa]mpada\s*(queimad|apagad|quebrad)/i, label: "Lâmpada Queimada" },
    { pattern: /escuro|escurid[ãa]o|sem\s*ilumina/i, label: "Área Escura" },
    { pattern: /buraco\s*(grande|enorme|perigoso|gigante|profundo)?/i, label: "Buraco na Via" },
    { pattern: /asfalto\s*(danificad|quebrad|esburacad|afundad)/i, label: "Asfalto Danificado" },
    { pattern: /rua\s*(esburacad|quebrad|danificad|afundad)/i, label: "Rua Danificada" },
    { pattern: /cratera|erosão|desmoron/i, label: "Erosão/Cratera" },
    { pattern: /sem[áa]foro\s*(quebrad|apagad|com\s*defeito|danificad|não\s*funciona)/i, label: "Semáforo com Defeito" },
    { pattern: /sinaliza[çc][ãa]o\s*(apagad|quebrad|danificad|suja)/i, label: "Sinalização Danificada" },
    { pattern: /faixa\s*(apagad|suja)/i, label: "Faixa de Pedestre Apagada" },
    { pattern: /bueiro\s*(entupid|transbordand|aberto|tampa|solto)/i, label: "Bueiro com Problema" },
    { pattern: /tampa\s*(solt|faltand|aberta|quebrad)/i, label: "Tampa Solta" },
    { pattern: /alagamento|alagad[oa]|enchente|inundad/i, label: "Alagamento" },
    { pattern: /vazamento\s*(de\s*[áa]gua)?/i, label: "Vazamento de Água" },
    { pattern: /esgoto\s*(aberto|vazand|fedend|estoura)/i, label: "Problema de Esgoto" },
    { pattern: /água\s*(suja|parad|acumulad)/i, label: "Água Parada" },
    { pattern: /[áa]rvore\s*(ca[íi]d|caind|risco|pendend|quebrad)/i, label: "Árvore com Risco" },
    { pattern: /galho\s*(ca[íi]d|quebrad|solto|pendend)/i, label: "Galho Caído" },
    { pattern: /ra[íi]z\s*(expost|levant|danificand)/i, label: "Raiz Exposta" },
    { pattern: /mato\s*(alto|crescend)|capim\s*alto/i, label: "Mato Alto" },
    { pattern: /poda|podand|precisa\s*podar/i, label: "Necessidade de Poda" },
    { pattern: /cal[çc]ada\s*(quebrad|danificad|esburacad|irregular)/i, label: "Calçada Danificada" },
    { pattern: /meio[\s-]?fio\s*(quebrad|danificad|solto)/i, label: "Meio-fio Danificado" },
    { pattern: /rampa\s*(de\s*acessibilidade)?/i, label: "Problema de Acessibilidade" },
    { pattern: /lixo\s*(acumulad|na\s*rua|jogad|espalh)/i, label: "Lixo Acumulado" },
    { pattern: /entulho\s*(na\s*rua|jogad)?/i, label: "Entulho na Via" },
    { pattern: /coleta\s*(atrasad|não\s*passou)/i, label: "Coleta Atrasada" },
    { pattern: /lixeira\s*(quebrad|chei|transbord)/i, label: "Lixeira com Problema" },
    { pattern: /rato|ratos|ratazana/i, label: "Infestação de Ratos" },
    { pattern: /barata|baratas/i, label: "Infestação de Baratas" },
    { pattern: /escorpi[ãa]o|escorpiões/i, label: "Escorpiões" },
    { pattern: /animal\s*(mort|atropela|abandon)/i, label: "Animal Morto/Abandonado" },
    { pattern: /inseto|mosquito|pernilongo/i, label: "Infestação de Insetos" },
    { pattern: /fedor|fedend|mau\s*cheiro/i, label: "Mau Cheiro" },
    { pattern: /urina|fezes|coc[ôo]/i, label: "Sujeira Orgânica" },
    { pattern: /suj[oa]|imundo|nojent/i, label: "Local Sujo" },
  ];

  let suggestedLabel: string | null = null;
  for (const lp of labelPatterns) {
    if (lp.pattern.test(desc)) {
      suggestedLabel = lp.label;
      break;
    }
  }

  const patterns: Array<{ keywords: RegExp; category: string; weight: number }> = [
    { keywords: /inc[eê]ndio|incendio|pegando\s*fogo|em\s*chamas|queimando|pr[eé]dio\s*(abandonad\w*\s*)?(em\s*)?(chamas|fogo|inc[eê]ndio)|fogo\s*(no|na|em)\s*pr[eé]dio/i, category: "outro", weight: 9.5 },
    { keywords: /vazamento|alagamento|alagad[oa]|água\s*na\s*rua|bueiro\s*(entupido|transbordando|aberto|tampa)|esgoto|córrego|valeta|enchente|inundad?[oa]?|transbord/i, category: "esgoto", weight: 10 },
    { keywords: /poste\s*(apagad|sem\s*luz|queimad|ca[íi]d|quebrad|danificad|torto|pendend|inclinad)|luz\s*(apagad|queimad)|ilumina[çc][ãa]o|sem\s*luz|escuro|escurid[ãa]o|l[âa]mpada\s*(queimad|apagad|quebrad)|falta\s*de\s*(luz|energia)|sem\s*energia|queda\s*de\s*energia|apag[ãa]o/i, category: "iluminacao", weight: 9 },
    { keywords: /polui[çc][ãa]o\s*(sonora|ac[uú]stica)|polui[çc][ãa]o\s+(causada\s+)?(por|pelo|de)\s*(barulho|som|ru[ií]do)|som\s*alto|m[úu]sica\s*alta|musica\s*alta|bar\s*(com\s*)?(som|barulho|barulhento)|balada|danceteria|boate|casa\s*noturna|festa\s*(barulho|vizinho)?|vizinho\s*(barulho|som)|perturba[cç][aã]o\s*sonora|perturbacao\s*sonora|perturba[cç][aã]o\s+ac[uú]stica|madrugada.*barulho|barulho.*madrugada/i, category: "poluicao", weight: 9 },
    { keywords: /pavimenta[çc][ãa]o|pavimentacao|recape|recapeamento|asfaltamento|capeamento|fresagem|cbuq|obra\s*(de\s*)?paviment|requalifica[çc][ãa]o\s*vi[áa]ria|restaura[çc][ãa]o\s*asf[áa]ltica|revestimento\s*asf[áa]ltico/i, category: "pavimentacao", weight: 8.6 },
    { keywords: /sem[áa]foro|sinaliza[çc][ãa]o\s*(vertical|horizontal)?|faixa\s*(de\s*pedestre|apagad)|placa\s*(de\s*sinal|ca[íi]d|quebrad)?|sinal\s*(quebrad|apagad|piscando)?|demarca[çc][ãa]o|repintura|zebr(?:a)?/i, category: "sinalizacao", weight: 8.5 },
    { keywords: /drenagem|água\s*pluvial|agua\s*pluvial|pluvial|galeria\s*(de\s*águas|pluvial)?|sarjeta|bueiro\s*pluvial|bueiro\s*de\s*chuva|água\s*da\s*chuva|agua\s*da\s*chuva|chuva\s*acumulad|poça\s*permanente|encharcad[oa]\s*pela\s*chuva/i, category: "drenagem", weight: 8.5 },
    { keywords: /buraco|asfalto\s*(danificad|quebrad|esburacad)?|rua\s*(esburacad|quebrad)|cratera|eros[ãa]o|desmoron|lombada|via\s*p[úu]blica/i, category: "via_publica", weight: 8 },
    { keywords: /[áa]rvore\s*(ca[íi]d|caind|risco|pendend|quebrad)?|galho\s*(ca[íi]d|quebrad|solto)|poda|ra[íi]z\s*(expost|levant)|pra[çc]a|parque|jardim|mato\s*(alto|crescend)|capim\s*alto|vegeta[çc][ãa]o/i, category: "area_verde", weight: 8 },
    { keywords: /cal[çc]ada\s*(quebrad|danificad|esburacad)?|passeio\s*p[úu]blic|meio[\s-]?fio|guia|rampa\s*(de\s*acessibilidade)?/i, category: "calcada", weight: 8 },
    { keywords: /rato|ratazana|barata|inseto|mosquito|pernilongo|bicho\s*mort|animal\s*(mort|atropelad|abandon)|pombo|infesta[çc][ãa]o|escorpi[ãa]o|cobra/i, category: "animais", weight: 8 },
    { keywords: /lixo\s*(acumulad|na\s*rua|jogad)?|entulho|descarte|coleta\s*(atrasad)?|cata|sujeira|res[ií]duo|lata\s*de\s*lixo|container|ca[çc]amba|lixeira\s*(chei|quebrad|transbord)/i, category: "lixo", weight: 7 },
    { keywords: /fedor|mau\s*cheiro|fedend|podre|urina|fezes|coc[ôo]|defeca[çc][ãa]o|suj[oa]|imundo|nojent/i, category: "higiene_urbana", weight: 7 },
    { keywords: /fuma[çc]a|queimada|chamin[ée]|polui[çc][ãa]o\s+(atmosf|ambiental|do\s*ar|visual|lumin|h[íi]dric|t[ée]rmic)|polui[çc][ãa]o\s+(do|no|na)\s+(ar|c[ée]u|rio|r[ií]os)|contamina[çc][ãa]o|res[ií]duo\s+(qu[ií]mico|industrial)|emiss[aã]o\s+(de\s*)?(g[áa]s|poluente)|t[óo]xico|qu[íi]mico\s+(no|na|no\s*ar)/i, category: "poluicao", weight: 7 },
    { keywords: /barulho|barulhent|ru[íi]do|buzina|alarme|latido|bagun[çc]a|obra\s*(barulho|cedo)?|incomod.*(som|barulho|ru[ií]do)|perturba[cç][aã]o(\s+do\s+sossego)?/i, category: "poluicao", weight: 7 },
    { keywords: /\bpolui[çc][ãa]o\b/i, category: "poluicao", weight: 5 },
    { keywords: /vereador|c[âa]mara\s*municipal|legislativo|projeto\s*de\s*lei/i, category: "feedback_camara", weight: 5 },
    { keywords: /problema|situa[çc][ãa]o|reclamar|reclama[çc][ãa]o|denunciar|den[úu]ncia|irregular|ilegal|abandonad|invad|invaz|invasão/i, category: "outro", weight: 2 },
  ];

  // Scoring ACUMULATIVO por categoria (em vez de 1-match-vence). Para cada categoria:
  //   baseWeight = maior peso entre os padrões que bateram (define a confiança, como antes)
  //   signals    = quantos padrões distintos bateram (força da evidência)
  // Seleção: maior baseWeight; empate → mais sinais; empate → ordem do array (mais específico
  // primeiro). Isso troca o desempate arbitrário por ordem por um critério de evidência, sem
  // nunca sobrepor uma diferença real de peso (peso continua sendo o critério primário).
  const perCategory = new Map<string, { baseWeight: number; signals: number; firstIndex: number }>();
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    if (desc.match(pattern.keywords)) {
      const agg = perCategory.get(pattern.category);
      if (!agg) {
        perCategory.set(pattern.category, { baseWeight: pattern.weight, signals: 1, firstIndex: i });
      } else {
        agg.baseWeight = Math.max(agg.baseWeight, pattern.weight);
        agg.signals += 1;
      }
    }
  }

  let bestCategory: string | null = null;
  let best: { baseWeight: number; signals: number; firstIndex: number } | null = null;
  for (const [category, agg] of perCategory) {
    const wins = !best ||
      agg.baseWeight > best.baseWeight ||
      (agg.baseWeight === best.baseWeight && agg.signals > best.signals) ||
      (agg.baseWeight === best.baseWeight && agg.signals === best.signals && agg.firstIndex < best.firstIndex);
    if (wins) {
      best = agg;
      bestCategory = category;
    }
  }

  if (bestCategory && best) {
    const confidence = Math.min(best.baseWeight / 10, 1);
    return { category: bestCategory, confidence, suggestedLabel };
  }

  return { category: null, confidence: 0, suggestedLabel };
}

export function autoInferRisk(description: string): {
  risk_level: string | null;
  confidence: number;
  risk_types?: string[];
  reason?: string;
} {
  const desc = description
    .toLowerCase()
    .replace(/\bcheio(?=\s+t[óo]xic)/g, "cheiro");

  const criticalPatterns: Array<{ pattern: RegExp; weight: number; type?: string; reason: string }> = [
    { pattern: /completamente\s*alagad[oa]|totalmente\s*alagad[oa]|muito\s*alagad[oa]/, weight: 0.95, type: "flooding", reason: "alagamento grave" },
    { pattern: /alagad[oa]|inundad[oa]|chei[oa]\s*d[e']?\s*[áa]gua/, weight: 0.85, type: "flooding", reason: "alagamento" },
    { pattern: /\b(a?lagando|inundando|transbordando)\b|está\s*a?\s*lagando|esta\s*a?\s*lagando|tá\s*a?\s*lagando/, weight: 0.88, type: "flooding", reason: "alagamento em curso" },
    { pattern: /água\s*subindo|transbordando|enchente/, weight: 0.9, type: "flooding", reason: "alagamento crescente" },
    { pattern: /bloqueada|bloqueado|não\s*passa|nao\s*passa|via\s*interditada/, weight: 0.9, type: "traffic", reason: "via bloqueada" },
    { pattern: /rua\s*inteira|toda\s*a?\s*rua/, weight: 0.3, reason: "extensão grande" },
    { pattern: /fio[s]?\s*(caíd|caid|expost|pelad)|choque|eletric/, weight: 0.95, type: "electrical", reason: "risco elétrico" },
    { pattern: /poste\s*caíd|poste\s*caid|cabo\s*expost/, weight: 0.9, type: "electrical", reason: "risco elétrico" },
    { pattern: /desab|caindo|cedendo|rachando|tombou|caiu|desmoron/, weight: 0.9, type: "structural", reason: "risco estrutural" },
    { pattern: /afundando|cratera\s*grande/, weight: 0.85, type: "structural", reason: "afundamento" },
    { pattern: /inc[eê]ndio|pegando?\s*fogo|em\s*chamas|fuma[cç]a\s*(preta|densa)|explos[aã]o/, weight: 0.98, type: "fire", reason: "incêndio ou fogo ativo" },
    { pattern: /pr[eé]dio\s*abandonado.*(fogo|chamas|inc[eê]ndio)|fogo.*pr[eé]dio/, weight: 1.0, type: "fire", reason: "incêndio em edificação" },
    { pattern: /emergência|urgente|urgência|gravíssimo|muito\s*grave|muito\s*perigoso/, weight: 0.9, reason: "urgência declarada" },
    { pattern: /ferido|machucado|hospital|ambulância|samu/, weight: 0.95, reason: "situação de saúde" },
    { pattern: /completamente|totalmente|extremamente/, weight: 0.2, reason: "intensificador" },
  ];

  const moderatePatterns: Array<{ pattern: RegExp; weight: number; type?: string; reason: string }> = [
    { pattern: /risco\s*de|pode\s*causar|perigoso|perigo/, weight: 0.6, reason: "potencial risco" },
    { pattern: /acidente|contaminação|doença/, weight: 0.65, type: "health", reason: "risco de saúde" },
    { pattern: /preocupante|arriscado|grande|sério/, weight: 0.55, reason: "situação séria" },
    { pattern: /tóxic|toxic|venenos|químic|quimic|gás\s*tóxic|gas\s*toxic/, weight: 0.62, type: "health", reason: "exposição tóxica ou química" },
    { pattern: /cheiro.*(forte|tóxic|toxic|ruim|horrível|horrivel|insuportável|insuportavel|muito)|fedor\s*(forte|ruim)|odor\s*forte|fuma[cç]a\s*(tóxic|toxic|preta|densa)/, weight: 0.58, type: "health", reason: "odor ou fumaça preocupante" },
    { pattern: /foco\s*de\s*contamina|contaminação|contaminacao|poluição\s*no\s*ar|poluicao\s*no\s*ar/, weight: 0.6, type: "health", reason: "contaminação / ar" },
  ];

  const noRiskPatterns: Array<{ pattern: RegExp; weight: number }> = [
    { pattern: /sem\s*risco|não\s*tem\s*risco|nenhum\s*risco/, weight: 0.9 },
    { pattern: /tranquilo|só\s*incômodo|so\s*incomodo|apenas\s*(estet|visual)/, weight: 0.8 },
  ];

  for (const p of noRiskPatterns) {
    if (p.pattern.test(desc)) {
      return { risk_level: "none", confidence: p.weight, reason: "sem risco declarado" };
    }
  }

  let criticalScore = 0;
  const riskTypes: string[] = [];
  let primaryReason = "";

  for (const p of criticalPatterns) {
    if (p.pattern.test(desc)) {
      criticalScore += p.weight;
      if (p.type && !riskTypes.includes(p.type)) {
        riskTypes.push(p.type);
      }
      if (!primaryReason && p.reason !== "intensificador") {
        primaryReason = p.reason;
      }
    }
  }

  criticalScore = Math.min(criticalScore, 1);

  if (criticalScore >= 0.7) {
    return {
      risk_level: "critical",
      confidence: criticalScore,
      risk_types: riskTypes.length > 0 ? riskTypes : undefined,
      reason: primaryReason || "padrão crítico detectado",
    };
  }

  let moderateScore = 0;
  let moderateReason = "";

  for (const p of moderatePatterns) {
    if (p.pattern.test(desc)) {
      moderateScore += p.weight;
      if (!moderateReason) {
        moderateReason = p.reason;
      }
    }
  }

  moderateScore = Math.min(moderateScore, 1);

  if (moderateScore >= 0.5) {
    return {
      risk_level: "moderate",
      confidence: moderateScore,
      reason: moderateReason || "padrão moderado detectado",
    };
  }

  return { risk_level: null, confidence: 0 };
}

export function mapUrbanRiskLevelToSeverity(riskLevel: string | null | undefined): string | null {
  if (!riskLevel) return null;
  switch (riskLevel) {
    case "critical":
      return "critical";
    case "moderate":
      return "high";
    case "low":
      return "medium";
    case "none":
      return "low";
    default:
      return "medium";
  }
}

export const PROXIMITY_RADIUS_METERS = 500;
const SENSITIVE_SERVICE_TYPES = ["school", "hospital", "ubs"] as const;

export async function adjustSeverityForProximityToSensitiveEquipment(
  supabase: SupabaseClient,
  lat: number,
  lon: number,
  currentSeverity: string | null,
): Promise<{ adjustedSeverity: string; proximityDetails: string[] } | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (!currentSeverity || currentSeverity === "critical" || currentSeverity === "high") return null;

  const delta = 0.005;
  const { data, error } = await supabase.rpc("search_public_services_fulltext", {
    min_lat: lat - delta,
    max_lat: lat + delta,
    min_lng: lon - delta,
    max_lng: lon + delta,
    center_lat: lat,
    center_lng: lon,
    radius_meters: PROXIMITY_RADIUS_METERS,
    search_query: null,
    service_types: [...SENSITIVE_SERVICE_TYPES],
    result_limit: 20,
  });

  if (error || !data?.length) return null;

  const labels: Record<string, string> = { school: "escola", hospital: "hospital", ubs: "UBS" };
  const types = [...new Set((data as { service_type?: string }[]).map((s) => s.service_type).filter(Boolean))];
  const proximityDetails = types.map((t) => labels[t as string] || t);

  const bump: Record<string, string> = { low: "medium", medium: "high" };
  const adjustedSeverity = bump[currentSeverity] ?? currentSeverity;
  return { adjustedSeverity, proximityDetails };
}

export async function insertReportSeverityAuditLog(
  supabase: SupabaseClient,
  entry: {
    urban_report_id?: string;
    transport_report_id?: string;
    metric: string;
    previous_value?: string | null;
    new_value: string;
    justification: string;
    source_snippet?: string | null;
    confidence?: number | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const row = {
    urban_report_id: entry.urban_report_id ?? null,
    transport_report_id: entry.transport_report_id ?? null,
    metric: entry.metric,
    previous_value: entry.previous_value ?? null,
    new_value: entry.new_value,
    justification: entry.justification,
    source_snippet: entry.source_snippet ? String(entry.source_snippet).slice(0, 500) : null,
    confidence: entry.confidence ?? null,
    metadata: entry.metadata ?? {},
  };
  const { error } = await supabase.from("report_severity_audit_log").insert(row);
  if (error) {
    console.error("[insertReportSeverityAuditLog]", error);
  }
}
