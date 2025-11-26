// Serviço centralizado para integrações externas
// Atualmente com dados mock, preparado para integração real futura

export interface ProjetoLei {
  id: string;
  numero: string;
  ano: number;
  titulo: string;
  ementa: string;
  autor: string;
  dataApresentacao: string;
  status: string;
  categoria: string;
}

export interface Votacao {
  id: string;
  projetoId: string;
  data: string;
  resultado: 'aprovado' | 'rejeitado' | 'em_votacao';
  votosFavor: number;
  votosContra: number;
  abstencoes: number;
}

export interface EventoLegislativo {
  id: string;
  tipo: 'sessao' | 'audiencia' | 'comissao';
  titulo: string;
  data: string;
  hora: string;
  local: string;
  pauta?: string;
}

export interface NoticiaOficial {
  id: string;
  titulo: string;
  conteudo: string;
  resumo: string;
  categoria: string;
  dataPublicacao: string;
  autor?: string;
  imagemUrl?: string;
}

// Mock: Portal CMSP - Projetos de Lei
export const fetchProjetosLei = async (): Promise<ProjetoLei[]> => {
  // TODO: Integrar com API real do Portal CMSP
  // Endpoint esperado: https://www.saopaulo.sp.leg.br/api/projetos
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return [
    {
      id: '1',
      numero: 'PL 123',
      ano: 2024,
      titulo: 'Projeto sobre Mobilidade Urbana',
      ementa: 'Dispõe sobre a criação de novas ciclovias na zona sul',
      autor: 'Vereador João Silva',
      dataApresentacao: '2024-01-15',
      status: 'em_tramitacao',
      categoria: 'Transporte'
    },
    {
      id: '2',
      numero: 'PL 456',
      ano: 2024,
      titulo: 'Melhoria dos Serviços de Saúde',
      ementa: 'Amplia horário de atendimento das UBS',
      autor: 'Vereadora Maria Santos',
      dataApresentacao: '2024-02-10',
      status: 'em_votacao',
      categoria: 'Saúde'
    },
  ];
};

// Mock: SPLegis - Votações
export const fetchVotacoes = async (projetoId?: string): Promise<Votacao[]> => {
  // TODO: Integrar com API SPLegis
  // Endpoint esperado: https://splegis.api.gov.br/votacoes
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return [
    {
      id: '1',
      projetoId: '1',
      data: '2024-03-15',
      resultado: 'aprovado',
      votosFavor: 38,
      votosContra: 15,
      abstencoes: 2
    },
  ];
};

// Mock: Calendário Legislativo
export const fetchEventosLegislativos = async (): Promise<EventoLegislativo[]> => {
  // TODO: Integrar com Portal CMSP
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return [
    {
      id: '1',
      tipo: 'sessao',
      titulo: 'Sessão Plenária Ordinária',
      data: '2024-12-10',
      hora: '14:00',
      local: 'Plenário Juscelino Kubitschek',
      pauta: 'Votação de projetos de lei'
    },
    {
      id: '2',
      tipo: 'audiencia',
      titulo: 'Audiência Pública sobre Mobilidade',
      data: '2024-12-15',
      hora: '10:00',
      local: 'Auditório Prestes Maia'
    },
  ];
};

// Mock: Notícias Oficiais
export const fetchNoticiasOficiais = async (): Promise<NoticiaOficial[]> => {
  // TODO: Integrar com feed RSS ou API do Portal
  // Endpoint esperado: https://www.saopaulo.sp.leg.br/api/noticias
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return [
    {
      id: '1',
      titulo: 'Câmara aprova novo projeto de mobilidade',
      conteudo: 'A Câmara Municipal de São Paulo aprovou hoje...',
      resumo: 'Projeto visa melhorar o transporte público na cidade',
      categoria: 'Legislativo',
      dataPublicacao: '2024-12-01T10:00:00Z',
      autor: 'Assessoria de Comunicação',
      imagemUrl: '/placeholder.svg'
    },
    {
      id: '2',
      titulo: 'Audiência pública discute saúde',
      conteudo: 'Vereadores e cidadãos se reuniram para debater...',
      resumo: 'Participação cidadã marca debate sobre UBS',
      categoria: 'Participação',
      dataPublicacao: '2024-11-28T14:30:00Z'
    },
  ];
};

// Mock: SPTrans - Linhas de ônibus
export const fetchLinhasSPTrans = async (termo?: string) => {
  // TODO: Integrar com API Olho Vivo SPTrans
  // Endpoint: http://api.olhovivo.sptrans.com.br/v2.1/Linha/Buscar
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const linhas = [
    { codigo: '8000', nome: 'Terminal Pinheiros - Metrô Vila Madalena', tipo: 'URBANO' },
    { codigo: '8001', nome: 'Terminal Lapa - Shopping West Plaza', tipo: 'URBANO' },
    { codigo: '8500', nome: 'Expresso Tiradentes', tipo: 'CORREDOR' },
  ];

  if (termo) {
    return linhas.filter(l => 
      l.codigo.includes(termo) || 
      l.nome.toLowerCase().includes(termo.toLowerCase())
    );
  }

  return linhas;
};

// Mock: Posições de ônibus em tempo real
export const fetchPosicoesOnibus = async (linhaId: string) => {
  // TODO: Integrar com API Olho Vivo
  // Endpoint: http://api.olhovivo.sptrans.com.br/v2.1/Posicao/Linha
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    linhaId,
    veiculos: [
      { lat: -23.5505, lng: -46.6333, velocidade: 25 },
      { lat: -23.5515, lng: -46.6343, velocidade: 30 },
    ]
  };
};
