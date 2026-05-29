export type CollectionIntent = {
  type:
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
  fields: Record<string, unknown>;
  accumulatedFields?: Record<string, unknown>;
};

export interface DetectionScore {
  type:
    | "urban_report"
    | "transport_report"
    | "service_rating"
    | "chamber_feedback"
    | "services"
    | "audiencias"
    | "general"
    | "history"
    | "occupancy"
    | "vereadores"
    | "noticias";
  score: number;
  fields: Record<string, unknown>;
}

export type ConversationMessage = { role: string; content: string };

export interface DetectCollectionIntentDeps {
  extractTransportFields: (context: string) => Record<string, unknown>;
  extractUrbanFields: (context: string) => Record<string, unknown>;
  extractServiceFields: (context: string) => Record<string, unknown>;
  extractChamberFields: (context: string) => Record<string, unknown>;
  accumulateFieldsFromHistory: (
    conversationHistory: ConversationMessage[],
    journeyType: "urban_report" | "transport_report" | "service_rating",
  ) => Record<string, unknown>;
  isCamaraFuncionamentoInternoQuery: (userMessage: string) => boolean;
}

export const STRUCTURED_JOURNEY_TYPES = ["urban_report", "transport_report", "service_rating"] as const;

/** Compara texto do munícipe sem depender de acentos (typos comuns). */
export function foldAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function contextIncludes(context: string, fragment: string): boolean {
  return foldAccents(context).includes(foldAccents(fragment));
}

const TRANSPORT_PROBLEM_LAST_MSG_DOMAINS =
  /\b(onibus|bus[aã]o|metro|metr[oô]|trem|cptm|linha|motorista|cobrador|transporte\s+publico|parada)\b/i;
const TRANSPORT_PROBLEM_LAST_MSG_ISSUES =
  /\b(atras(o|ou|ando|ada)?|demora(r|ndo)?|lotad[oa]|lotacao|lota[cç][aã]o|n[aã]o\s+passou|quebrou|sujo|fedendo|imprudente|perigoso|capotou|freada|superlotad)\b/i;

/** Relato de problema no transporte na última mensagem (não consulta Olho Vivo). */
export function messageLooksLikeTransportProblemReport(text: string): boolean {
  const t = text.trim();
  if (t.length < 10) return false;
  if (isBusInformationalQuery(t)) return false;
  const folded = foldAccents(t);
  return TRANSPORT_PROBLEM_LAST_MSG_DOMAINS.test(folded) && TRANSPORT_PROBLEM_LAST_MSG_ISSUES.test(folded);
}

export function detectExistingJourney(
  conversationHistory: ConversationMessage[],
): "urban_report" | "transport_report" | "service_rating" | null {
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if (msg.role === "assistant") {
      const progressMatch = msg.content.match(/\[COLLECTION_PROGRESS:(\w+):/);
      if (progressMatch) {
        const type = progressMatch[1];
        if ((STRUCTURED_JOURNEY_TYPES as readonly string[]).includes(type)) {
          return type as (typeof STRUCTURED_JOURNEY_TYPES)[number];
        }
      }
      if (
        msg.content.includes("[REPORT_CREATED:") ||
        msg.content.includes("[TRANSPORT_CREATED:") ||
        msg.content.includes("[RATING_CREATED:")
      ) {
        return null;
      }
    }
  }
  return null;
}

export function isInformationalQuestionAboutAudience(userMessage: string): boolean {
  const normalized = userMessage
    .trim()
    .replace(/^0\s*que\s/gi, "o que ")
    .replace(/\b0\s*que\s/gi, "o que ");
  return /(o que (é|e) (uma |a )?(audiência|audiencia)(\s+pública|\s+publica)?|como funciona (a )?(audiência|audiencia)(\s+pública|\s+publica)?|o que são (as )?(audiências|audiencias)(\s+públicas|\s+publicas)?)/i.test(normalized);
}

export function isInformationalQuestionAboutContact(userMessage: string): boolean {
  const m = userMessage
    .trim()
    .toLowerCase()
    .replace(/\bveread(o|or)\b/g, "vereador")
    .replace(/\bfala\s+com\b/g, "falar com");
  const chamber = /câmara|camara|municipal|legislativ|vereador/i.test(m);
  const contact = /como\s+(entrar\s+em\s+)?contato|entrar\s+em\s+contato\s+com|telefone\s+(da\s+)?(câmara|camara)?|email\s+(da\s+)?(câmara|camara)?|endere[cç]o\s+(da\s+)?(câmara|camara)?|falar\s+com\s+(a\s+|um\s+)?(câmara|camara|vereador)|ligar\s+para\s+(a\s+)?(câmara|camara)|contato\s+(da\s+)?(câmara|camara)|como\s+fal(o|ar)\s+com|onde\s+posso\s+encontrar|como\s+faz\s+pra\s+falar\s+com/i.test(
    m,
  );
  return chamber && (contact || /como\s+entrar\s+em\s+contato/i.test(m));
}

export function isInformationalQuestionAboutProjetosTramitacao(userMessage: string): boolean {
  const m = userMessage.toLowerCase();
  return /projetos?\s+(est[aã]o\s+)?em\s+tramita[cç][aã]o|tramita[cç][aã]o\s+(de\s+)?projetos?|quais\s+projetos?\s+est[aã]o/i.test(m);
}

export function isInformationalQuestionAboutBuscarAudiencia(userMessage: string): boolean {
  const m = userMessage.toLowerCase();
  return /(como\s+posso\s+)?buscar\s+(uma\s+)?(audi[eê]ncia|audiencia)|buscar\s+(audi[eê]ncia|audiencia)\s+p[uú]blica/i.test(m);
}

export function isQuestionAboutProximasOuQuaisAudiencias(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase();
  return (
    /quais\s+(as\s+)?(pr[oó]ximas?\s+)?(audi[eê]ncias?|audiencias?)(\s+p[uú]blicas?)?/i.test(m) ||
    /(quando\s+(s[aã]o|é)\s+)?(as\s+)?pr[oó]ximas?\s+(audi[eê]ncias?|audiencias?)(\s+p[uú]blicas?)?/i.test(m) ||
    /(tem|ter|existe|existem)\s+(alguma\s+)?(audi[eê]ncia|audiencia)(\s+p[uú]blica)?\s+(pr[oó]xima|agendada)/i.test(m) ||
    /(lista|agenda|calend[aá]rio)\s+(de\s+)?(audi[eê]ncias?|audiencias?)(\s+p[uú]blicas?)?/i.test(m) ||
    /(audi[eê]ncias?|audiencias?)(\s+p[uú]blicas?)?\s+(pr[oó]ximas?|agendadas?)/i.test(m)
  );
}

export function isOutOfScopeQuestion(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase();
  return (
    /(que\s+horas\s+)(fecha|abre|funciona)\s+(o\s+)?(shopping|restaurante|mercado|loja|comércio|comercio)/i.test(m) ||
    /(shopping|restaurante|mercado)\s+(mais\s+próximo|mais\s+proximo|perto)/i.test(m) ||
    /qual\s+é\s+o\s+melhor\s+restaurante/i.test(m) ||
    /quem\s+é\s+o\s+prefeito/i.test(m) ||
    /(resolv(er|a)|resolver|resolve)\s+(minha\s+)?multa/i.test(m) ||
    /\bmulta\s+(de\s+)?trânsito|\bmulta\s+(de\s+)?transito/i.test(m)
  );
}

export function isGeneralKnowledgeOutOfScope(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase();
  if (/câmara|camara|vereador|comissão|comissao|legislativ/i.test(m)) return false;
  return (
    /(quem\s+é\s+o\s+)?presidente\s+(do\s+|da\s+|dos\s+|das\s+)/i.test(m) ||
    /(qual\s+é\s+a\s+)?capital\s+(da\s+)?(frança|franca|espanha|italia|argentina|brasil|méxico|mexico|inglaterra|japão|japao)/i.test(m) ||
    /(quem\s+ganhou\s+)?(a\s+)?copa\s+(do\s+mundo|do\s+mundo\s+de\s+\d{4})/i.test(m) ||
    /s[aã]o\s+paulo\s+(e|é)\s+de\s+qual\s+estado/i.test(m) ||
    /qual\s+estado\s+(é|e)\s+s[aã]o\s+paulo/i.test(m) ||
    /(a\s+)?cidade\s+(de\s+)?s[aã]o\s+paulo\s+(é|e)\s+(de\s+)?qual\s+estado/i.test(m)
  );
}

export const POLITICIAN_EVALUATION_BLOCKED_MESSAGE =
  "Não posso responder a perguntas sobre avaliação ou desempenho de políticos ou autoridades eleitas - isso foge do escopo deste canal.\n\n" +
  "Posso ajudar com informações institucionais sobre a Câmara, serviços públicos, audiências, projetos de lei, relatos ou encaminhamentos previstos no app.\n\n" +
  "[SHOW_SERVICES_CHIPS]";

export function isPoliticianPerformanceEvaluationQuestion(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase();
  if (!m) return false;

  if (
    /\bfeedback\s+sobre\s+vereador/i.test(m) ||
    /\belogiar\s+(um\s+)?vereador/i.test(m) ||
    /\bcr[ií]tica\s+ao\s+vereador/i.test(m) ||
    /\bsugest[aã]o\s+para\s+(o\s+)?vereador/i.test(m) ||
    /\belogio\s+ao\s+vereador/i.test(m) ||
    /\bencaminhar.*vereador/i.test(m) ||
    /\bquero\s+encaminhar.*vereador/i.test(m) ||
    /\brelato.*vereador/i.test(m)
  ) {
    return false;
  }

  if (
    /\bavaliar\s+(um\s+)?(servi[cç]o|servi[cç]os\s+p[uú]blicos?|ubs|hospital|escola|ceu|biblioteca|posto\s+de\s+sa[uú]de|atendimento|equipamento|creche|parque)/i.test(
      m,
    ) ||
    /\bnota\s+(para|pro)\s+(o\s+)?(servi[cç]o|atendimento|hospital|ubs|posto|escola)/i.test(m) ||
    /\bfazer\s+uma\s+avalia[cç][aã]o\s+de\s+servi[cç]o/i.test(m) ||
    /\bavalia[cç][aã]o\s+de\s+servi[cç]o\s+p[uú]blico/i.test(m)
  ) {
    return false;
  }

  const politico =
    /vereador|vereadora|vereadores|vereadoras|prefeito|prefeita|deputad[oa]s?|pol[ií]ticos?|parlamentares?|presidente\s+da\s+c[iâ]mara|presidente\s+da\s+camara/i;
  if (!politico.test(m)) return false;

  if (
    /\b(melhor|pior|mais\s+corrupto|mais\s+honesto)\s+(vereador|vereadora|vereadores|prefeito|prefeita|deputad[oa]|pol[ií]tico)/i.test(
      m,
    )
  ) {
    return true;
  }

  if (
    /\b(o\s+que\s+voc[aê]|que\s+nota|qual\s+nota|d[aê]\s+nota|merece\s+(nota|voto|reelei[cç][aã]o))/i.test(m) ||
    /\b(desempenho|performance|avalia[cç][aã]o|ranking)\b/i.test(m) ||
    /\bopini[aã]o\s+(sobre|do|da|dos|das)/i.test(m) ||
    /\bo\s+que\s+voc[aê]\s+acha/i.test(m) ||
    /\b(gosta|gostam)\s+(do|da|dele|dela)\b/i.test(m) ||
    /\b(trabalha|trabalham)\s+(bem|mal|horr[ií]vel)\b/i.test(m) ||
    /\b(fazendo|fez|faz)\s+(um\s+)?(bom|ruim|ótimo|ótim[oa]|péssim[oa]|excelente)\s+trabalho/i.test(m) ||
    /\b(bom|boa|ruim|r[uú]im|ótimo|ótim[oa]|péssim[oa]|excelente)\s+(trabalho|gest[aã]o)\b/i.test(m)
  ) {
    return true;
  }

  if (
    /\bnota\s+(para|do|da|pro|pra)\s+(o\s+|a\s+)?(vereador|vereadora|prefeito|prefeita|deputad|presidente)\b/i.test(m)
  ) {
    return true;
  }

  if (
    /\b(avaliar|avalia)\s+(o\s+|a\s+|os\s+)?(vereador|vereadora|prefeito|prefeita|deputad|trabalho\s+do\s+vereador|gest[aã]o\s+do\s+prefeito)/i.test(
      m,
    )
  ) {
    return true;
  }

  if (
    /\b(qual|quem)\s+(é\s+)?(o\s+|a\s+)?(melhor|pior)\s+(vereador|vereadora|prefeito|prefeita|deputad|pol[ií]tico)/i.test(
      m,
    )
  ) {
    return true;
  }

  if (/\branking\s+(de|dos|das)?\s*(vereador|vereadora|prefeito|prefeita|deputad)/i.test(m)) {
    return true;
  }

  return false;
}

export function isInformationalQuestionAboutVereadorOrCamara(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase();
  return (
    /(mostre?\s+o\s+)?perfil\s+(da\s+)?(vereador(a|e)s?|vereadora)/i.test(m) ||
    /frequ[eê]ncia\s+(do|da)\s+vereador(a|e)s?\s+(nas\s+)?sess[oõ]es/i.test(m) ||
    /quais\s+vereadores\s+faltaram\s+(na\s+)?(última|ultima)\s+sess[aã]o/i.test(m) ||
    /quanto\s+a\s+(c[aâ]mara|camara)\s+gasta\s*(por\s+m[eê]s)?/i.test(m) ||
    /(como\s+posso\s+)?falar\s+com\s+(meu\s+)?vereador/i.test(m) ||
    /qual\s+vereador\s+(atende|representa|cuida\s+do|fala\s+por).*(meu\s+bairro|minha\s+regi[aã]o|minha\s+zona|bairro)/i.test(m) ||
    /(meu\s+bairro|minha\s+regi[aã]o|minha\s+zona).*(qual\s+vereador|vereador\s+(atende|representa))/i.test(m) ||
    /onde\s+(ta|est[aá])\s+os\s+gastos\s+(dos\s+)?vereadores/i.test(m)
  );
}

/** Relato de transporte (não consulta Olho Vivo). */
function hasTransportComplaintSignals(message: string): boolean {
  return /(atraso|atrasou|demora|demorou|reclam|problema|n[aã]o\s+passou|nao\s+passou|lotad|superlotad|motorista\s+(rude|grosso)|perig|ass[eé]dio|freada|freou|sujo|fedor|cancelou|quebrou)/i
    .test(message);
}

export function isBusInformationalQuery(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase();
  if (hasTransportComplaintSignals(m)) return false;

  const patterns = [
    /linhas?\s+(de\s+)?(ônibus|onibus)\s+passam/i,
    /quais\s+linhas\s+passam/i,
    /(ônibus|onibus)\s+passam\s+próximo|(ônibus|onibus)\s+passam\s+perto/i,
    /qual\s+(linha|ônibus|onibus)\s+passa/i,
    /quando\s+passa\s+(o\s+)?(ônibus|onibus)/i,
    /itinerário|itinerario\s+(da\s+)?linha/i,
    /previs[aã]o\s+de\s+chegada|previsao\s+de\s+chegada/i,
    /previs[aã]o\s+(do|da)\s+(ônibus|onibus|linha)/i,
    /quais\s+linhas?\s+(de\s+)?(ônibus|onibus)\s+passam/i,
    /(paradas?|pontos?)\s+(de\s+)?(ônibus|onibus)\s+perto|(ônibus|onibus)\s+(que\s+)?passam\s+perto/i,
    /próximo\s+a\s+mim.*(ônibus|onibus|linha)|(ônibus|onibus|linha).*próximo\s+a\s+mim/i,
    /perto\s+de\s+mim.*(ônibus|onibus|linha)|(ônibus|onibus|linha).*perto\s+de\s+mim/i,
    /hor[aá]rio\s+(da\s+)?parada/i,
    /chegada\s+(do|da)\s+(ônibus|onibus|linha)/i,
    /tempo\s+real/i,
    /sentido\s+.+\s+hor[aá]rio|hor[aá]rio.*\bsentido\b/i,
    /\b(linha|ônibus|onibus)\s+[\d]+[a-z0-9-]*\b.*\b(hor[aá]rio|previs[aã]o|chegada|passa)\b/i,
    /\b(hor[aá]rio|previs[aã]o|chegada)\b.*\b(linha|ônibus|onibus)\s+[\d]+/i,
  ];
  return patterns.some((p) => p.test(m));
}

export function getToolHintForIntent(intentType: string): string | null {
  const hints: Record<string, string> = {
    services: "[TOOL_HINT:find_nearby_services]",
    audiencias: "[TOOL_HINT:search_audiencias]",
    general: "[TOOL_HINT:search_knowledge_base]",
    history: "[TOOL_HINT:get_citizen_history]",
    occupancy: "[TOOL_HINT:get_service_occupancy_status]",
  };
  return hints[intentType] || null;
}

export const INTENT_KEYWORDS = [
  "relatar um problema", "problema na cidade", "problema no transporte",
  "avaliar um serviço", "me diz o que está acontecendo", "qual linha e o que aconteceu",
  "quero relatar um problema", "problema urbano",
  "falar sobre a cidade",
  "abrir um relato",
  "relato na cidade",
  "incêndio",
  "incendio",
  "pegando fogo",
  "em chamas",
  "alagamento",
  "alagando",
  "enchente",
  "chovendo",
  "chuva forte",
  "fios expostos",
  "desabamento",
  "desmoron",
  "atropelamento",
  "bueiro",
  "fio caido",
  "fio caído",
  "risco de choque",
  "busao",
  "busão",
  "qro falar",
  "qro fala",
  "quero reclamar", "preciso relatar", "quero reportar", "aconteceu",
  "tem um problema", "está com problema", "não está funcionando",
  "quero avaliar", "quero elogiar", "quero denunciar", "preciso informar",
  "gostaria de registrar", "vim falar sobre um", "tenho uma reclamação",
  "quero fazer", "preciso fazer", "quero registrar", "tive um problema",
  "sofri um", "passei por", "enfrentei", "reclamar sobre", "reclamar do",
  "agradecer", "parabenizar", "sugerir", "dar uma sugestão",
  "tem um", "tem uma", "há um", "há uma", "existe um", "existe uma",
  "tá cheio", "tá lotado", "tá quebrado", "tá apagado", "tá fedendo",
  "está cheio", "está lotado", "está quebrado", "está apagado", "está fedendo",
  "onde fica", "onde tem", "cadê", "como chego", "mais perto", "perto de mim",
  "perto daqui", "próximo de mim", "endereço", "telefone da", "horário da",
  "quando vai ter", "próxima", "próximo", "inscrever", "participar",
  "audiência", "audiencia", "consulta pública", "como posso buscar", "buscar audiência", "buscar audiencia", "buscar uma audiência",
  "meu relato", "minha reclamação", "meus relatos", "minhas avaliações",
  "status do meu", "o que eu fiz", "minha denúncia",
  "nota para", "estrelas para", "avaliar", "dar nota",
  "buraco", "poste apagado", "lixo acumulado", "esgoto", "fedor",
  "calçada quebrada", "árvore caindo", "bueiro entupido",
  "ônibus atrasado", "metrô lotado", "trem atrasou", "não passou",
  "motorista rude", "falta de ônibus",
  "como funciona", "o que é", "o que e", "quem é", "quem e", "me explica", "dúvida sobre", "duvida sobre",
  "quais são", "quais sao", "qual é", "qual e", "quais as", "quais os", "qual a", "qual o",
  "atribuições", "atribuicoes", "atribuição", "atribuicao", "função dos", "funcao dos", "papel dos",
  "vereadores", "vereador", "vereadora", "câmara", "camara", "municipal", "legislativo", "legislatura",
  "informação sobre", "informacao sobre", "saber sobre", "entender sobre", "conhecer sobre",
  "sessões", "sessão", "sessoes", "sessao", "audiência", "audiencia", "como posso participar", "como participar",
  "onde fica a", "endereço da câmara", "endereco da camara",
  "salário", "salario", "remuneração", "remuneracao", "quanto ganha", "valor do vereador", "ganha um vereador",
  "competências", "competencias", "responsabilidades", "quantos vereadores", "mandato", "presidente da câmara",
  "comissões", "comissoes", "processo legislativo", "projeto de lei", "projetos", "tramitação", "tramitacao", "em tramitação", "em tramitacao", "lei municipal", "lei orgânica", "lei organica",
  "regimento interno", "tribuna livre", "sessão ordinária", "sessao ordinaria", "votação", "votacao", "quórum", "quorum",
  "qual vereador", "vereadore", "qero saber", "sabe dos vereadores", "vereadores de sp",
  "entrar em contato com um vereador", "entrar em contato com vereador", "falar com um vereador", "falar com vereador", "fala com vereador",
  "principais funções", "funções de um vereador", "consultar projetos de lei", "projetos de lei da câmara", "projetos de lei da camara",
  "últimas votações", "ultimas votações", "votações da câmara", "votacoes da camara",
  "canal oficial", "sugestões ou reclamações", "sugestoes ou reclamacoes", "sugestões reclamações",
  "papel das comissões", "comissões dentro da câmara", "tipos de projetos", "apresentados por vereadores",
  "acompanhar as atividades dos vereadores", "acompanhar atividades vereadores",
  "estrutura da Câmara", "estrutura da camara", "participar de uma audiência", "participar de audiencia",
  "processo de votação", "processo de votacao", "votação de um PL", "votacao de um PL",
  "reunião da câmara", "reuniao da camara", "reunião da câmara hoje", "alguma reunião",
  "orçamento", "orcamento", "emendas", "para que serve", "por que existe", "quando foi", "história da câmara",
  "como nasce uma lei", "o que é uma audiência", "diferença entre", "diferenca entre", "requisitos para ser vereador",
  "cpi", "cpis", "comissão parlamentar de inquérito", "comissao parlamentar de inquerito", "comissão parlamentar", "comissao parlamentar",
  "equipamentos públicos", "equipamentos publicos", "equipamento público", "equipamento publico", "ubs", "hospital", "escola", "ceu ", "cras", "posto de saúde", "unidade de saúde",
  "população", "populacao", "habitantes", "densidade", "demografia", "demográfico", "censo", "quantos habitantes",
  "sistema viário", "sistema viario", "sistema viária", "via", "vias", "infraestrutura viária", "trânsito", "transito", "ciclovia", "ciclovias", "malha viária",
  "transporte público", "transporte publico", "rede de transporte", "linhas de ônibus", "linhas de onibus", "metrô", "metro", "cptm", "bilhete único", "bilhete unico",
  "geosampa", "geo sampa", "dados da cidade", "dados de são paulo", "mapa da cidade", "melhor ubs", "qual ubs", "unidades de saúde",
  "quem é o", "quem e o", "qual é o melhor", "qual e o melhor", "que horas",
  "lixo", "onibus", "ônibus", "arvore", "árvore", "relatar", "atraso", "atrasou", "demora", "motorista",
  "avaliacao", "avaliação", "itinerario", "itinerário", "previsao", "previsão", "ocupacao", "ocupação",
  "lotacao", "lotação", "sugestao", "sugestão", "noticias", "notícias", "quero relatar", "nao passou",
  "não passou", "terminal", "linha ", "ponto", "fedendo", "lotado", "perigoso", "condução", "conducao",
  "quero conhecer", "meus relatos", "status do meu", "agenda de", "calendario", "calendário",
  "inscrever", "tramitacao", "tramitação", "competencias", "competências", "quanto ganha",
  "servicos perto", "serviços perto", "hospital perto", "escola perto", "cade a", "cadê",
  "apagada", "apagado", "iluminacao", "iluminação",
  "pichacao", "pichação", "barulho", "cachorro", "semaforo", "semáforo", "obra irregular", "tapume",
  "caps", "ama", "cras perto", "ama 24h", "pronto socorro", "pronto-socorro",
  "lotacao da", "ocupacao do", "tempo real", "horario da parada",
];

export function detectCollectionIntent(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  deps: DetectCollectionIntentDeps,
): CollectionIntent | null {
  const {
    accumulateFieldsFromHistory,
    extractChamberFields,
    extractServiceFields,
    extractTransportFields,
    extractUrbanFields,
    isCamaraFuncionamentoInternoQuery,
  } = deps;

  const msgLower = userMessage.toLowerCase();
  const existingJourney = detectExistingJourney(conversationHistory);

  const userOnlyContext = conversationHistory
    .slice(-6)
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase())
    .join(" ");
  const fullUserContext = `${userOnlyContext} ${msgLower}`;
  const normalizedForIntent = fullUserContext
    .replace(/\bqero\b/g, "quero")
    .replace(/\bqro\b/g, "quero")
    .replace(/\bbusao\b/g, "onibus")
    .replace(/\bvereadore(s)?\b/g, "vereador$1")
    .replace(/\bvereadoe(s)?\b/g, "vereador$1")
    .replace(/\bveread(o|or)\b/g, "vereador")
    .replace(/\bsabe\s+dos\b/g, "saber dos")
    .replace(/\bmunicpal\b/g, "municipal")
    .replace(/\bprojeots?\b/g, "projetos")
    .replace(/\bprojetu(s)?\b/g, "projeto$1")
    .replace(/\bdi\s+lei\b/g, "de lei")
    .replace(/\bonde\s+ta\b/g, "onde está")
    .replace(/\bta\s+os\b/g, "está os")
    .replace(/\bleiiii+\b/g, "lei")
    .replace(/\bfala\s+(com|pra)\b/g, "falar $1")
    .replace(/\bfala\s+com\b/g, "falar com")
    .replace(/\breuniao\b/g, "reunião");

  const foldedContext = foldAccents(normalizedForIntent);
  const hasIntent = INTENT_KEYWORDS.some((kw) => foldedContext.includes(foldAccents(kw)));
  if (!hasIntent) {
    const excerpt = (userMessage || "").trim().slice(0, 120);
    console.log("[detectCollectionIntent] No intent keywords found, skipping tracker activation");
    console.log(
      "[ai-orchestrator] NÃO FOI POSSÍVEL ASSOCIAR A NENHUM INTENT; RAG NÃO FOI CONSULTADO. Mensagem do usuário (trecho):",
      excerpt || "(vazia)",
    );
    return null;
  }

  const scores: DetectionScore[] = [];

  const explicitUrbanPhrases = [
    "quero fazer uma reclamação", "quero fazer reclamação", "quero fazer reclamacao",
    "quero denunciar", "problema na minha rua", "problema na cidade", "problema urbano",
    "problemas na cidade", "problemas na rua", "quero falar sobre problemas na cidade",
    "tem um buraco", "poste apagado", "lixo acumulado", "quero abrir um chamado",
    "quero registrar um problema urbano", "relatar problema urbano", "fazer um relato urbano",
    "problema na rua", "problema no bairro", "problema de infraestrutura",
    "quero falar de problema", "quero falar sobre cidade", "quero falar sobre problema",
    "quero fazer um elogio", "quero elogiar", "fazer um elogio", "tenho um elogio",
    "quero dar um elogio", "elogio à cidade", "elogio a cidade", "elogio sobre a cidade",
    "tenho uma sugestão", "tenho uma sugestao", "quero sugerir", "sugestão para a cidade",
    "sugestao para a cidade", "ideia de melhoria", "sugestão de melhoria", "sugestao de melhoria",
    "quero falar sobre a cidade",
    "preciso falar sobre a cidade",
    "preciso falar da cidade",
    "quero falar da cidade",
    "relato na cidade",
    "falar com a cidade",
    "quero abrir um relato",
    "abrir um relato",
    "quero registrar um relato",
  ];

  const explicitTransportPhrases = [
    "problema no ônibus", "problema no onibus", "problema no metrô", "problema no metro",
    "problema no trem", "quero relatar transporte", "quero reclamar do transporte",
    "ônibus atrasado", "onibus atrasado", "metrô lotado", "metro lotado", "trem não passou",
    "problema na linha", "quero falar do ônibus", "quero falar do onibus",
    "quero fazer um relato de transporte", "relatar problema de transporte",
    "problema no transporte", "problema no transporte público", "problema no transporte publico",
    "relatar um problema no transporte", "problema de transporte",
    "quero falar de transporte", "quero falar do transporte", "quero falar sobre transporte",
    "falar de transporte", "falar sobre transporte", "mudar para transporte", "trocar para transporte",
  ];

  const explicitRatingPhrases = [
    "quero fazer uma avaliação", "quero fazer avaliação", "quero fazer avaliacao",
    "quero avaliar", "fazer uma avaliação", "fazer avaliação", "fazer avaliacao",
    "quero dar nota", "quero dar uma nota", "avaliar um serviço", "avaliar servico",
    "avaliar o serviço", "avaliar o servico", "dar minha avaliação", "deixar avaliação",
    "avaliar atendimento", "avaliar serviço público", "avaliar servico publico",
    "avaliar uma ubs", "avaliar uma escola", "avaliar um hospital",
    "quero avaliar um serviço", "quero avaliar um servico",
    "quero falar de avaliação", "quero falar de avaliaçao", "falar de avaliação",
    "mudar para avaliação", "trocar para avaliação", "trocar para avaliaçao",
  ];

  const explicitServicesPhrases = [
    "onde fica a ubs", "onde fica o hospital", "buscar serviço", "buscar servico",
    "quero encontrar", "preciso encontrar", "procurar uma escola",
    "qual ubs mais perto", "qual a ubs perto de mim", "quais ubs perto de mim",
    "quais ubss perto de mim", "quais as ubs perto de mim", "quais as ubss perto de mim",
    "quais as ubs's perto de mim", "como chegar na ubs", "serviços perto de mim",
    "servicos perto de mim", "onde tem hospital", "onde tem escola",
    "qual hospital perto de mim", "quais hospitais perto de mim", "qual hospital mais perto de mim",
    "quais hospitais mais perto de mim", "qual escola perto de mim", "quais escolas perto de mim",
    "qual escola mais perto de mim", "quais escolas mais perto de mim",
    "qual ceu perto de mim", "quais ceus perto de mim", "qual ceu mais perto de mim", "quais ceus mais perto de mim",
    "qual biblioteca perto de mim", "quais bibliotecas perto de mim", "qual biblioteca mais perto de mim", "quais bibliotecas mais perto de mim",
    "qual a ubs mais perto", "quais as ubs mais perto", "qual o hospital mais perto", "quais os hospitais mais perto",
    "quais assistências sociais mais perto de mim", "qual assistência social mais perto de mim",
    "quais esportes mais perto de mim", "qual esporte mais perto de mim",
    "qual transporte mais perto de mim", "quais transportes mais perto de mim",
    "qual delegacia mais perto de mim", "quais delegacias mais perto de mim",
    "quero falar sobre serviços", "quero falar sobre servicos", "quero falar de serviços",
    "serviços próximos", "servicos próximos", "serviços proximos", "quero serviços próximos",
    "caps perto de mim", "ama 24h perto", "cras perto de mim",
    "caps mais perto", "ama 24h perto de casa",
  ];

  const explicitAudienciasPhrases = [
    "quero participar de audiência", "quero participar de audiencia", "próxima audiência",
    "proxima audiencia", "quando tem audiência", "quando tem audiencia",
    "audiência pública", "audiencia publica", "consulta pública", "consulta publica",
    "quero me inscrever na audiência", "quero me inscrever na audiencia",
  ];

  const explicitHistoryPhrases = [
    "meus relatos", "meu histórico", "meu historico", "o que eu já fiz", "o que eu ja fiz",
    "quero ver meus relatos", "como está minha reclamação", "como esta minha reclamacao",
    "status do meu relato", "minhas reclamações", "minhas reclamacoes",
  ];

  const explicitVereadoresPhrases = [
    "vereadores da minha região", "vereadores da minha regiao",
    "quais vereadores representam", "quem me representa na câmara",
    "quem me representa na camara", "vereadores do meu bairro",
    "meus vereadores", "vereador da zona", "vereadores da zona",
    "quais vereadores representam minha região", "quais vereadores representam minha regiao",
    "gostaria de saber sobre os vereadores", "gostaria de saber sobre vereadores",
    "quero saber sobre os vereadores", "quero saber sobre vereadores",
    "saber sobre os vereadores", "saber sobre vereadores",
    "informação sobre vereadores", "informacao sobre vereadores",
    "informação sobre os vereadores", "informacao sobre os vereadores",
    "vereadores referentes ao bairro", "vereadores da cidade",
    "vereadores do bairro", "quem são os vereadores", "quem sao os vereadores",
  ];

  const explicitNoticiasPhrases = [
    "últimas notícias", "ultimas noticias", "notícias da câmara",
    "noticias da camara", "novidades legislativas", "o que está acontecendo na câmara",
    "o que esta acontecendo na camara", "notícias recentes", "noticias recentes",
    "quais as últimas notícias", "quais as ultimas noticias",
  ];

  const explicitGeneralPhrases = [
    "tenho uma dúvida", "tenho uma duvida", "tenho dúvida", "tenho duvida",
    "dúvida sobre a câmara", "duvida sobre a camara", "dúvida sobre a Câmara",
    "dúvida sobre a Câmara Municipal", "duvida sobre a camara municipal",
    "tirar dúvida", "tirar duvida", "tirar uma dúvida", "quero tirar dúvida",
    "pergunta sobre a câmara", "pergunta sobre a camara", "como funciona a câmara",
    "como funciona a camara", "quero saber sobre a câmara", "quero saber sobre a camara",
    "informação sobre a câmara", "informacao sobre a camara", "dúvidas sobre a câmara",
    "duvidas sobre a camara",
  ];

  const intentChangeIndicators = [
    "quero fazer", "preciso de", "pode me ajudar com",
    "na verdade", "mudando de assunto", "outra coisa",
    "deixa isso", "esquece isso", "vamos falar de", "agora quero",
    "quero falar de", "quero falar do", "falar de", "falar sobre",
    "mudar para", "trocar para",
  ];
  const hasIntentChange = intentChangeIndicators.some((ind) => contextIncludes(fullUserContext,ind));

  type ExplicitIntentType = CollectionIntent["type"];
  const queroFalarMatch = msgLower.match(
    /(?:quero|vou|vamos|preciso|gostaria(?:\s+de)?)\s+falar\s+(?:de|do|da|sobre)\s+(?:a\s+)?(\w+)/i,
  );
  let genericTopicIntent: { type: ExplicitIntentType; boost: number } | null = null;
  if (queroFalarMatch) {
    const topic = queroFalarMatch[1].toLowerCase();
    const topicToJourney: Record<string, ExplicitIntentType> = {
      transporte: "transport_report",
      ônibus: "transport_report",
      onibus: "transport_report",
      metrô: "transport_report",
      metro: "transport_report",
      trem: "transport_report",
      avaliação: "service_rating",
      avaliaçao: "service_rating",
      avaliações: "service_rating",
      avaliacoes: "service_rating",
      serviço: "service_rating",
      servico: "service_rating",
      cidade: "urban_report",
      elogio: "urban_report",
      sugestão: "urban_report",
      sugestao: "urban_report",
      problema: "urban_report",
      problemas: "urban_report",
      rua: "urban_report",
      bairro: "urban_report",
      urbano: "urban_report",
      urbanos: "urban_report",
      relato: "urban_report",
      relatos: "urban_report",
      infraestrutura: "urban_report",
      serviços: "services",
      servicos: "services",
      audiência: "audiencias",
      audiencia: "audiencias",
      audiências: "audiencias",
      audiencias: "audiencias",
      vereador: "vereadores",
      vereadores: "vereadores",
      notícia: "noticias",
      noticia: "noticias",
      notícias: "noticias",
      noticias: "noticias",
      histórico: "history",
      historico: "history",
      dúvida: "general",
      duvida: "general",
      dúvidas: "general",
      duvidas: "general",
    };
    const mappedJourney = topicToJourney[topic];
    if (mappedJourney) {
      genericTopicIntent = { type: mappedJourney, boost: 20 };
      console.log("[detectCollectionIntent] Generic topic pattern detected:", topic, "→", mappedJourney);
    }
  }

  const lastMsgExplicitIntent: { type: ExplicitIntentType; boost: number } | null = (() => {
    if (explicitGeneralPhrases.some((phrase) => msgLower.includes(phrase))) {
      return { type: "general", boost: 15 };
    }
    if (explicitRatingPhrases.some((phrase) => msgLower.includes(phrase))) {
      return { type: "service_rating", boost: 15 };
    }
    if (explicitUrbanPhrases.some((phrase) => msgLower.includes(phrase))) {
      return { type: "urban_report", boost: 15 };
    }
    if (explicitTransportPhrases.some((phrase) => msgLower.includes(phrase))) {
      return { type: "transport_report", boost: 15 };
    }
    if (explicitServicesPhrases.some((phrase) => msgLower.includes(phrase))) {
      return { type: "services", boost: 15 };
    }
    if (explicitAudienciasPhrases.some((phrase) => msgLower.includes(phrase))) {
      return { type: "audiencias", boost: 15 };
    }
    if (explicitHistoryPhrases.some((phrase) => msgLower.includes(phrase))) {
      return { type: "history", boost: 15 };
    }
    if (explicitVereadoresPhrases.some((phrase) => msgLower.includes(phrase))) {
      return { type: "vereadores", boost: 15 };
    }
    if (explicitNoticiasPhrases.some((phrase) => msgLower.includes(phrase))) {
      return { type: "noticias", boost: 15 };
    }
    return null;
  })();

  if (lastMsgExplicitIntent) {
    console.log(
      `[detectCollectionIntent] Explicit intent in LAST message: ${lastMsgExplicitIntent.type} (boost: ${lastMsgExplicitIntent.boost})`,
    );
  }

  const busInfoQuery = isBusInformationalQuery(userMessage);
  if (busInfoQuery) {
    console.log("[detectCollectionIntent] Bus/line informational query detected → general (Olho Vivo tools), not transport_report");
    scores.push({ type: "general", score: 22, fields: {} });
  }

  const isEquipmentOccupancyQuery = (() => {
    const m = msgLower;
    const hasServiceEntity = /\b(ubs|hospital|escola|ceu|biblioteca|posto de sa[úu]de|pronto[- ]?socorro|centro esportivo|equipamento)\b/i.test(m);
    const hasOccupancySignal =
      /(ocup[aã]?[cç][aã]o|lota[cç][aã]o|movimenta[cç][aã]o|est[aá]\s+chei[oa]|t[aá]\s+chei[oa]|lotad[oa]|superlotad[oa])/.test(
        m,
      );
    const asksNow =
      /(como est[aá]|agora|neste momento|nesse momento|nesse local|neste local|\best[aá]\b.*\?)/.test(m);
    return hasServiceEntity && hasOccupancySignal && asksNow;
  })();
  if (isEquipmentOccupancyQuery) {
    console.log("[detectCollectionIntent] Equipment occupancy query detected → occupancy tool, not service_rating");
    scores.push({ type: "occupancy", score: 28, fields: {} });
  }

  const transportDomain = ["ônibus", "onibus", "busao", "busão", "metrô", "metro", "trem", "cptm", "estação", "estacao", "terminal", "ponto de ônibus", "transporte", "transporte público", "transporte publico", "motorista", "cobrador", "linha"];
  const transportProblems = [
    "lotado", "lotação", "lotacao", "atraso", "atrasou", "atrasando", "atrasada",
    "demora", "demorando", "demorou", "não passou", "nao passou", "quebrou", "freada", "freou", "sujo", "fedendo",
  ];
  let transportScore = 0;
  if (!busInfoQuery) {
    transportDomain.forEach((kw) => {
      if (contextIncludes(fullUserContext,kw)) transportScore += 4;
    });
    transportProblems.forEach((kw) => {
      if (contextIncludes(fullUserContext,kw)) transportScore += 3;
    });
    const hasExplicitTransportIntent = explicitTransportPhrases.some((phrase) => contextIncludes(fullUserContext,phrase));
    if (hasExplicitTransportIntent) {
      transportScore += 5;
      console.log("[detectCollectionIntent] Explicit transport intent detected");
    }
  }
  if (transportScore > 0) {
    scores.push({ type: "transport_report", score: transportScore, fields: extractTransportFields(fullUserContext) });
  }

  const urbanDomain = ["buraco", "poste", "iluminação", "iluminacao", "lixo", "entulho", "calçada", "calcada", "esgoto", "pavimentação", "pavimentacao", "recape", "asfaltamento", "sinalização", "sinalizacao", "semáforo", "semaforo", "placa", "faixa de pedestre", "drenagem", "sarjeta", "pluvial", "água pluvial", "agua pluvial", "árvore", "arvore", "poda", "fedor", "fedido", "bicho morto", "animal morto", "rato", "bueiro", "vazamento", "sujeira", "fedendo", "cheiro", "elogio", "elogiar", "sugestão", "sugestao", "parabéns", "parabens", "agradeço", "agradeco", "melhorar a cidade", "funcionou bem", "incêndio", "incendio", "fogo", "chamas", "queimando", "alagamento", "alagando", "enchente", "inundando", "chovendo", "chuva forte", "fio caido", "fio caído", "fios expostos", "risco de choque", "choque", "explosão", "explosao", "transformador", "desabamento", "atropelamento", "prédio abandonado", "predio abandonado", "pichação", "pichacao", "barulho", "cachorro", "obra irregular", "tapume", "vandalismo"];
  const urbanProblems = ["quebrado", "apagado", "acumulado", "vazando", "caindo", "fedendo", "fedido", "entupido", "entupida", "entupidas", "entupidos", "intupido", "intupida", "alagado", "alagada", "alagando"];
  let urbanScore = 0;
  urbanDomain.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) urbanScore += 4;
  });
  urbanProblems.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) urbanScore += 2;
  });
  const hasExplicitUrbanIntent = explicitUrbanPhrases.some((phrase) => contextIncludes(fullUserContext,phrase));
  if (hasExplicitUrbanIntent) {
    urbanScore += 5;
    console.log("[detectCollectionIntent] Explicit urban intent detected");
  }

  const hasTransportContext = transportDomain.some((kw) => contextIncludes(fullUserContext,kw));
  const hasUrbanContext = urbanDomain.some((kw) => contextIncludes(fullUserContext,kw));
  if (hasTransportContext && hasExplicitUrbanIntent && !hasUrbanContext) {
    console.log("[detectCollectionIntent] Suppressing urban score - transport context detected without urban keywords");
    urbanScore = 0;
  }

  if (urbanScore > 0) {
    scores.push({ type: "urban_report", score: urbanScore, fields: extractUrbanFields(fullUserContext) });
  }

  const serviceDomain = ["ubs", "hospital", "escola", "ceu", "biblioteca", "posto de saúde", "posto de saude", "centro esportivo"];
  const ratingTerms = ["avaliar", "avaliação", "avaliacao", "nota", "estrela", "atendimento"];
  let serviceScore = 0;
  serviceDomain.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) serviceScore += 4;
  });
  ratingTerms.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) serviceScore += 3;
  });
  const hasExplicitRatingIntent = explicitRatingPhrases.some((phrase) => contextIncludes(fullUserContext,phrase));
  if (hasExplicitRatingIntent) {
    serviceScore += 5;
    console.log("[detectCollectionIntent] Explicit rating intent detected");
  }
  const hasRatingSignal = ratingTerms.some((term) => contextIncludes(fullUserContext,term));
  if (isEquipmentOccupancyQuery) {
    serviceScore = 0;
  }
  if (serviceScore > 0 && (hasRatingSignal || hasExplicitRatingIntent)) {
    scores.push({ type: "service_rating", score: serviceScore, fields: extractServiceFields(fullUserContext) });
  }

  const chamberDomain = ["vereador", "vereadora", "câmara", "camara", "parlamentar", "gabinete", "cmsp"];
  const feedbackTermsWhenChamberAnchored = ["elogiar", "elogio", "reclamar", "reclamação", "reclamacao", "sugestão", "sugestao", "denunciar", "agradecer", "parabenizar"];
  const factualQuestionTerms = [
    "salário", "salario", "quanto ganha", "remuneração", "remuneracao", "qual é o", "qual e o", "qual o ", "qual a ",
    "quanto é", "quanto e", "quantos ", "quantas ", "valor do", "atribuições", "atribuicoes", "função do", "funcao do",
    "papel do", "importância", "importancia", "o que faz", "como funciona", "o que é a", "o que e a",
    "competências", "competencias", "responsabilidades", "mandato", "duração", "duracao", "presidente da câmara",
    "comissões", "comissoes", "processo legislativo", "projeto de lei", "lei municipal", "lei orgânica", "lei organica",
    "regimento interno", "tribuna livre", "sessão ordinária", "sessao ordinaria", "votação", "votacao", "quórum", "quorum",
    "orçamento", "orcamento", "emendas", "verba", "para que serve", "por que existe", "quando foi", "história", "historio",
    "como nasce", "diferença entre", "diferenca entre", "requisitos para", "cargo público", "cargo publico",
    "o que é uma", "o que e uma", "para que serve a", "como participar da", "como participar das",
  ];
  const isFactualQuestionAboutChamber =
    factualQuestionTerms.some((t) => contextIncludes(fullUserContext,t)) &&
    fullUserContext.match(/vereador|vereadora|câmara|camara|municipal|legislativo|legislatura|sessão|sessao|audiência|audiencia|lei|projeto/i);
  let chamberScore = 0;
  chamberDomain.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) chamberScore += 5;
  });
  const chamberAnchored = chamberDomain.some((kw) => contextIncludes(fullUserContext,kw));
  if (chamberAnchored) {
    feedbackTermsWhenChamberAnchored.forEach((kw) => {
      if (contextIncludes(fullUserContext,kw)) chamberScore += 4;
    });
  }
  const isContactQuestionAboutChamberEarly = isInformationalQuestionAboutContact(userMessage);
  if (
    chamberAnchored &&
    chamberScore >= 5 &&
    !isFactualQuestionAboutChamber &&
    !isContactQuestionAboutChamberEarly
  ) {
    scores.push({ type: "chamber_feedback", score: chamberScore, fields: extractChamberFields(fullUserContext) });
  }

  const servicesDomain = [
    "onde fica", "onde tem", "perto de mim", "mais perto", "próximo de mim", "proximo de mim",
    "próximo de", "proximo de", "como chego", "endereço", "telefone", "horário",
    "perto daqui", "proximo daqui", "mais proximo", "qual é o mais perto",
  ];
  const servicesTypes = [
    "ubs", "hospital", "escola", "ceu", "biblioteca", "centro esportivo",
    "posto de saúde", "posto de saude", "caps", "cras", "ama",
  ];
  let servicesScore = 0;
  servicesDomain.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) servicesScore += 4;
  });
  servicesTypes.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) servicesScore += 2;
  });
  const hasExplicitServicesIntent = explicitServicesPhrases.some((phrase) => contextIncludes(fullUserContext,phrase));
  if (hasExplicitServicesIntent) {
    servicesScore += 5;
    console.log("[detectCollectionIntent] Explicit services intent detected");
  }
  const isEvaluating = ratingTerms.some((term) => contextIncludes(fullUserContext,term));
  if (servicesScore > 0 && !isEvaluating) {
    scores.push({ type: "services", score: servicesScore, fields: {} });
  }

  const audienciasDomain = ["audiência", "audiencia", "consulta pública", "consulta publica", "participar", "inscrever", "próxima reunião", "proxima reuniao"];
  const audienciasTerms = ["quando", "próxima", "proxima", "tema", "assunto", "sobre"];
  let audienciasScore = 0;
  audienciasDomain.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) audienciasScore += 5;
  });
  audienciasTerms.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) audienciasScore += 2;
  });
  const hasExplicitAudienciasIntent = explicitAudienciasPhrases.some((phrase) => contextIncludes(fullUserContext,phrase));
  if (hasExplicitAudienciasIntent) {
    audienciasScore += 5;
    console.log("[detectCollectionIntent] Explicit audiencias intent detected");
  }
  if (audienciasScore > 0) {
    scores.push({ type: "audiencias", score: audienciasScore, fields: {} });
  }

  const knowledgeDomain = [
    "como funciona", "como posso", "como participar", "o que é", "o que e", "quem é", "quem e", "qual é", "qual e", "qual a ", "qual o ",
    "quais são", "quais sao", "quais as", "quais os", "quantos ", "quantas ", "me explica", "dúvida sobre", "duvida sobre",
    "informação sobre", "informacao sobre", "atribuições", "atribuicoes", "atribuição", "atribuicao", "competências", "competencias",
    "responsabilidades", "importância", "importancia", "salário", "salario", "remuneração", "remuneracao", "quanto ganha", "valor do",
    "onde fica", "onde fica a", "onde consultar", "qual o endereço", "qual o endereco", "qual endereço", "qual endereco",
    "participar das", "sessões da", "sessão da", "audiência", "audiencia", "mandato", "presidente da câmara",
    "comissões", "comissoes", "processo legislativo", "projeto de lei", "lei municipal", "lei orgânica", "lei organica", "regimento interno",
    "tribuna livre", "sessão ordinária", "sessao ordinaria", "votação", "votacao", "quórum", "quorum", "orçamento", "orcamento", "emendas", "para que serve", "como nasce uma lei",
    "cpi", "cpis", "comissão parlamentar de inquérito", "comissao parlamentar de inquerito", "comissão parlamentar", "comissao parlamentar",
    "diferença entre", "diferenca entre", "requisitos para", "história da câmara", "historio da camara", "o que é uma audiência", "o que e uma audiencia",
    "equipamentos públicos", "equipamentos publicos", "população", "populacao", "habitantes", "densidade", "sistema viário", "sistema viario", "geosampa",
    "ubs", "unidade de saúde", "transporte público", "transporte publico", "rede de transporte", "malha viária", "infraestrutura viária", "dados da cidade",
    "zoneamento", "lpuos", "construir", "reformar", "imóvel", "imovel", "legislação urbana", "legislacao urbana", "siszon", "smul", "loteamento", "uso do solo", "coeficiente de aproveitamento",
  ];
  let knowledgeScore = 0;
  knowledgeDomain.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) knowledgeScore += 4;
  });
  const normalizedUserMessage = userMessage
    .trim()
    .replace(/^0\s*que\s/gi, "o que ")
    .replace(/\b0\s*que\s/gi, "o que ");
  const isInformationalQuestion = /^(o que (é|e) |como funciona|quem (é|são|sao)|qual (é|e) (a |o )?(função|papel|salário|salario|importância|importancia|competência|competencia)|qual a |qual o |quantos |quantas |me explica|o que são|quais são|quais sao|quais as |quais os |para que serve|por que existe|como nasce|diferença entre|requisitos )/i.test(
    normalizedUserMessage,
  );
  const isLocationQuestionAboutChamber = /^(onde fica|qual (é|e) (o )?endereço|qual (é|e) (o )?endereco|como chego)/i.test(normalizedUserMessage);
  const isContactQuestionAboutChamber = /como\s+(entrar\s+em\s+)?contato|entrar\s+em\s+contato\s+com|telefone\s+(da\s+)?(câmara|camara)?|email\s+(da\s+)?(câmara|camara)?|endere[cç]o\s+(da\s+)?(câmara|camara)?|falar\s+com\s+(a\s+|um\s+)?(câmara|camara|vereador)|ligar\s+para\s+(a\s+)?(câmara|camara)|contato\s+(da\s+)?(câmara|camara)|como\s+fal(o|ar)\s+com|como\s+faz\s+pra\s+falar\s+com/i.test(
    normalizedForIntent,
  );
  const isParticipationQuestion = /^(como posso participar|como participar|participar das sessões|participar da sessão)/i.test(normalizedUserMessage);
  const mentionsChamber = fullUserContext.match(/câmara|camara|municipal|legislativo|vereador|vereadores/i);
  const mentionsSessionsOrAudience = fullUserContext.match(/sessões|sessão|audiência|audiencia|participar/i);
  const isInformationalAboutAudience =
    mentionsSessionsOrAudience &&
    /(o que (é|e) (uma |a )?(audiência|audiencia)(\s+pública|\s+publica)?|como funciona (a )?(audiência|audiencia)(\s+pública|\s+publica)?|o que são (as )?(audiências|audiencias)(\s+públicas|\s+publicas)?)/i.test(
      normalizedUserMessage,
    );
  const cityDataTerms = ["equipamentos", "equipamento público", "população", "habitantes", "densidade", "sistema viário", "sistema viario", "geosampa", "ubs", "transporte público", "rede de transporte", "malha viária", "dados da cidade", "são paulo", "sao paulo", "zoneamento", "lpuos", "construir", "imóvel", "imovel", "siszon", "legislação urbana", "legislacao urbana"];
  const isCityDataQuestion =
    cityDataTerms.some((t) => contextIncludes(fullUserContext,t)) &&
    (isInformationalQuestion || /^(qual a |qual o |quantos |quais |como funciona|o que é )/i.test(userMessage.trim()));
  if (isCityDataQuestion) {
    knowledgeScore = Math.max(knowledgeScore, 6);
    console.log("[detectCollectionIntent] City data question (equipamentos/transportes/população/viário/zoneamento) → boosting general for RAG");
  }
  const zoneamentoTerms = ["zoneamento", "lpuos", "construir", "reformar", "imóvel", "imovel", "siszon", "legislação urbana", "legislacao urbana", "smul"];
  const isZoneamentoQuestion = zoneamentoTerms.some((t) => contextIncludes(fullUserContext,t));
  if (isZoneamentoQuestion) {
    knowledgeScore = Math.max(knowledgeScore, 9);
    console.log("[detectCollectionIntent] Zoneamento/LPUOS/construir question → boosting general for RAG/KB");
  }
  if (mentionsChamber && (isInformationalQuestion || isLocationQuestionAboutChamber)) {
    knowledgeScore = Math.max(knowledgeScore, 6);
    console.log("[detectCollectionIntent] Informational/location question about Câmara → boosting general for RAG");
  }
  if (mentionsChamber && isContactQuestionAboutChamber) {
    knowledgeScore = Math.max(knowledgeScore, 9);
    console.log("[detectCollectionIntent] Contact question (telefone/email/contato com Câmara) → boosting general for RAG");
  }
  if ((isParticipationQuestion && mentionsSessionsOrAudience) || (mentionsChamber && isParticipationQuestion)) {
    knowledgeScore = Math.max(knowledgeScore, 6);
    console.log("[detectCollectionIntent] Participation question (sessões/audiência) → boosting general for RAG");
  }
  if (isInformationalAboutAudience) {
    knowledgeScore = Math.max(knowledgeScore, 8);
    console.log("[detectCollectionIntent] Informational question about audiência (o que é / como funciona) → boosting general for RAG");
  }
  if ((contextIncludes(fullUserContext,"atribuições") || contextIncludes(fullUserContext,"atribuicoes")) && mentionsChamber) {
    knowledgeScore = Math.max(knowledgeScore, 6);
    console.log("[detectCollectionIntent] Question about atribuições/vereadores → boosting general for RAG");
  }
  if (isFactualQuestionAboutChamber) {
    knowledgeScore = Math.max(knowledgeScore, 7);
    console.log("[detectCollectionIntent] Factual question about vereador/Câmara (salário, função, etc.) → boosting general for RAG");
  }
  if (isCamaraFuncionamentoInternoQuery(fullUserContext)) {
    knowledgeScore = Math.max(knowledgeScore, 8);
    console.log("[detectCollectionIntent] Estrutura/funcionamento da Câmara → boosting general for RAG");
  }
  const isProjetosTramitacao = /projetos?\s+(est[aã]o\s+)?em\s+tramita[cç][aã]o|tramita[cç][aã]o\s+(de\s+)?projetos?|quais\s+projetos?\s+est[aã]o/i.test(fullUserContext);
  if (isProjetosTramitacao) {
    knowledgeScore = Math.max(knowledgeScore, 8);
    console.log("[detectCollectionIntent] Projetos em tramitação → boosting general for RAG");
  }
  const isBuscarAudiencia = /(como\s+posso\s+)?buscar\s+(uma\s+)?(audi[eê]ncia|audiencia)|buscar\s+(audi[eê]ncia|audiencia)\s+p[uú]blica/i.test(fullUserContext);
  if (isBuscarAudiencia) {
    knowledgeScore = Math.max(knowledgeScore, 8);
    console.log("[detectCollectionIntent] Buscar audiência pública → boosting general for RAG");
  }
  const isQualVereadorOuSaber = /qual\s+vereador|quais\s+vereadores|(quero\s+)?saber\s+(dos\s+)?(os\s+)?vereadores|vereadore?s?\s+de\s+sp/i.test(normalizedForIntent);
  if (isQualVereadorOuSaber && mentionsChamber) {
    knowledgeScore = Math.max(knowledgeScore, 7);
    console.log("[detectCollectionIntent] Qual vereador / saber vereadores → boosting general for RAG");
  }
  const isVotacoesOuCanal = /(últimas\s+)?vota[cç][oõ]es|canal\s+oficial|sugest[oõ]es\s+ou\s+reclama[cç][oõ]es/i.test(normalizedForIntent);
  const isComissoesOuProcesso = /papel\s+das\s+comiss[oõ]es|comiss[oõ]es\s+(dentro\s+)?da\s+(c[aâ]mara|camara)|processo\s+legislativo|processo\s+de\s+vota[cç][aã]o|tipos\s+de\s+projetos|acompanhar\s+(as\s+)?atividades/i.test(normalizedForIntent);
  const isReuniaoCamara = /reuni[aã]o\s+da\s+(c[aâ]mara|camara)|alguma\s+reuni[aã]o|tem\s+reuni[aã]o/i.test(normalizedForIntent);
  const isConsultarProjetos = /consultar\s+projetos\s+de\s+lei|onde\s+(posso\s+)?consultar\s+os\s+projetos|onde\s+vejo\s+os\s+projetos/i.test(normalizedForIntent);
  if (mentionsChamber && (isVotacoesOuCanal || isComissoesOuProcesso || isReuniaoCamara || isConsultarProjetos)) {
    knowledgeScore = Math.max(knowledgeScore, 8);
    console.log("[detectCollectionIntent] Planilha Funcionais (votações/comissões/reunião/consultar projetos) → boosting general for RAG");
  }
  if (knowledgeScore > 0) {
    scores.push({ type: "general", score: knowledgeScore, fields: {} });
  }

  const historyDomain = ["meu relato", "meus relatos", "minhas avaliações", "minhas avaliacoes", "minha reclamação", "minha reclamacao", "status do meu", "o que eu fiz", "minha denúncia", "minha denuncia", "meu histórico", "meu historico"];
  let historyScore = 0;
  historyDomain.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) historyScore += 5;
  });
  const hasExplicitHistoryIntent = explicitHistoryPhrases.some((phrase) => contextIncludes(fullUserContext,phrase));
  if (hasExplicitHistoryIntent) {
    historyScore += 5;
    console.log("[detectCollectionIntent] Explicit history intent detected");
  }
  if (historyScore > 0) {
    scores.push({ type: "history", score: historyScore, fields: {} });
  }

  const vereadoresDomain = ["vereador", "vereadora", "representante", "parlamentar"];
  const vereadoresTerms = ["minha região", "minha regiao", "meu bairro", "quem representa", "zona"];
  let vereadoresScore = 0;
  vereadoresDomain.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) vereadoresScore += 4;
  });
  vereadoresTerms.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) vereadoresScore += 3;
  });
  const hasExplicitVereadoresIntent = explicitVereadoresPhrases.some((phrase) => contextIncludes(fullUserContext,phrase));
  if (hasExplicitVereadoresIntent) {
    vereadoresScore += 5;
    console.log("[detectCollectionIntent] Explicit vereadores intent detected");
  }
  if (isInformationalQuestionAboutVereadorOrCamara(userMessage)) {
    vereadoresScore = Math.max(vereadoresScore, 12);
    console.log("[detectCollectionIntent] Informational vereador/Câmara query → vereadores");
  }
  if (vereadoresScore > 0 && !isEvaluating) {
    scores.push({ type: "vereadores", score: vereadoresScore, fields: {} });
  }

  const noticiasDomain = ["notícia", "noticia", "novidade", "acontecendo", "recente"];
  const noticiasTerms = ["câmara", "camara", "legislativo", "vereador"];
  let noticiasScore = 0;
  noticiasDomain.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) noticiasScore += 4;
  });
  noticiasTerms.forEach((kw) => {
    if (contextIncludes(fullUserContext,kw)) noticiasScore += 2;
  });
  const hasExplicitNoticiasIntent = explicitNoticiasPhrases.some((phrase) => contextIncludes(fullUserContext,phrase));
  if (hasExplicitNoticiasIntent) {
    noticiasScore += 5;
    console.log("[detectCollectionIntent] Explicit noticias intent detected");
  }
  if (noticiasScore > 0) {
    scores.push({ type: "noticias", score: noticiasScore, fields: {} });
  }

  if (scores.length === 0) {
    console.log("[detectCollectionIntent] Intent found but no domain keywords matched");
    return null;
  }

  if (
    existingJourney === "urban_report" &&
    messageLooksLikeTransportProblemReport(userMessage)
  ) {
    const transportEntry = scores.find((s) => s.type === "transport_report");
    const boost = 14;
    if (transportEntry) {
      transportEntry.score += boost;
    } else {
      scores.push({
        type: "transport_report",
        score: boost,
        fields: extractTransportFields(msgLower),
      });
    }
    console.log(
      "[detectCollectionIntent] Transport problem in last message during urban_report → boosted transport_report",
    );
  }

  if (lastMsgExplicitIntent) {
    const targetScore = scores.find((s) => s.type === lastMsgExplicitIntent.type);
    if (targetScore) {
      targetScore.score += lastMsgExplicitIntent.boost;
      console.log(`[detectCollectionIntent] Applied explicit intent boost: ${lastMsgExplicitIntent.type} now has score ${targetScore.score}`);
    } else {
      let fields: Record<string, unknown> = {};
      if (lastMsgExplicitIntent.type === "urban_report") {
        fields = extractUrbanFields(msgLower);
      } else if (lastMsgExplicitIntent.type === "transport_report") {
        fields = extractTransportFields(msgLower);
      } else if (lastMsgExplicitIntent.type === "service_rating") {
        fields = extractServiceFields(msgLower);
      }
      scores.push({
        type: lastMsgExplicitIntent.type,
        score: lastMsgExplicitIntent.boost,
        fields,
      });
      console.log(`[detectCollectionIntent] Created new score for explicit intent: ${lastMsgExplicitIntent.type} with score ${lastMsgExplicitIntent.boost}`);
    }
  }

  if (genericTopicIntent) {
    const existingScore = scores.find((s) => s.type === genericTopicIntent.type);
    if (existingScore) {
      existingScore.score += genericTopicIntent.boost;
      console.log(`[detectCollectionIntent] Applied generic topic boost to ${genericTopicIntent.type}: +${genericTopicIntent.boost}`);
    } else {
      scores.push({
        type: genericTopicIntent.type,
        score: genericTopicIntent.boost,
        fields: {},
      });
      console.log(`[detectCollectionIntent] Created new score from generic topic: ${genericTopicIntent.type} with score ${genericTopicIntent.boost}`);
    }
  }

  let winner = scores.sort((a, b) => b.score - a.score)[0];
  console.log("[detectCollectionIntent] Scores:", JSON.stringify(scores.map((s) => ({ type: s.type, score: s.score }))));
  console.log("[detectCollectionIntent] Winner:", winner.type, "with score:", winner.score);

  if (hasIntentChange && winner.score > 0 && winner.type !== existingJourney) {
    const boostAmount = 10;
    winner = { ...winner, score: winner.score + boostAmount };
    console.log("[detectCollectionIntent] Intent change indicator detected, boosted by", boostAmount, "to:", winner.score);
  }

  const thresholds: Record<string, number> = {
    urban_report: 3,
    transport_report: 3,
    service_rating: 3,
    chamber_feedback: 9,
    services: 4,
    audiencias: 4,
    general: 4,
    history: 4,
    vereadores: 4,
    noticias: 4,
  };

  const threshold = thresholds[winner.type] || 5;

  const allJourneyTypes = ["urban_report", "transport_report", "service_rating", "services", "audiencias", "general", "history", "occupancy", "vereadores", "noticias"] as const;
  const structuredTypes = ["urban_report", "transport_report", "service_rating"] as const;

  const isWinnerInAllTypes = allJourneyTypes.includes(winner.type as (typeof allJourneyTypes)[number]);
  const isExistingInAllTypes = existingJourney && allJourneyTypes.includes(existingJourney as (typeof allJourneyTypes)[number]);
  const isWinnerStructured = structuredTypes.includes(winner.type as (typeof structuredTypes)[number]);
  const isExistingStructured = existingJourney && structuredTypes.includes(existingJourney as (typeof structuredTypes)[number]);

  if (
    isExistingStructured &&
    existingJourney &&
    winner.type !== existingJourney &&
    !lastMsgExplicitIntent &&
    msgLower.trim().length <= 56 &&
    !messageLooksLikeTransportProblemReport(userMessage)
  ) {
    console.log(
      `[detectCollectionIntent] Preserving structured journey ${existingJourney} on short in-collection reply (winner: ${winner.type}=${winner.score})`,
    );
    const accumulatedFields = accumulateFieldsFromHistory(conversationHistory, existingJourney);
    return { type: existingJourney, fields: accumulatedFields };
  }

  if (isExistingInAllTypes && isWinnerInAllTypes && winner.type !== existingJourney && winner.score >= 3) {
    console.log(`[detectCollectionIntent] Universal journey switch detected: ${existingJourney} → ${winner.type} (score: ${winner.score})`);
    if (isWinnerStructured) {
      const validType = winner.type as "urban_report" | "transport_report" | "service_rating";
      return { type: validType, fields: winner.fields };
    }
    return { type: winner.type as CollectionIntent["type"], fields: winner.fields };
  }

  if (winner.score < threshold) {
    console.log(`[detectCollectionIntent] Winner score ${winner.score} below threshold ${threshold} for ${winner.type}, skipping`);
    if (existingJourney) {
      console.log(`[detectCollectionIntent] Maintaining existing journey: ${existingJourney}`);
      const accumulatedFields = accumulateFieldsFromHistory(conversationHistory, existingJourney);
      return { type: existingJourney, fields: accumulatedFields };
    }
    return null;
  }

  if (winner.type === "chamber_feedback") {
    return { type: "urban_report", fields: winner.fields };
  }

  const lightTypes = ["services", "audiencias", "general", "history", "occupancy"];
  if (existingJourney && isExistingStructured && lightTypes.includes(winner.type) && winner.score < 6) {
    console.log(`[detectCollectionIntent] Existing journey ${existingJourney} preserved (new intent was light with low score: ${winner.type}=${winner.score})`);
    const accumulatedFields = accumulateFieldsFromHistory(conversationHistory, existingJourney);
    return { type: existingJourney, fields: accumulatedFields };
  }

  const toolHint = getToolHintForIntent(winner.type);
  if (toolHint) {
    console.log(`[detectCollectionIntent] Light journey detected: ${winner.type}, hint: ${toolHint}`);
  }

  return { type: winner.type as CollectionIntent["type"], fields: winner.fields };
}
