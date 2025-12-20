import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Commission to themes mapping for council member suggestions
const COMMISSION_THEMES: Record<string, string[]> = {
  'transporte': ['atraso', 'lotacao', 'superlotacao', 'onibus', 'metro', 'trem', 'mobilidade', 'transito'],
  'urbanismo': ['buraco', 'calcada', 'iluminacao', 'praca', 'lixo', 'entulho', 'poda', 'arvore', 'infraestrutura'],
  'saude': ['ubs', 'hospital', 'posto', 'saude', 'medico', 'atendimento'],
  'educacao': ['escola', 'creche', 'ceu', 'educacao', 'ensino'],
  'meio_ambiente': ['poluicao', 'rio', 'corrego', 'desmatamento', 'verde', 'parque', 'ambiental'],
  'seguranca': ['seguranca', 'policia', 'violencia', 'assalto', 'roubo'],
  'habitacao': ['moradia', 'habitacao', 'ocupacao', 'favela', 'desabrigado'],
  'assistencia_social': ['social', 'vulnerabilidade', 'morador_rua', 'fome', 'abrigo'],
};

// Unified tools for all citizen actions
const tools = [
  {
    type: "function",
    function: {
      name: "create_urban_report",
      description: "Registra problema urbano ou feedback sobre a Câmara. Usar quando cidadão descrever: buracos, iluminação, lixo, calçadas, esgoto, ou feedback sobre vereadores/serviços da Câmara.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "lixo", "area_verde", "outro"],
            description: "Inferir: iluminacao (poste, luz), calcada (buraco, passeio), via_publica (asfalto, semáforo), lixo (entulho), area_verde (praça, árvore), outro (feedback câmara)"
          },
          subcategory: { type: "string", description: "Tipo específico do problema" },
          description: { type: "string", description: "Resumo completo do problema" },
          location_address: { type: "string", description: "Localização (rua, bairro, referência)" }
        },
        required: ["category", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_transport_report",
      description: "Registra problema no transporte público. Usar quando cidadão falar de: ônibus, metrô, CPTM, atrasos, lotação, segurança em transporte.",
      parameters: {
        type: "object",
        properties: {
          report_type: {
            type: "string",
            enum: ["atraso", "lotacao", "seguranca", "acessibilidade", "limpeza", "outro"],
            description: "Tipo do problema"
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "critical=risco à vida, high=atraso>1h, medium=15-60min, low=inconveniência"
          },
          description: { type: "string", description: "Descrição do problema" },
          occurrence_date: { type: "string", description: "Data YYYY-MM-DD (inferir 'hoje' se contexto indicar)" },
          occurrence_time: { type: "string", description: "Horário HH:MM" },
          line_code: { type: "string", description: "Linha de ônibus/metrô" },
          location: { type: "string", description: "Ponto, estação ou trecho" },
          impact_description: { type: "string", description: "Como afetou a rotina" }
        },
        required: ["report_type", "description", "occurrence_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_service_rating",
      description: "Registra avaliação de serviço público. Usar quando cidadão quiser avaliar: UBS, escola, hospital, CEU, biblioteca, centro esportivo.",
      parameters: {
        type: "object",
        properties: {
          service_name: { type: "string", description: "Nome do serviço avaliado" },
          service_type: {
            type: "string",
            enum: ["ubs", "school", "ceu", "hospital", "library", "sports_center", "other"],
            description: "Tipo do serviço"
          },
          rating_stars: { type: "integer", minimum: 1, maximum: 5, description: "Nota 1-5 estrelas" },
          rating_text: { type: "string", description: "Comentário da avaliação" },
          sentiment: {
            type: "string",
            enum: ["positive", "neutral", "negative"],
            description: "Sentimento geral"
          }
        },
        required: ["service_name", "service_type", "rating_stars", "rating_text", "sentiment"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: "Busca informações sobre a Câmara Municipal: vereadores, audiências, projetos de lei, notícias, funcionamento legislativo.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de busca" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_nearby_services",
      description: "Busca serviços públicos próximos ao cidadão. Usar quando perguntar sobre: UBS perto, escola próxima, hospital mais próximo, CEU na região, biblioteca perto de mim.",
      parameters: {
        type: "object",
        properties: {
          service_type: {
            type: "string",
            enum: ["ubs", "school", "ceu", "hospital", "library", "sports_center", "other"],
            description: "Tipo do serviço buscado"
          },
          district: { type: "string", description: "Bairro ou região (ex: Pinheiros, Centro, Zona Sul)" },
          limit: { type: "integer", description: "Quantidade máxima de resultados (padrão: 5)", minimum: 1, maximum: 10 }
        },
        required: ["service_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_audiencias",
      description: "Busca audiências públicas da Câmara. Usar quando cidadão perguntar sobre: audiências, consultas públicas, participação popular, eventos legislativos, próximas audiências.",
      parameters: {
        type: "object",
        properties: {
          tema: { type: "string", description: "Tema de interesse (ex: transporte, saúde, educação)" },
          status: {
            type: "string",
            enum: ["scheduled", "ongoing", "finished"],
            description: "Status da audiência: scheduled (agendada), ongoing (em andamento), finished (encerrada)"
          },
          inscricoes_abertas: { type: "boolean", description: "Filtrar apenas audiências com inscrições abertas" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_council_member",
      description: "Sugere vereadores para encaminhar uma demanda cidadã. Usar quando cidadão quiser: encaminhar reclamação a vereador, saber qual vereador procurar, indicar vereador especialista no tema.",
      parameters: {
        type: "object",
        properties: {
          issue_type: {
            type: "string",
            enum: ["transporte", "urbanismo", "saude", "educacao", "meio_ambiente", "seguranca", "habitacao", "assistencia_social"],
            description: "Tipo do problema/demanda"
          },
          description: { type: "string", description: "Descrição do problema para matching mais preciso" },
          district: { type: "string", description: "Bairro ou região do cidadão" }
        },
        required: ["issue_type", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_citizen_history",
      description: "Consulta histórico completo do cidadão: relatos urbanos, relatos de transporte, avaliações de serviços, inscrições em audiências e encaminhamentos a vereadores. Usar quando cidadão perguntar: 'meus relatos', 'status das minhas denúncias', 'minhas avaliações', 'minhas participações', 'o que eu já fiz no app', 'meu histórico'.",
      parameters: {
        type: "object",
        properties: {
          history_type: {
            type: "string",
            enum: ["all", "urban_reports", "transport_reports", "ratings", "audiencias", "referrals"],
            description: "Tipo de histórico: all (tudo), urban_reports (relatos urbanos), transport_reports (transporte), ratings (avaliações), audiencias (inscrições), referrals (encaminhamentos)"
          },
          status_filter: {
            type: "string",
            enum: ["all", "pending", "in_progress", "resolved", "closed"],
            description: "Filtrar por status: all (todos), pending (pendente), in_progress (em andamento), resolved (resolvido), closed (fechado)"
          },
          limit: {
            type: "integer",
            description: "Quantidade máxima de resultados por tipo (padrão: 5)",
            minimum: 1,
            maximum: 20
          }
        },
        required: []
      }
    }
  }
];

// Lean system prompt with new capabilities
const systemPrompt = `Você é o Assistente CMSP, da Câmara Municipal de São Paulo. Ajuda cidadãos de forma empática e direta.

CAPACIDADES (use as tools quando apropriado):

📋 REGISTROS:
• Problemas urbanos (buracos, iluminação, lixo) → create_urban_report
• Problemas de transporte (ônibus, metrô) → create_transport_report  
• Avaliar serviços (UBS, escola, hospital) → create_service_rating

🔍 BUSCAS:
• Informações sobre a Câmara → search_knowledge_base
• Serviços públicos próximos → find_nearby_services
• Audiências públicas → search_audiencias
• Histórico do cidadão (relatos, avaliações, participações) → get_citizen_history
• Sugerir vereador para demanda → suggest_council_member

COLETA DE DADOS:
- Converse naturalmente, extraia informações do contexto
- Pergunte apenas o essencial (1-2 perguntas por vez)
- Infira: categoria, data ("hoje" se não especificado), severidade
- Chame a tool quando tiver dados suficientes

TOM:
- Empático, breve, linguagem simples
- Demonstre que entendeu antes de perguntar
- Confirme resumidamente antes de registrar

LIMITES:
- Não invente funcionalidades
- Se não souber, diga e sugira onde buscar
- Data de hoje: ${new Date().toISOString().split('T')[0]}`;

// Helper: Search knowledge base
async function searchKnowledgeBase(supabase: any, query: string): Promise<string> {
  const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2).slice(0, 5);
  if (searchTerms.length === 0) return '';

  const { data, error } = await supabase
    .from('knowledge_base')
    .select('content, content_type, title')
    .or(searchTerms.map(term => `content.ilike.%${term}%`).join(','))
    .limit(5);

  if (error || !data?.length) return '';

  return data.map((doc: any, i: number) => {
    const source = doc.content_type === 'noticia' ? 'Notícia' : 
                   doc.content_type === 'audiencia' ? 'Audiência' : 'Info';
    return `[${i+1}] ${doc.title || source}: ${doc.content.slice(0, 300)}...`;
  }).join('\n\n');
}

// Helper: Find nearby services
async function findNearbyServices(supabase: any, serviceType: string, district?: string, limit: number = 5): Promise<string> {
  let query = supabase
    .from('public_services')
    .select('name, address, district, phone, average_rating, service_type')
    .eq('service_type', serviceType)
    .limit(limit);

  if (district) {
    query = query.ilike('district', `%${district}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[find_nearby_services] Error:', error);
    return '';
  }

  if (!data?.length) {
    return `Nenhum serviço do tipo "${serviceType}" encontrado${district ? ` no bairro ${district}` : ''}.`;
  }

  const serviceTypeLabels: Record<string, string> = {
    'ubs': 'UBS',
    'school': 'Escola',
    'ceu': 'CEU',
    'hospital': 'Hospital',
    'library': 'Biblioteca',
    'sports_center': 'Centro Esportivo',
    'other': 'Serviço'
  };

  return data.map((s: any, i: number) => {
    const rating = s.average_rating ? `⭐ ${s.average_rating.toFixed(1)}` : 'Sem avaliações';
    const phone = s.phone ? `📞 ${s.phone}` : '';
    return `[${i+1}] ${serviceTypeLabels[s.service_type] || 'Serviço'}: ${s.name}\n   📍 ${s.address}, ${s.district}\n   ${rating} ${phone}`;
  }).join('\n\n');
}

// Helper: Search audiencias
async function searchAudiencias(supabase: any, tema?: string, status?: string, inscricoesAbertas?: boolean): Promise<string> {
  let query = supabase
    .from('audiencias')
    .select('titulo, tema, data, hora, local, status, inscricoes_abertas, vagas_disponiveis')
    .order('data', { ascending: true })
    .limit(5);

  if (tema) {
    query = query.ilike('tema', `%${tema}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (inscricoesAbertas !== undefined) {
    query = query.eq('inscricoes_abertas', inscricoesAbertas);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[search_audiencias] Error:', error);
    return '';
  }

  if (!data?.length) {
    return `Nenhuma audiência encontrada${tema ? ` sobre "${tema}"` : ''}.`;
  }

  const statusLabels: Record<string, string> = {
    'scheduled': '📅 Agendada',
    'ongoing': '🔴 Em andamento',
    'finished': '✅ Encerrada'
  };

  return data.map((a: any, i: number) => {
    const dataFormatted = new Date(a.data).toLocaleDateString('pt-BR');
    const inscricao = a.inscricoes_abertas ? `✅ Inscrições abertas (${a.vagas_disponiveis || 'vagas disponíveis'})` : '❌ Inscrições encerradas';
    return `[${i+1}] ${a.titulo}\n   🏷️ Tema: ${a.tema}\n   📍 ${a.local}\n   📆 ${dataFormatted} às ${a.hora}\n   ${statusLabels[a.status] || a.status}\n   ${inscricao}`;
  }).join('\n\n');
}

// Helper: Suggest council member
async function suggestCouncilMember(supabase: any, issueType: string, description: string, district?: string): Promise<string> {
  // Get council members that match the issue type
  const relevantThemes = COMMISSION_THEMES[issueType] || [];
  
  // This is a simplified matching - in production you'd query a council_members table
  const suggestions = [
    { name: 'Milton Leite', party: 'União Brasil', commissions: ['transporte', 'urbanismo'], matchScore: 0 },
    { name: 'Soninha Francine', party: 'Cidadania', commissions: ['meio_ambiente', 'urbanismo'], matchScore: 0 },
    { name: 'Rodrigo Goulart', party: 'PSD', commissions: ['saude', 'educacao'], matchScore: 0 },
    { name: 'Celso Giannazi', party: 'PSOL', commissions: ['educacao', 'assistencia_social'], matchScore: 0 },
    { name: 'Erika Hilton', party: 'PSOL', commissions: ['assistencia_social', 'habitacao'], matchScore: 0 },
    { name: 'Amanda Paschoal', party: 'PSOL', commissions: ['meio_ambiente', 'transporte'], matchScore: 0 },
    { name: 'Luna Zarattini', party: 'PT', commissions: ['saude', 'assistencia_social'], matchScore: 0 },
    { name: 'Janaína Lima', party: 'PP', commissions: ['urbanismo', 'seguranca'], matchScore: 0 },
    { name: 'Rinaldi Digilio', party: 'Republicanos', commissions: ['seguranca', 'urbanismo'], matchScore: 0 },
  ];

  // Calculate match scores
  const descLower = description.toLowerCase();
  suggestions.forEach(s => {
    // Commission match
    if (s.commissions.includes(issueType)) {
      s.matchScore += 40;
    }
    
    // Theme keyword match
    relevantThemes.forEach(theme => {
      if (descLower.includes(theme)) {
        s.matchScore += 10;
      }
    });
  });

  // Sort by score and get top 3
  const topSuggestions = suggestions
    .filter(s => s.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  if (topSuggestions.length === 0) {
    return `Não encontrei vereadores especializados nesse tema. Você pode procurar qualquer vereador da Câmara Municipal.`;
  }

  const issueTypeLabels: Record<string, string> = {
    'transporte': 'Transporte',
    'urbanismo': 'Urbanismo',
    'saude': 'Saúde',
    'educacao': 'Educação',
    'meio_ambiente': 'Meio Ambiente',
    'seguranca': 'Segurança',
    'habitacao': 'Habitação',
    'assistencia_social': 'Assistência Social'
  };

  return `Vereadores recomendados para questões de ${issueTypeLabels[issueType] || issueType}:\n\n` +
    topSuggestions.map((s, i) => {
      const commissionNames = s.commissions.map(c => issueTypeLabels[c] || c).join(', ');
      return `[${i+1}] ${s.name} (${s.party})\n   📋 Comissões: ${commissionNames}\n   ⭐ Relevância: ${Math.min(s.matchScore, 100)}%`;
    }).join('\n\n');
}

// Helper: Get citizen history
async function getCitizenHistory(
  supabase: any, 
  userId: string, 
  historyType: string = 'all', 
  statusFilter: string = 'all',
  limit: number = 5
): Promise<string> {
  console.log(`[get_citizen_history] Fetching history for user: ${userId}, type: ${historyType}, status: ${statusFilter}`);
  
  const results: string[] = [];
  const summary = {
    urban_reports: 0,
    transport_reports: 0,
    ratings: 0,
    audiencias: 0,
    referrals: 0,
    pending: 0,
    resolved: 0
  };

  const statusLabels: Record<string, string> = {
    'pending': '🟡 Pendente',
    'in_progress': '🔵 Em andamento',
    'resolved': '✅ Resolvido',
    'closed': '⚫ Fechado',
    'sent': '📤 Enviado',
    'acknowledged': '👀 Visualizado',
    'confirmed': '✅ Confirmado',
    'cancelled': '❌ Cancelado'
  };

  const categoryLabels: Record<string, string> = {
    'iluminacao': 'Iluminação',
    'calcada': 'Calçada',
    'via_publica': 'Via Pública',
    'lixo': 'Lixo/Entulho',
    'area_verde': 'Área Verde',
    'outro': 'Outro',
    'atraso': 'Atraso',
    'lotacao': 'Lotação',
    'seguranca': 'Segurança',
    'acessibilidade': 'Acessibilidade',
    'limpeza': 'Limpeza'
  };

  // 1. Urban Reports
  if (historyType === 'all' || historyType === 'urban_reports') {
    let query = supabase
      .from('urban_reports')
      .select('id, category, description, status, severity, location_address, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: urbanReports, error } = await query;
    
    if (!error && urbanReports?.length > 0) {
      summary.urban_reports = urbanReports.length;
      urbanReports.forEach((r: any) => {
        if (r.status === 'pending' || r.status === 'in_progress') summary.pending++;
        if (r.status === 'resolved' || r.status === 'closed') summary.resolved++;
      });

      const formatted = urbanReports.map((r: any, i: number) => {
        const date = new Date(r.created_at).toLocaleDateString('pt-BR');
        const category = categoryLabels[r.category] || r.category;
        const status = statusLabels[r.status] || r.status;
        const location = r.location_address ? `📍 ${r.location_address}` : '';
        return `[${i+1}] ${category}: ${r.description?.slice(0, 60)}...\n   ${status} | 📅 ${date}\n   ${location}`;
      }).join('\n\n');

      results.push(`📋 **RELATOS URBANOS** (${urbanReports.length})\n\n${formatted}`);
    }
  }

  // 2. Transport Reports
  if (historyType === 'all' || historyType === 'transport_reports') {
    let query = supabase
      .from('transport_reports')
      .select('id, report_type, description, status, severity, occurrence_date, line_code_custom, location, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: transportReports, error } = await query;
    
    if (!error && transportReports?.length > 0) {
      summary.transport_reports = transportReports.length;
      transportReports.forEach((r: any) => {
        if (r.status === 'pending' || r.status === 'in_progress') summary.pending++;
        if (r.status === 'resolved' || r.status === 'closed') summary.resolved++;
      });

      const formatted = transportReports.map((r: any, i: number) => {
        const date = new Date(r.occurrence_date).toLocaleDateString('pt-BR');
        const type = categoryLabels[r.report_type] || r.report_type;
        const status = statusLabels[r.status] || r.status;
        const line = r.line_code_custom ? `🚌 Linha ${r.line_code_custom}` : '';
        return `[${i+1}] ${type}: ${r.description?.slice(0, 60)}...\n   ${status} | 📅 ${date}\n   ${line}`;
      }).join('\n\n');

      results.push(`🚌 **RELATOS DE TRANSPORTE** (${transportReports.length})\n\n${formatted}`);
    }
  }

  // 3. Service Ratings
  if (historyType === 'all' || historyType === 'ratings') {
    const { data: ratings, error } = await supabase
      .from('service_ratings')
      .select(`
        id, rating_stars, rating_text, sentiment, created_at,
        public_services(name, service_type)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (!error && ratings?.length > 0) {
      summary.ratings = ratings.length;

      const serviceTypeLabels: Record<string, string> = {
        'ubs': 'UBS',
        'school': 'Escola',
        'ceu': 'CEU',
        'hospital': 'Hospital',
        'library': 'Biblioteca',
        'sports_center': 'Centro Esportivo'
      };

      const formatted = ratings.map((r: any, i: number) => {
        const date = new Date(r.created_at).toLocaleDateString('pt-BR');
        const stars = '⭐'.repeat(r.rating_stars);
        const serviceName = r.public_services?.name || 'Serviço';
        const serviceType = serviceTypeLabels[r.public_services?.service_type] || '';
        return `[${i+1}] ${serviceType}: ${serviceName}\n   ${stars} (${r.rating_stars}/5)\n   📝 "${r.rating_text?.slice(0, 50)}..."\n   📅 ${date}`;
      }).join('\n\n');

      results.push(`⭐ **AVALIAÇÕES DE SERVIÇOS** (${ratings.length})\n\n${formatted}`);
    }
  }

  // 4. Audiencia Inscricoes
  if (historyType === 'all' || historyType === 'audiencias') {
    const { data: inscricoes, error } = await supabase
      .from('audiencia_inscricoes')
      .select(`
        id, status, created_at,
        audiencias(titulo, tema, data, hora, local, status)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (!error && inscricoes?.length > 0) {
      summary.audiencias = inscricoes.length;

      const formatted = inscricoes.map((r: any, i: number) => {
        const inscDate = new Date(r.created_at).toLocaleDateString('pt-BR');
        const audData = r.audiencias?.data ? new Date(r.audiencias.data).toLocaleDateString('pt-BR') : '';
        const status = statusLabels[r.status] || r.status;
        return `[${i+1}] ${r.audiencias?.titulo || 'Audiência'}\n   🏷️ ${r.audiencias?.tema || ''}\n   📍 ${r.audiencias?.local || ''}\n   📆 ${audData} às ${r.audiencias?.hora || ''}\n   ${status} | Inscrito em: ${inscDate}`;
      }).join('\n\n');

      results.push(`🎤 **INSCRIÇÕES EM AUDIÊNCIAS** (${inscricoes.length})\n\n${formatted}`);
    }
  }

  // 5. Council Member Referrals
  if (historyType === 'all' || historyType === 'referrals') {
    const { data: referrals, error } = await supabase
      .from('council_member_referrals')
      .select('id, council_member_name, council_member_party, status, citizen_message, match_reasons, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (!error && referrals?.length > 0) {
      summary.referrals = referrals.length;

      const formatted = referrals.map((r: any, i: number) => {
        const date = new Date(r.created_at).toLocaleDateString('pt-BR');
        const status = statusLabels[r.status] || r.status;
        const party = r.council_member_party ? `(${r.council_member_party})` : '';
        return `[${i+1}] Para: ${r.council_member_name} ${party}\n   ${status} | 📅 ${date}\n   📝 "${r.citizen_message?.slice(0, 50) || 'Sem mensagem'}..."`;
      }).join('\n\n');

      results.push(`📨 **ENCAMINHAMENTOS A VEREADORES** (${referrals.length})\n\n${formatted}`);
    }
  }

  // Build response
  if (results.length === 0) {
    return `📭 Você ainda não tem nenhum registro no app.\n\nQue tal começar? Posso ajudar a:\n• Registrar um problema urbano\n• Reportar problema no transporte\n• Avaliar um serviço público\n• Buscar audiências públicas`;
  }

  const summaryText = `📊 **RESUMO DA SUA PARTICIPAÇÃO**\n\n` +
    `📋 Relatos urbanos: ${summary.urban_reports}\n` +
    `🚌 Relatos de transporte: ${summary.transport_reports}\n` +
    `⭐ Avaliações: ${summary.ratings}\n` +
    `🎤 Audiências: ${summary.audiencias}\n` +
    `📨 Encaminhamentos: ${summary.referrals}\n\n` +
    `🟡 Pendentes: ${summary.pending} | ✅ Resolvidos: ${summary.resolved}`;

  return `${summaryText}\n\n---\n\n${results.join('\n\n---\n\n')}`;
}

// Helper: Execute tool and insert into database
async function executeTool(
  toolName: string, 
  args: any, 
  userId: string, 
  supabase: any
): Promise<{ success: boolean; id?: string; error?: string; marker?: string }> {
  
  console.log(`[executeTool] Executing ${toolName} with args:`, JSON.stringify(args));
  
  try {
    switch (toolName) {
      case 'create_urban_report': {
        const { data, error } = await supabase
          .from('urban_reports')
          .insert({
            user_id: userId,
            category: args.category,
            subcategory: args.subcategory || null,
            description: args.description,
            severity: 'media',
            location_address: args.location_address || null,
            status: 'pending',
            ai_classification: { collected_via: 'orchestrator', tool_call: true }
          })
          .select('id')
          .single();

        if (error) throw error;

        // Notify N8N (non-blocking)
        supabase.functions.invoke('notify-n8n', {
          body: { event: 'urban_report_created', report_id: data.id, report_type: 'urban', user_id: userId }
        }).catch(console.warn);

        return { success: true, id: data.id, marker: `[REPORT_CREATED:${data.id}]` };
      }

      case 'create_transport_report': {
        const { data, error } = await supabase
          .from('transport_reports')
          .insert({
            user_id: userId,
            report_type: args.report_type,
            severity: args.severity || 'medium',
            description: args.description,
            occurrence_date: args.occurrence_date,
            occurrence_time: args.occurrence_time || null,
            line_code_custom: args.line_code || null,
            location: args.location || null,
            impact_description: args.impact_description || null,
            ai_sentiment: 'neutral',
            ai_category: args.report_type,
            status: 'pending'
          })
          .select('id')
          .single();

        if (error) throw error;

        supabase.functions.invoke('notify-n8n', {
          body: { event: 'transport_report_created', report_id: data.id, report_type: 'transport', user_id: userId }
        }).catch(console.warn);

        return { success: true, id: data.id, marker: `[TRANSPORT_CREATED:${data.id}]` };
      }

      case 'create_service_rating': {
        // Find or create service
        let serviceId: string;
        const { data: existingService } = await supabase
          .from('public_services')
          .select('id')
          .or(`name.ilike.%${args.service_name}%,service_type.eq.${args.service_type}`)
          .limit(1)
          .single();

        if (existingService) {
          serviceId = existingService.id;
        } else {
          const { data: newService, error: serviceError } = await supabase
            .from('public_services')
            .insert({
              name: args.service_name,
              service_type: args.service_type,
              address: 'São Paulo, SP',
              district: 'Centro',
              latitude: -23.5505,
              longitude: -46.6333,
            })
            .select('id')
            .single();
          
          if (serviceError) throw serviceError;
          serviceId = newService.id;
        }

        // Create visit
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        const { data: visitData, error: visitError } = await supabase
          .from('service_visits')
          .insert({
            user_id: userId,
            service_id: serviceId,
            visited_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            status: 'completed',
          })
          .select('id')
          .single();

        if (visitError) throw visitError;

        // Create rating
        const { data: ratingData, error: ratingError } = await supabase
          .from('service_ratings')
          .insert({
            user_id: userId,
            service_id: serviceId,
            visit_id: visitData.id,
            rating_stars: args.rating_stars,
            rating_text: args.rating_text,
            sentiment: args.sentiment,
          })
          .select('id')
          .single();

        if (ratingError) throw ratingError;

        return { success: true, id: ratingData.id, marker: `[RATING_CREATED:${ratingData.id}]` };
      }

      case 'search_knowledge_base': {
        const context = await searchKnowledgeBase(supabase, args.query);
        return { success: true, id: 'search', error: context || 'Nenhum resultado encontrado.' };
      }

      case 'find_nearby_services': {
        const results = await findNearbyServices(supabase, args.service_type, args.district, args.limit || 5);
        return { success: true, id: 'services', error: results };
      }

      case 'search_audiencias': {
        const results = await searchAudiencias(supabase, args.tema, args.status, args.inscricoes_abertas);
        return { success: true, id: 'audiencias', error: results };
      }

      case 'suggest_council_member': {
        const results = await suggestCouncilMember(supabase, args.issue_type, args.description, args.district);
        return { success: true, id: 'council', error: results };
      }

      case 'get_citizen_history': {
        const results = await getCitizenHistory(supabase, userId, args.history_type || 'all', args.status_filter || 'all', args.limit || 5);
        return { success: true, id: 'history', error: results };
      }

      default:
        return { success: false, error: 'Tool não reconhecida' };
    }
  } catch (error) {
    console.error(`Error executing ${toolName}:`, error);
    return { success: false, error: (error as Error).message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase não configurado');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Extract user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Usuário não autenticado');

    console.log('[ai-orchestrator] Processing for user:', user.id);

    // First call: Let AI decide if tool is needed
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-20)
        ],
        tools,
        tool_choice: 'auto',
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    // If tool call detected, execute it
    if (toolCalls?.length > 0) {
      const toolCall = toolCalls[0];
      console.log('[ai-orchestrator] Tool call:', toolCall.function.name);

      let toolArgs;
      try {
        toolArgs = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        throw new Error('Erro ao processar argumentos da tool');
      }

      const toolResult = await executeTool(toolCall.function.name, toolArgs, user.id, supabase);
      console.log('[ai-orchestrator] Tool result:', toolResult);

      // Determine confirmation prompt based on tool type
      const isSearchTool = ['search_knowledge_base', 'find_nearby_services', 'search_audiencias', 'suggest_council_member', 'get_citizen_history'].includes(toolCall.function.name);
      
      const confirmPrompt = toolResult.success
        ? isSearchTool
          ? `Resultados encontrados:\n${toolResult.error}\n\nApresente esses resultados de forma amigável e útil ao cidadão.`
          : 'Agradeça brevemente (2-3 frases), confirme o registro e mencione que pode acompanhar pelo app.'
        : `Houve um erro: ${toolResult.error}. Peça desculpas e sugira tentar novamente.`;

      const confirmResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Você é o Assistente CMSP. Responda de forma breve e empática.' },
            ...messages.slice(-5),
            { role: 'user', content: confirmPrompt }
          ],
          stream: true,
        }),
      });

      if (!confirmResponse.ok) {
        // Fallback static message
        const staticMsg = toolResult.success 
          ? isSearchTool
            ? `📋 Resultados:\n\n${toolResult.error}`
            : `✅ Pronto! Registro salvo com sucesso.\n\n${toolResult.marker || ''}`
          : `❌ Erro: ${toolResult.error}`;
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: staticMsg } }] })}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }

      // Stream response with marker injection
      const reader = confirmResponse.body!.getReader();
      const encoder = new TextEncoder();
      
      const customStream = new ReadableStream({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }

          // Inject success marker at the end (only for non-search tools)
          if (toolResult.marker && !isSearchTool) {
            const markerData = `data: ${JSON.stringify({ choices: [{ delta: { content: `\n\n${toolResult.marker}` } }] })}\n\n`;
            controller.enqueue(encoder.encode(markerData));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      return new Response(customStream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }

    // No tool call - stream regular response
    const streamResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-20)
        ],
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      throw new Error(`Stream error: ${streamResponse.status}`);
    }

    // Save conversation
    if (conversationId) {
      await supabase
        .from('ai_conversations')
        .update({
          messages,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', user.id);
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
    });

  } catch (error) {
    console.error('[ai-orchestrator] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
