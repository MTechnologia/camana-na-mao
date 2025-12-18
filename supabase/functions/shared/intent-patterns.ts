// Módulo compartilhado de padrões de detecção de intenção cross-journey
// Centralizado para manutenção consistente em todas as Edge Functions

export type JourneyType = 'general' | 'urban_report' | 'transport' | 'evaluate' | 'services';

// Frases completas para detecção de alta confiança (0.95)
export const PHRASE_PATTERNS: Record<string, string[]> = {
  general: [
    'como funciona a câmara', 'como funciona a camara',
    'próxima audiência', 'proxima audiencia',
    'projeto de lei', 'projetos de lei',
    'quais comissões', 'quais comissoes',
    'agenda da câmara', 'agenda da camara',
    'notícias da câmara', 'noticias da camara',
    'sessão plenária', 'sessao plenaria',
    'quero saber sobre a câmara', 'quero saber sobre a camara',
    'informações sobre vereadores', 'informacoes sobre vereadores',
  ],
  urban_report: [
    'buraco na rua', 'buraco na calçada', 'buraco na calcada',
    'poste sem luz', 'poste apagado', 'luz queimada',
    'lixo na calçada', 'lixo na calcada', 'lixo na rua',
    'esgoto aberto', 'esgoto vazando',
    'mato alto', 'mato crescendo',
    'calçada quebrada', 'calcada quebrada',
    'semáforo quebrado', 'semaforo quebrado',
    'elogiar vereador', 'elogiar um vereador',
    'reclamar da câmara', 'reclamar da camara',
    'sugestão para câmara', 'sugestao para camara',
    'feedback sobre vereador', 'crítica ao vereador', 'critica ao vereador',
    'reclamação da câmara', 'reclamacao da camara',
    'elogio ao vereador', 'sugestão para vereador', 'sugestao para vereador',
    'problema na rua', 'problema na calçada', 'problema na calcada',
    'denúncia urbana', 'denuncia urbana',
  ],
  transport: [
    'problema com ônibus', 'problema com onibus',
    'problema de transporte', 'problema no transporte',
    'problema com transporte', 'problemas de transporte',
    'reclamação de transporte', 'reclamacao de transporte',
    'reclamação sobre transporte', 'reclamacao sobre transporte',
    'atraso de metrô', 'atraso de metro', 'atraso do metrô', 'atraso do metro',
    'atraso de ônibus', 'atraso de onibus', 'atraso do ônibus', 'atraso do onibus',
    'linha de trem', 'linha do trem',
    'ônibus lotado', 'onibus lotado',
    'metrô cheio', 'metro cheio',
    'metrô lotado', 'metro lotado',
    'trem lotado', 'trem cheio',
    'ônibus atrasado', 'onibus atrasado',
    'metrô atrasado', 'metro atrasado',
    'transporte público', 'transporte publico',
    'reclamar do ônibus', 'reclamar do onibus',
    'reclamar do metrô', 'reclamar do metro',
    'denunciar transporte',
  ],
  evaluate: [
    'avaliar a ubs', 'avaliar ubs', 'avaliar uma ubs',
    'avaliar a escola', 'avaliar escola', 'avaliar uma escola',
    'avaliar o hospital', 'avaliar hospital', 'avaliar um hospital',
    'avaliar o ceu', 'avaliar ceu', 'avaliar um ceu',
    'avaliar a biblioteca', 'avaliar biblioteca',
    'dar nota para', 'dar nota pra',
    'avaliar atendimento', 'avaliar o atendimento',
    'nota para o serviço', 'nota para o servico',
    'nota pro serviço', 'nota pro servico',
    'avaliar serviço', 'avaliar servico',
    'avaliar serviço público', 'avaliar servico publico',
    'quero avaliar', 'gostaria de avaliar',
  ],
  services: [
    'serviços perto', 'servicos perto',
    'ubs mais próxima', 'ubs mais proxima',
    'escola mais próxima', 'escola mais proxima',
    'hospital mais próximo', 'hospital mais proximo',
    'onde fica a ubs', 'onde fica a escola',
    'serviços próximos', 'servicos proximos',
    'perto de mim', 'próximo de mim', 'proximo de mim',
  ],
};

// Palavras-chave individuais para detecção de média confiança (0.85 com 2+ matches)
export const INTENT_PATTERNS: Record<string, string[]> = {
  general: [
    'notícia', 'noticia', 'notícias', 'noticias',
    'audiência', 'audiencia', 'audiências', 'audiencias',
    'comissão', 'comissao', 'comissões', 'comissoes',
    'legislativo', 'legislação', 'legislacao',
    'projeto de lei', 'pauta do dia',
    'sessão', 'sessao', 'plenária', 'plenaria',
    'votação', 'votacao',
    'câmara municipal', 'camara municipal',
  ],
  urban_report: [
    'buraco', 'buracos',
    'iluminação', 'iluminacao',
    'poste', 'postes',
    'lixo', 'entulho',
    'calçada', 'calcada', 'calçadas', 'calcadas',
    'esgoto',
    'semáforo', 'semaforo', 'semáforos', 'semaforos',
    'asfalto',
    'mato',
    'árvore', 'arvore', 'árvores', 'arvores',
    'vereador', 'vereadores',
    'câmara', 'camara',
    'reclamação', 'reclamacao',
    'elogio', 'elogios',
    'sugestão', 'sugestao',
    'denúncia', 'denuncia',
  ],
  transport: [
    'transporte',
    'ônibus', 'onibus',
    'metrô', 'metro',
    'trem', 'trens',
    'cptm',
    'sptrans',
    'lotação', 'lotacao', 'lotado', 'lotada',
    'terminal', 'terminais',
    'estação', 'estacao', 'estações', 'estacoes',
    'bilhete', 'bilhete único', 'bilhete unico',
    'atraso', 'atrasado', 'atrasada',
    'linha',
  ],
  evaluate: [
    'avaliar', 'avaliação', 'avaliacao',
    'nota', 'notas',
    'estrelas', 'estrela',
    'ubs',
    'hospital', 'hospitais',
    'escola', 'escolas',
    'ceu', 'ceus',
    'posto de saúde', 'posto de saude',
    'atendimento',
    'serviço público', 'servico publico',
  ],
  services: [
    'perto', 'próximo', 'proximo', 'próxima', 'proxima',
    'localização', 'localizacao',
    'endereço', 'endereco',
    'distância', 'distancia',
    'como chegar',
    'mapa',
    'rota',
  ],
};

/**
 * Detecta intenção de cross-journey a partir de uma mensagem
 * @param message Mensagem do usuário
 * @param currentJourney Jornada atual (será excluída da detecção)
 * @returns Objeto com jornada detectada e nível de confiança
 */
export function detectCrossIntent(
  message: string, 
  currentJourney: string
): { journey: string | null; confidence: number } {
  const lowerMessage = message.toLowerCase();
  
  // Primeiro: detecção por frase (alta confiança)
  for (const [journey, phrases] of Object.entries(PHRASE_PATTERNS)) {
    if (journey === currentJourney) continue;
    
    const phraseMatch = phrases.some(phrase => lowerMessage.includes(phrase));
    if (phraseMatch) {
      return { journey, confidence: 0.95 };
    }
  }
  
  // Fallback: detecção por palavras-chave (precisa de 2+ matches)
  for (const [journey, keywords] of Object.entries(INTENT_PATTERNS)) {
    if (journey === currentJourney) continue;
    
    const matches = keywords.filter(keyword => lowerMessage.includes(keyword));
    if (matches.length >= 2) {
      return { journey, confidence: 0.85 };
    }
  }
  
  return { journey: null, confidence: 0 };
}

/**
 * Detecta intenção para o chat geral (usado pelo ai-chat)
 * @param message Mensagem do usuário
 * @returns Objeto com jornada detectada e nível de confiança
 */
export function detectIntent(message: string): { journey: string | null; confidence: number } {
  const lowerMessage = message.toLowerCase();
  
  // Primeiro: detecção por frase (alta confiança)
  for (const [journey, phrases] of Object.entries(PHRASE_PATTERNS)) {
    const phraseMatch = phrases.some(phrase => lowerMessage.includes(phrase));
    if (phraseMatch) {
      return { journey, confidence: 0.95 };
    }
  }
  
  // Fallback: detecção por palavras-chave
  for (const [journey, keywords] of Object.entries(INTENT_PATTERNS)) {
    const matches = keywords.filter(keyword => lowerMessage.includes(keyword));
    if (matches.length >= 2) {
      return { journey, confidence: 0.85 };
    } else if (matches.length === 1) {
      return { journey, confidence: 0.6 };
    }
  }
  
  return { journey: null, confidence: 0 };
}

/**
 * Mapeia journey para nome amigável em português
 */
export const JOURNEY_NAMES: Record<string, string> = {
  general: 'Tudo Sobre a Câmara',
  urban_report: 'Fala Cidadão!',
  transport: 'Diagnóstico de Transporte',
  evaluate: 'Avaliação de Serviço',
  services: 'Serviços Próximos',
};
