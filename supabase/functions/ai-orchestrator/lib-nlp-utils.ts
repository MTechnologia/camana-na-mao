import {
  aggregateRatingDimensionsStars,
  parseRatingDimensionsMarker,
} from "./lib-service-rating.ts";
import { parseFlexibleOccurrenceTime } from "./lib-transport-parsing.ts";

export function isAffirmativeResponse(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const patterns = [
    /^s+i*m*$/i, /^s$/i, /^ss+$/i,
    /^pode$/i, /^pode ser$/i, /^pode sim$/i, /^bora$/i, /^vamos$/i, /^vamos lá$/i,
    /^ok$/i, /^okay$/i, /^okey$/i, /^beleza$/i, /^blz$/i, /^show$/i,
    /^quero$/i, /^desejo$/i, /^aceito$/i, /^confirmo$/i, /^confirma$/i,
    /^isso$/i, /^isso mesmo$/i, /^exato$/i, /^exatamente$/i, /^isso aí$/i, /^isso ai$/i,
    /^correto$/i, /^certo$/i, /^verdade$/i, /^positivo$/i,
    /^ta$/i, /^tá$/i, /^ta bom$/i, /^tá bom$/i, /^tá certo$/i, /^tá ok$/i,
    /^legal$/i, /^ótimo$/i, /^otimo$/i, /^perfeito$/i, /^massa$/i,
    /^claro$/i, /^com certeza$/i, /^sem dúvida$/i, /^lógico$/i, /^logico$/i,
    /^é isso$/i, /^e isso$/i, /^é esse$/i, /^é essa$/i,
    /^manda$/i, /^manda ver$/i, /^segue$/i, /^vai$/i, /^dale$/i, /^bora lá$/i,
    /^afirmativo$/i, /^positivo$/i, /^certeza$/i,
    /^👍$/i, /^✅$/i, /^✔$/i, /^👌$/i,
  ];
  return patterns.some((p) => p.test(lower)) ||
    lower.includes("sim") || lower.includes("correto") ||
    lower.includes("confirmo") || lower.includes("isso mesmo");
}

export function isNegativeResponse(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const patterns = [
    /^n+[ãa]*o*$/i, /^n$/i, /^nn+$/i, /^nop$/i, /^nope$/i, /^nem$/i,
    /^nunca$/i, /^jamais$/i, /^negativo$/i, /^errado$/i,
    /^não é$/i, /^nao e$/i, /^não é isso$/i, /^nao e isso$/i,
    /^não quero$/i, /^nao quero$/i, /^não pode$/i, /^nao pode$/i,
    /^cancela$/i, /^cancelar$/i, /^parar$/i, /^para$/i, /^deixa$/i,
    /^deixa pra lá$/i, /^deixa quieto$/i, /^esquece$/i, /^desisto$/i,
    /^outro$/i, /^outra$/i, /^diferente$/i, /^mudar$/i, /^trocar$/i,
    /^👎$/i, /^❌$/i, /^✖$/i,
  ];
  return patterns.some((p) => p.test(lower)) ||
    lower.startsWith("não") || lower.startsWith("nao") ||
    lower.includes("errado") || lower.includes("incorreto");
}

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  urban: [
    "poste", "luz", "apagado", "apagada", "escuro", "lampada", "lâmpada", "iluminação", "iluminacao",
    "buraco", "asfalto", "semaforo", "semáforo", "lombada", "cratera", "pavimento", "pista",
    "calcada", "calçada", "passeio", "rampa", "degrau", "meio-fio",
    "bueiro", "esgoto", "vazamento", "alagamento", "enchente", "valeta", "enxurrada", "córrego",
    "lixo", "entulho", "sujeira", "descarte", "caçamba", "cata", "resíduo",
    "arvore", "árvore", "mato", "poda", "galho", "raiz", "jardim", "praça", "praca",
    "rato", "barata", "escorpião", "bicho", "animal", "pombo", "cobra", "infestação",
    "caido", "caído", "quebrado", "quebrada", "danificado", "estragado",
    "entupido", "entupida", "transbordando", "vazando", "fedendo", "fedido",
    "acumulado", "abandonado", "irregular", "perigoso",
    "patinete", "bicicleta", "bike", "moto", "estacionado", "drone", "antena",
  ],
  transport: [
    "atraso", "atrasado", "atrasou", "demora", "demorou", "esperando", "nunca chega", "não passou", "nao passou",
    "lotado", "lotação", "lotacao", "cheio", "superlotado", "apertado", "não coube", "nao coube", "sem espaço",
    "segurança", "seguranca", "assalto", "roubo", "assédio", "assedio", "perigo", "medo", "briga", "ameaça",
    "sujo", "sujeira", "fedendo", "fedor", "nojento", "lixo", "vômito", "vomito", "imundo",
    "acessibilidade", "cadeirante", "elevador", "rampa", "deficiente", "pcd", "mobilidade",
    "motorista", "cobrador", "rude", "grosso", "mal educado", "não parou", "nao parou", "freada", "condução",
    "ônibus", "onibus", "metrô", "metro", "trem", "linha", "estação", "estacao", "terminal", "ponto",
  ],
  service: [
    "ubs", "hospital", "escola", "ceu", "biblioteca", "posto", "creche", "pronto-socorro", "ama",
    "atendimento", "demora", "fila", "espera", "médico", "medico", "professor", "funcionário", "funcionario",
    "bom", "ruim", "péssimo", "pessimo", "ótimo", "otimo", "excelente", "terrível", "terrivel", "horrível",
    "rápido", "rapido", "lento", "eficiente", "ineficiente", "organizado", "bagunça", "bagunca",
  ],
  audiencias: [
    "audiência", "audiencia", "consulta", "pública", "publica", "participar", "inscrever", "inscrição",
    "tema", "sessão", "sessao", "reunião", "reuniao", "evento", "câmara", "camara", "vereador",
  ],
  general: [
    "informação", "informacao", "dúvida", "duvida", "pergunta", "como funciona", "o que é", "o que e",
    "horário", "horario", "endereço", "endereco", "telefone", "contato", "atendimento",
    "estrutura", "funcionamento", "apresentação", "apresentacao", "conhecer a câmara", "conhecer a camara",
  ],
};

export function isValidDomainDescription(text: string, _domain: string): boolean {
  if (!text || text.trim().length === 0) return false;
  if (isGenericIntentText(text)) return false;
  return true;
}

export function extractImplicitData(
  userMessage: string,
  lastAssistantQuestion: string,
  _domain: string,
): Record<string, unknown> {
  const lower = userMessage.toLowerCase().trim();
  const questionLower = lastAssistantQuestion.toLowerCase();
  const extracted: Record<string, unknown> = {};

  if (
    questionLower.includes("risco") || questionLower.includes("urgente") ||
    questionLower.includes("perigoso") || questionLower.includes("gravidade")
  ) {
    if (isAffirmativeResponse(userMessage)) {
      extracted.risk_level = "moderate";
    } else if (isNegativeResponse(userMessage)) {
      extracted.risk_level = "none";
    }
    if (/muito|demais|urgente|grave|sério|serio|crítico|critico|perigoso|imediato/i.test(lower)) {
      extracted.risk_level = "critical";
    }
  }

  if (
    questionLower.includes("afetando") || questionLower.includes("escopo") ||
    questionLower.includes("só você") || questionLower.includes("so voce") ||
    questionLower.includes("toda a rua") || questionLower.includes("bairro")
  ) {
    if (/eu|minha casa|só eu|somente eu|meu apartamento|meu prédio/i.test(lower)) {
      extracted.affected_scope = "individual";
    } else if (/rua|vizinhos|quarteirão|prédio|condomínio|vizinhança/i.test(lower)) {
      extracted.affected_scope = "street";
    } else if (/bairro|região|todo|toda|muito|vários|várias|comunidade/i.test(lower)) {
      extracted.affected_scope = "neighborhood";
    }
  }

  if (
    questionLower.includes("quando") || questionLower.includes("data") ||
    questionLower.includes("hora") || questionLower.includes("dia")
  ) {
    if (/agora|acabou de|agora pouco|neste momento|há pouco|ha pouco|acabei de ver/i.test(lower)) {
      extracted.occurrence_date = new Date().toISOString().split("T")[0];
      extracted.occurrence_time = new Date().toTimeString().slice(0, 5);
    } else if (/hoje/i.test(lower)) {
      extracted.occurrence_date = new Date().toISOString().split("T")[0];
    } else if (/ontem/i.test(lower)) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      extracted.occurrence_date = yesterday.toISOString().split("T")[0];
    } else if (/anteontem/i.test(lower)) {
      const dayBefore = new Date();
      dayBefore.setDate(dayBefore.getDate() - 2);
      extracted.occurrence_date = dayBefore.toISOString().split("T")[0];
    } else if (/semana passada/i.test(lower)) {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      extracted.occurrence_date = lastWeek.toISOString().split("T")[0];
    }

    const parsedTime = parseFlexibleOccurrenceTime(userMessage);
    if (parsedTime) {
      extracted.occurrence_time = parsedTime;
    } else if (/manhã|de manhã|cedo|logo cedo/i.test(lower)) {
      extracted.occurrence_time = "08:00";
    } else if (/tarde|de tarde|após almoço|depois do almoço/i.test(lower)) {
      extracted.occurrence_time = "14:00";
    } else if (/noite|de noite|anoitecer|fim do dia/i.test(lower)) {
      extracted.occurrence_time = "20:00";
    } else if (/madrugada|de madrugada/i.test(lower)) {
      extracted.occurrence_time = "03:00";
    } else if (/meio-dia|meio dia|almoço/i.test(lower)) {
      extracted.occurrence_time = "12:00";
    }
  }

  if (
    questionLower.includes("nota") || questionLower.includes("estrela") ||
    questionLower.includes("1 a 5") || questionLower.includes("avaliar") || questionLower.includes("avaliação")
  ) {
    const numberWords: Record<string, number> = {
      um: 1, uma: 1, dois: 2, duas: 2, "três": 3, tres: 3,
      quatro: 4, cinco: 5, zero: 0,
    };
    for (const [word, num] of Object.entries(numberWords)) {
      if (lower.includes(word) && num >= 1 && num <= 5) {
        extracted.rating_stars = num;
        break;
      }
    }
    if (/péssim|pessim|horrível|horrivel|terrível|terrivel|muito ruim|lixo/i.test(lower)) {
      extracted.rating_stars = 1;
      extracted.sentiment = "negative";
    } else if (/ruim|fraco|mal|insatisf/i.test(lower)) {
      extracted.rating_stars = 2;
      extracted.sentiment = "negative";
    } else if (/ok|regular|mais ou menos|razoável|razoavel|médio|medio/i.test(lower)) {
      extracted.rating_stars = 3;
      extracted.sentiment = "neutral";
    } else if (/bom|legal|gostei|satisf|decente/i.test(lower)) {
      extracted.rating_stars = 4;
      extracted.sentiment = "positive";
    } else if (/ótimo|otimo|excelente|perfeito|maravilhoso|muito bom|sensacional|top/i.test(lower)) {
      extracted.rating_stars = 5;
      extracted.sentiment = "positive";
    }
    const dimsMark = parseRatingDimensionsMarker(userMessage);
    if (dimsMark) {
      extracted.rating_dimensions = dimsMark;
      extracted.rating_stars = aggregateRatingDimensionsStars(dimsMark);
    }
  }

  if (
    questionLower.includes("correto") || questionLower.includes("confirma") ||
    questionLower.includes("certo") || questionLower.includes("está correto") || questionLower.includes("este endereço")
  ) {
    if (isAffirmativeResponse(userMessage)) {
      extracted.address_confirmed = true;
      extracted.service_address_confirmed = true;
    } else if (isNegativeResponse(userMessage)) {
      extracted.address_confirmed = false;
      extracted.service_address_confirmed = false;
    }
  }

  if (
    questionLower.includes("tipo de serviço") || questionLower.includes("qual serviço") || questionLower.includes("que serviço")
  ) {
    const serviceTypes: Record<string, string> = {
      ubs: "ubs", "posto de saúde": "ubs", "posto de saude": "ubs", postinho: "ubs",
      hospital: "hospital", "pronto socorro": "hospital", "pronto-socorro": "hospital", ps: "hospital",
      escola: "school", "colégio": "school", colegio: "school",
      ceu: "ceu", "centro educacional": "ceu",
      biblioteca: "library",
      "centro esportivo": "sports_center", quadra: "sports_center", "ginásio": "sports_center", ginasio: "sports_center",
    };
    for (const [keyword, type] of Object.entries(serviceTypes)) {
      if (lower.includes(keyword)) {
        extracted.service_type = type;
        break;
      }
    }
  }

  return extracted;
}

export function normalizeTextForMatching(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/_/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export function isGenericIntentText(text: string): boolean {
  const genericPhrases = [
    /^quero\s*(relatar|reportar|fazer|registrar)/i,
    /^preciso\s*(relatar|reportar|fazer|registrar)/i,
    /^tenho\s*um\s*(problema|relato)/i,
    /^problema\s*(na|no)\s*(cidade|bairro|rua)/i,
    /^relatar\s*(um\s*)?problema/i,
    /^fazer\s*(um\s*)?(relato|denuncia)/i,
    /^quero\s*avaliar/i,
    /^avaliar\s*(um\s*)?servi[çc]o/i,
    /^(sim|não|nao|ok|pode|quero|desejo|aceito)$/i,
    /^quero\s*(denunciar|relatar|reportar)\s*(um\s*)?(problema|issue)/i,
    /^problema\s*(de|no|com)\s*transporte/i,
    /^relatar.*transporte/i,
    /quero\s*falar\s*(de|do|sobre)\s*(transporte|avalia[çc][ãa]o|servi[çc]o|urbano|cidade)/i,
    /^quero\s+falar\s+sobre\s+a\s+cidade\b/i,
    /^preciso\s+falar\s+sobre\s+a\s+cidade\b/i,
    /^quero\s+falar\s+da\s+cidade\b/i,
    /^preciso\s+falar\s+da\s+cidade\b/i,
    /\bquero\s+falar\s+sobre\s+a\s+cidade\s*[—–-]\s*pode\s+ser\b/i,
    /falar\s*(de|do|sobre)\s*(transporte|avalia[çc][ãa]o|servi[çc]o|urbano|cidade)/i,
    /mudar\s*para\s*(transporte|avalia[çc][ãa]o|servi[çc]o|urbano|relato)/i,
    /trocar\s*para\s*(transporte|avalia[çc][ãa]o|servi[çc]o|urbano|relato)/i,
    /quero\s*(avaliar|relatar|reportar)\s*(um\s*)?(servi[çc]o|problema|transporte)/i,
    /na\s*verdade,?\s*(quero|preciso|gostaria)/i,
    /mudando\s*de\s*assunto/i,
    /outro\s*assunto/i,
    /quero\s*(encontrar|buscar|achar|procurar)\s*(um\s*)?(servi[çc]o|ubs|escola|hospital|ceu)/i,
    /encontrar\s*(um\s*)?(servi[çc]o|ubs|escola|hospital|ceu)/i,
    /buscar\s*(um\s*)?(servi[çc]o|ubs|escola|hospital|ceu)/i,
    /procurar\s*(um\s*)?(servi[çc]o|ubs|escola|hospital|ceu)/i,
    /onde\s*(fica|tem|posso\s*encontrar)\s*(um\s*)?(ubs|escola|hospital|posto|ceu)/i,
    /servi[çc]os?\s*(perto|pr[óo]ximo|perto\s*de\s*mim)/i,
    /tenho\s*(uma?\s*)?(d[úu]vida|pergunta|quest[ãa]o)\s*(sobre)?/i,
    /d[úu]vida\s*(sobre|da|do)\s*(c[âa]mara|legislativo|vereador)/i,
    /como\s+funciona\s+(a\s+)?(c[âa]mara|legislativo|vota[çc][ãa]o)/i,
    /o\s+que\s+[ée]\s+(uma?\s+)?(audi[êe]ncia|projeto|lei|comiss[ãa]o)/i,
    /quem\s+[ée]\s+o\s*(vereador|presidente)/i,
    /me\s+explica\s+(como|o\s+que)/i,
    /informa[çc][ãa]o\s+sobre/i,
    /quero\s+(saber|entender|aprender)/i,
    /quais?\s*(as|a)?\s*([úu]ltimas?\s*)?not[íi]cias/i,
    /not[íi]cias\s*(da|do|sobre)\s*(c[âa]mara|legislativo|vereador)/i,
    /novidades\s*(da|do)\s*(c[âa]mara|legislativo)/i,
    /o\s+que\s+est[áa]\s+acontecendo\s+(na|no)\s*(c[âa]mara|legislativo)/i,
  ];

  const normalized = text.trim().toLowerCase();
  if (genericPhrases.some((pattern) => pattern.test(normalized))) return true;
  return false;
}

export const TRANSPORT_KEYWORDS = [
  "atraso", "atrasado", "atrasou", "demora", "demorou", "esperando", "nunca chega", "não passou", "nao passou",
  "lotado", "lotação", "lotacao", "cheio", "superlotado", "apertado", "sem espaço", "sem espaco", "não coube", "nao coube",
  "segurança", "seguranca", "assalto", "roubo", "assédio", "assedio", "perigo", "medo", "ameaça", "briga", "agressão", "agressao",
  "sujo", "sujeira", "limpeza", "fedendo", "fedor", "nojento", "imundo", "lixo", "vômito", "vomito",
  "acessibilidade", "cadeirante", "elevador", "rampa", "deficiente", "muleta", "pcd", "mobilidade",
  "motorista", "cobrador", "rude", "grosso", "mal educado", "não parou", "nao parou", "condução", "conducao", "freada", "perigoso",
  "ônibus", "onibus", "metrô", "metro", "trem", "linha", "estação", "estacao", "ponto", "terminal",
];

export function hasTransportKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return TRANSPORT_KEYWORDS.some((kw) => lower.includes(kw));
}

void DOMAIN_KEYWORDS;
