// Interface unificada de resultado de busca
export interface SearchResult {
  id: string;
  type: 'servico' | 'transporte' | 'relato_urbano' | 'recomendacao' | 'noticia' | 'vereador' | 'audiencia';
  title: string;
  description: string;
  icon: string;
  category: string;
  path: string;
  metadata?: Record<string, any>;
}

// Serviços Públicos (Perto de Mim)
export const servicosProximos: SearchResult[] = [
  {
    id: "ubs-1",
    type: "servico",
    title: "UBS Vila Mariana",
    description: "Rua Domingos de Morais, 2187 - Vila Mariana",
    icon: "🏥",
    category: "Saúde",
    path: "/servicos/ubs-1",
    metadata: {
      serviceType: "ubs",
      district: "Vila Mariana",
      rating: 4.2,
      distance: "500m"
    }
  },
  {
    id: "ubs-2",
    type: "servico",
    title: "UBS Jardim São Luís",
    description: "Rua Nossa Senhora do Bom Conselho, 59",
    icon: "🏥",
    category: "Saúde",
    path: "/servicos/ubs-2",
    metadata: {
      serviceType: "ubs",
      district: "Jardim São Luís",
      rating: 4.5,
      distance: "1.2km"
    }
  },
  {
    id: "escola-1",
    type: "servico",
    title: "EMEF Prof. João da Silva",
    description: "Rua Vergueiro, 3001 - Vila Mariana",
    icon: "🏫",
    category: "Educação",
    path: "/servicos/escola-1",
    metadata: {
      serviceType: "school",
      district: "Vila Mariana",
      rating: 4.0,
      distance: "800m"
    }
  },
  {
    id: "escola-2",
    type: "servico",
    title: "CEU Aricanduva",
    description: "Av. Aricanduva, 5555 - Jardim Aricanduva",
    icon: "🏫",
    category: "Educação",
    path: "/servicos/escola-2",
    metadata: {
      serviceType: "ceu",
      district: "Aricanduva",
      rating: 4.7,
      distance: "2km"
    }
  },
  {
    id: "escola-3",
    type: "servico",
    title: "EMEF Parque da Lapa",
    description: "Rua Guaicurus, 1000 - Lapa",
    icon: "🏫",
    category: "Educação",
    path: "/servicos/escola-3",
    metadata: {
      serviceType: "school",
      district: "Lapa",
      rating: 3.8,
      distance: "1.5km"
    }
  },
  {
    id: "hospital-1",
    type: "servico",
    title: "AMA Vila Mariana",
    description: "Rua Santa Cruz, 81 - Vila Mariana",
    icon: "🏥",
    category: "Saúde",
    path: "/servicos/hospital-1",
    metadata: {
      serviceType: "hospital",
      district: "Vila Mariana",
      rating: 4.3,
      distance: "600m"
    }
  },
  {
    id: "hospital-2",
    type: "servico",
    title: "Hospital Municipal Tide Setúbal",
    description: "Rua Dr. José Guilherme Eiras, 123 - São Miguel",
    icon: "🏥",
    category: "Saúde",
    path: "/servicos/hospital-2",
    metadata: {
      serviceType: "hospital",
      district: "São Miguel Paulista",
      rating: 4.1,
      distance: "3km"
    }
  },
  {
    id: "ubs-3",
    type: "servico",
    title: "UBS Parque Bristol",
    description: "Rua Armando Lopes de Castro, 40",
    icon: "🏥",
    category: "Saúde",
    path: "/servicos/ubs-3",
    metadata: {
      serviceType: "ubs",
      district: "Parque Bristol",
      rating: 3.9,
      distance: "2.5km"
    }
  },
  {
    id: "cras-1",
    type: "servico",
    title: "CRAS Jardim Helena",
    description: "Av. Marechal Tito, 3012 - São Miguel",
    icon: "🏢",
    category: "Assistência Social",
    path: "/servicos/cras-1",
    metadata: {
      serviceType: "other",
      district: "Jardim Helena",
      rating: 4.4,
      distance: "1.8km"
    }
  },
  {
    id: "ubs-4",
    type: "servico",
    title: "UBS Capão Redondo",
    description: "Rua Cassiano dos Santos, 474",
    icon: "🏥",
    category: "Saúde",
    path: "/servicos/ubs-4",
    metadata: {
      serviceType: "ubs",
      district: "Capão Redondo",
      rating: 4.6,
      distance: "4km"
    }
  }
];

// Linhas de Transporte
export const linhasTransporte: SearchResult[] = [
  {
    id: "linha-1",
    type: "transporte",
    title: "Linha 8500-10 Capelinha",
    description: "Terminal Sapopemba - Metrô Carrão",
    icon: "🚌",
    category: "Ônibus",
    path: "/transporte/linha-1",
    metadata: {
      lineType: "bus",
      lineCode: "8500-10",
      regions: ["Zona Leste"],
      status: "operando"
    }
  },
  {
    id: "linha-2",
    type: "transporte",
    title: "Linha 675T-10 Sacomã",
    description: "Terminal Sacomã - Metrô Ana Rosa",
    icon: "🚌",
    category: "Ônibus",
    path: "/transporte/linha-2",
    metadata: {
      lineType: "bus",
      lineCode: "675T-10",
      regions: ["Zona Sul"],
      status: "operando"
    }
  },
  {
    id: "metro-1",
    type: "transporte",
    title: "Linha 1 - Azul",
    description: "Jabaquara - Tucuruvi",
    icon: "🚇",
    category: "Metrô",
    path: "/transporte/metro-1",
    metadata: {
      lineType: "metro",
      lineCode: "Linha 1",
      regions: ["Zona Sul", "Centro", "Zona Norte"],
      status: "operando"
    }
  },
  {
    id: "metro-2",
    type: "transporte",
    title: "Linha 3 - Vermelha",
    description: "Palmeiras-Barra Funda - Corinthians-Itaquera",
    icon: "🚇",
    category: "Metrô",
    path: "/transporte/metro-2",
    metadata: {
      lineType: "metro",
      lineCode: "Linha 3",
      regions: ["Zona Oeste", "Centro", "Zona Leste"],
      status: "operando"
    }
  },
  {
    id: "linha-3",
    type: "transporte",
    title: "Linha 5300-10 Lapa",
    description: "Terminal Lapa - Metrô Vila Madalena",
    icon: "🚌",
    category: "Ônibus",
    path: "/transporte/linha-3",
    metadata: {
      lineType: "bus",
      lineCode: "5300-10",
      regions: ["Zona Oeste"],
      status: "operando"
    }
  },
  {
    id: "linha-4",
    type: "transporte",
    title: "Linha 7000-10 Circular",
    description: "Terminal Pinheiros - Centro - Sé",
    icon: "🚌",
    category: "Ônibus",
    path: "/transporte/linha-4",
    metadata: {
      lineType: "bus",
      lineCode: "7000-10",
      regions: ["Zona Oeste", "Centro"],
      status: "operando"
    }
  },
  {
    id: "linha-5",
    type: "transporte",
    title: "Linha 6400-10 Campo Limpo",
    description: "Terminal Campo Limpo - Metrô Capão Redondo",
    icon: "🚌",
    category: "Ônibus",
    path: "/transporte/linha-5",
    metadata: {
      lineType: "bus",
      lineCode: "6400-10",
      regions: ["Zona Sul"],
      status: "operando"
    }
  },
  {
    id: "corredor-1",
    type: "transporte",
    title: "Corredor ABD - Expresso Tiradentes",
    description: "Sacomã - Parque Dom Pedro II",
    icon: "🚍",
    category: "Corredor",
    path: "/transporte/corredor-1",
    metadata: {
      lineType: "corridor",
      lineCode: "ABD",
      regions: ["Zona Leste", "Centro"],
      status: "operando"
    }
  }
];

// Relatos Urbanos
export const relatosUrbanos: SearchResult[] = [
  {
    id: "relato-1",
    type: "relato_urbano",
    title: "Buraco na calçada - Av. Paulista",
    description: "Calçada danificada na Av. Paulista, altura do nº 1000",
    icon: "🕳️",
    category: "Via Pública",
    path: "/relato-urbano/historico",
    metadata: {
      status: "pending",
      severity: "medium",
      district: "Bela Vista",
      createdAt: "2025-11-25"
    }
  },
  {
    id: "relato-2",
    type: "relato_urbano",
    title: "Iluminação pública apagada",
    description: "Lâmpadas queimadas na Rua Augusta, próximo ao nº 500",
    icon: "💡",
    category: "Iluminação",
    path: "/relato-urbano/historico",
    metadata: {
      status: "pending",
      severity: "high",
      district: "Consolação",
      createdAt: "2025-11-24"
    }
  },
  {
    id: "relato-3",
    type: "relato_urbano",
    title: "Acúmulo de lixo",
    description: "Entulho e lixo acumulado na Rua da Mooca, 150",
    icon: "🗑️",
    category: "Limpeza",
    path: "/relato-urbano/historico",
    metadata: {
      status: "pending",
      severity: "medium",
      district: "Mooca",
      createdAt: "2025-11-23"
    }
  },
  {
    id: "relato-4",
    type: "relato_urbano",
    title: "Poda de árvore necessária",
    description: "Árvore com galhos sobre fiação na Rua Vergueiro",
    icon: "🌳",
    category: "Arborização",
    path: "/relato-urbano/historico",
    metadata: {
      status: "pending",
      severity: "high",
      district: "Vila Mariana",
      createdAt: "2025-11-22"
    }
  },
  {
    id: "relato-5",
    type: "relato_urbano",
    title: "Vazamento de água",
    description: "Vazamento na Rua dos Pinheiros, altura do nº 800",
    icon: "💧",
    category: "Saneamento",
    path: "/relato-urbano/historico",
    metadata: {
      status: "pending",
      severity: "high",
      district: "Pinheiros",
      createdAt: "2025-11-21"
    }
  },
  {
    id: "relato-6",
    type: "relato_urbano",
    title: "Pichação em muro público",
    description: "Muro da praça pichado na Praça da Sé",
    icon: "🎨",
    category: "Patrimônio",
    path: "/relato-urbano/historico",
    metadata: {
      status: "pending",
      severity: "low",
      district: "Sé",
      createdAt: "2025-11-20"
    }
  }
];

// Recomendações
export const recomendacoes: SearchResult[] = [
  {
    id: "rec-1",
    type: "recomendacao",
    title: "UBS Vila Mariana recomendada",
    description: "Baseado no seu endereço e histórico de visitas",
    icon: "⭐",
    category: "Serviço Recomendado",
    path: "/servicos/ubs-1",
    metadata: {
      confidence: 92,
      reason: "Mais próxima do seu endereço com ótima avaliação"
    }
  },
  {
    id: "rec-2",
    type: "recomendacao",
    title: "Audiência sobre Mobilidade Urbana",
    description: "Evento relacionado aos seus interesses em transporte",
    icon: "🎯",
    category: "Audiência Recomendada",
    path: "/audiencias",
    metadata: {
      confidence: 85,
      reason: "Você demonstrou interesse em temas de transporte"
    }
  },
  {
    id: "rec-3",
    type: "recomendacao",
    title: "Linha 8500-10 - Sua linha favorita",
    description: "Linha frequentemente consultada por você",
    icon: "🚌",
    category: "Transporte Favorito",
    path: "/transporte/linha-1",
    metadata: {
      confidence: 78,
      reason: "Linha mais consultada nos últimos 30 dias"
    }
  },
  {
    id: "rec-4",
    type: "recomendacao",
    title: "CEU Aricanduva - Atividades Culturais",
    description: "Centro com alta avaliação perto de você",
    icon: "🎭",
    category: "Serviço Recomendado",
    path: "/servicos/escola-2",
    metadata: {
      confidence: 88,
      reason: "Alta avaliação e oferece atividades do seu interesse"
    }
  },
  {
    id: "rec-5",
    type: "recomendacao",
    title: "Notificações sobre sua região",
    description: "Ative alertas para Vila Mariana",
    icon: "🔔",
    category: "Configuração Sugerida",
    path: "/notificacoes",
    metadata: {
      confidence: 70,
      reason: "Receba atualizações sobre serviços próximos"
    }
  }
];

// Função auxiliar para buscar em uma lista
export const searchInList = (list: SearchResult[], query: string): SearchResult[] => {
  if (!query || query.trim() === '') return [];
  
  const lowerQuery = query.toLowerCase().trim();
  
  return list.filter(item => {
    const titleMatch = item.title.toLowerCase().includes(lowerQuery);
    const descriptionMatch = item.description.toLowerCase().includes(lowerQuery);
    const categoryMatch = item.category.toLowerCase().includes(lowerQuery);
    
    return titleMatch || descriptionMatch || categoryMatch;
  });
};

// Função para buscar em todas as categorias
export const searchAll = (query: string): SearchResult[] => {
  if (!query || query.trim() === '') return [];
  
  return [
    ...searchInList(servicosProximos, query),
    ...searchInList(linhasTransporte, query),
    ...searchInList(relatosUrbanos, query),
    ...searchInList(recomendacoes, query)
  ];
};

// Categorias de filtro
export const filterCategories = [
  { id: 'all', label: 'Todos', icon: '🔍' },
  { id: 'servico', label: 'Perto de Mim', icon: '📍' },
  { id: 'transporte', label: 'Transporte', icon: '🚌' },
  { id: 'relato_urbano', label: 'Relatos', icon: '📝' },
  { id: 'recomendacao', label: 'Recomendações', icon: '⭐' },
  { id: 'noticia', label: 'Notícias', icon: '📰' },
  { id: 'vereador', label: 'Vereadores', icon: '👤' },
  { id: 'audiencia', label: 'Audiências', icon: '🎙️' },
];

// Mapa de labels para tipos
export const typeLabels: Record<string, string> = {
  servico: 'Serviços Públicos',
  transporte: 'Transporte',
  relato_urbano: 'Relatos Urbanos',
  recomendacao: 'Recomendações',
  noticia: 'Notícias',
  vereador: 'Vereadores',
  audiencia: 'Audiências'
};
