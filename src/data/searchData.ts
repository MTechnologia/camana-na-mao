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
    id: "ubs-centro",
    type: "servico",
    title: "UBS Sé",
    description: "Rua Dr. Falcão, 98 - Sé",
    icon: "🏥",
    category: "Saúde",
    path: "/servico/ubs-centro",
    metadata: {
      serviceType: "ubs",
      district: "Sé",
      rating: 4.1,
      totalRatings: 87,
      phone: "(11) 3106-0600",
      latitude: -23.5489,
      longitude: -46.6358
    }
  },
  {
    id: "ama-se",
    type: "servico",
    title: "AMA Sé",
    description: "Praça da Sé, 108 - Sé",
    icon: "🏥",
    category: "Saúde",
    path: "/servico/ama-se",
    metadata: {
      serviceType: "hospital",
      district: "Sé",
      rating: 4.0,
      totalRatings: 134,
      phone: "(11) 3106-0700",
      latitude: -23.5495,
      longitude: -46.6345
    }
  },
  {
    id: "escola-centro",
    type: "servico",
    title: "EMEF Centro",
    description: "Rua Boa Vista, 200 - Centro",
    icon: "🏫",
    category: "Educação",
    path: "/servico/escola-centro",
    metadata: {
      serviceType: "school",
      district: "Centro",
      rating: 3.9,
      totalRatings: 156,
      phone: "(11) 3113-7800",
      latitude: -23.5521,
      longitude: -46.6301
    }
  },
  {
    id: "ubs-1",
    type: "servico",
    title: "UBS Vila Mariana",
    description: "Rua Domingos de Morais, 2187 - Vila Mariana",
    icon: "🏥",
    category: "Saúde",
    path: "/servico/ubs-1",
    metadata: {
      serviceType: "ubs",
      district: "Vila Mariana",
      rating: 4.2,
      totalRatings: 156,
      phone: "(11) 5549-1234",
      latitude: -23.5876,
      longitude: -46.6385
    }
  },
  {
    id: "ubs-2",
    type: "servico",
    title: "UBS Jardim São Luís",
    description: "Rua Nossa Senhora do Bom Conselho, 59",
    icon: "🏥",
    category: "Saúde",
    path: "/servico/ubs-2",
    metadata: {
      serviceType: "ubs",
      district: "Jardim São Luís",
      rating: 4.5,
      totalRatings: 89,
      phone: "(11) 5831-7890",
      latitude: -23.6542,
      longitude: -46.7456
    }
  },
  {
    id: "escola-1",
    type: "servico",
    title: "EMEF Prof. João da Silva",
    description: "Rua Vergueiro, 3001 - Vila Mariana",
    icon: "🏫",
    category: "Educação",
    path: "/servico/escola-1",
    metadata: {
      serviceType: "school",
      district: "Vila Mariana",
      rating: 4.0,
      totalRatings: 203,
      phone: "(11) 5574-3456",
      latitude: -23.5812,
      longitude: -46.6421
    }
  },
  {
    id: "escola-2",
    type: "servico",
    title: "CEU Aricanduva",
    description: "Av. Aricanduva, 5555 - Jardim Aricanduva",
    icon: "🏫",
    category: "Educação",
    path: "/servico/escola-2",
    metadata: {
      serviceType: "ceu",
      district: "Aricanduva",
      rating: 4.7,
      totalRatings: 312,
      phone: "(11) 2723-4567",
      latitude: -23.5456,
      longitude: -46.5089
    }
  },
  {
    id: "escola-3",
    type: "servico",
    title: "EMEF Parque da Lapa",
    description: "Rua Guaicurus, 1000 - Lapa",
    icon: "🏫",
    category: "Educação",
    path: "/servico/escola-3",
    metadata: {
      serviceType: "school",
      district: "Lapa",
      rating: 3.8,
      totalRatings: 145,
      phone: "(11) 3832-5678",
      latitude: -23.5123,
      longitude: -46.7012
    }
  },
  {
    id: "hospital-1",
    type: "servico",
    title: "AMA Vila Mariana",
    description: "Rua Santa Cruz, 81 - Vila Mariana",
    icon: "🏥",
    category: "Saúde",
    path: "/servico/hospital-1",
    metadata: {
      serviceType: "hospital",
      district: "Vila Mariana",
      rating: 4.3,
      totalRatings: 178,
      phone: "(11) 5084-5678",
      latitude: -23.5891,
      longitude: -46.6352
    }
  },
  {
    id: "hospital-2",
    type: "servico",
    title: "Hospital Municipal Tide Setúbal",
    description: "Rua Dr. José Guilherme Eiras, 123 - São Miguel",
    icon: "🏥",
    category: "Saúde",
    path: "/servico/hospital-2",
    metadata: {
      serviceType: "hospital",
      district: "São Miguel Paulista",
      rating: 4.1,
      totalRatings: 267,
      phone: "(11) 2297-6789",
      latitude: -23.4923,
      longitude: -46.4512
    }
  },
  {
    id: "ubs-3",
    type: "servico",
    title: "UBS Parque Bristol",
    description: "Rua Armando Lopes de Castro, 40",
    icon: "🏥",
    category: "Saúde",
    path: "/servico/ubs-3",
    metadata: {
      serviceType: "ubs",
      district: "Parque Bristol",
      rating: 3.9,
      totalRatings: 98,
      phone: "(11) 5666-8901",
      latitude: -23.6012,
      longitude: -46.6789
    }
  },
  {
    id: "cras-1",
    type: "servico",
    title: "CRAS Jardim Helena",
    description: "Av. Marechal Tito, 3012 - São Miguel",
    icon: "🏢",
    category: "Assistência Social",
    path: "/servico/cras-1",
    metadata: {
      serviceType: "other",
      district: "Jardim Helena",
      rating: 4.4,
      totalRatings: 134,
      phone: "(11) 2557-8901",
      latitude: -23.4856,
      longitude: -46.4389
    }
  },
  {
    id: "ubs-4",
    type: "servico",
    title: "UBS Capão Redondo",
    description: "Rua Cassiano dos Santos, 474",
    icon: "🏥",
    category: "Saúde",
    path: "/servico/ubs-4",
    metadata: {
      serviceType: "ubs",
      district: "Capão Redondo",
      rating: 4.6,
      totalRatings: 221,
      phone: "(11) 5819-0123",
      latitude: -23.6698,
      longitude: -46.7812
    }
  },
  {
    id: "biblioteca-1",
    type: "servico",
    title: "Biblioteca Mário de Andrade",
    description: "Rua da Consolação, 94 - República",
    icon: "📚",
    category: "Cultura",
    path: "/servico/biblioteca-1",
    metadata: {
      serviceType: "library",
      district: "República",
      rating: 4.8,
      totalRatings: 412,
      phone: "(11) 3775-0002",
      latitude: -23.5464,
      longitude: -46.6450
    }
  },
  {
    id: "biblioteca-2",
    type: "servico",
    title: "Biblioteca Parque Villa-Lobos",
    description: "Av. Queiroz Filho, 1205 - Alto de Pinheiros",
    icon: "📚",
    category: "Cultura",
    path: "/servico/biblioteca-2",
    metadata: {
      serviceType: "library",
      district: "Alto de Pinheiros",
      rating: 4.7,
      totalRatings: 289,
      phone: "(11) 3024-2500",
      latitude: -23.5456,
      longitude: -46.7189
    }
  },
  {
    id: "esporte-1",
    type: "servico",
    title: "CDC Parque São Jorge",
    description: "Rua São Jorge, 425 - Tatuapé",
    icon: "⚽",
    category: "Esporte",
    path: "/servico/esporte-1",
    metadata: {
      serviceType: "sports_center",
      district: "Tatuapé",
      rating: 4.4,
      totalRatings: 178,
      phone: "(11) 2295-3344",
      latitude: -23.5389,
      longitude: -46.5678
    }
  },
  {
    id: "esporte-2",
    type: "servico",
    title: "CEE Ibirapuera",
    description: "Av. Pedro Álvares Cabral, s/n - Ibirapuera",
    icon: "⚽",
    category: "Esporte",
    path: "/servico/esporte-2",
    metadata: {
      serviceType: "sports_center",
      district: "Ibirapuera",
      rating: 4.5,
      totalRatings: 234,
      phone: "(11) 5574-8139",
      latitude: -23.5875,
      longitude: -46.6572
    }
  },
  {
    id: "ceu-2",
    type: "servico",
    title: "CEU Butantã",
    description: "Av. Engenheiro Heitor Antônio Eiras Garcia, 1870",
    icon: "🎭",
    category: "Educação",
    path: "/servico/ceu-2",
    metadata: {
      serviceType: "ceu",
      district: "Butantã",
      rating: 4.6,
      totalRatings: 198,
      phone: "(11) 3768-5601",
      latitude: -23.5734,
      longitude: -46.7289
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
