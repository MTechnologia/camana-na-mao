// Unified tools for CMSP Assistant - extracted to reduce bundle size

// Unified tools for all citizen actions
export const tools = [
  {
    type: "function",
    function: {
      name: "classify_report_category",
      description: "Classifica a categoria do relato urbano. CHAMAR APENAS quando o cidadão DESCREVER um problema específico (ex: 'poste apagado', 'buraco na rua', 'bueiro entupido'). NÃO CHAMAR para mensagens genéricas como 'quero relatar um problema' ou 'problema na cidade'. Se confiança >= 80%, classificar automaticamente. Se < 80%, perguntar entre 2-3 opções. SEMPRE gerar subcategory_label intuitivo.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "lixo", "esgoto", "area_verde", "higiene_urbana", "animais", "poluicao", "feedback_camara", "outro"],
            description: "Categoria PAI mais próxima: iluminacao (poste, luz), calcada (passeio), via_publica (buraco, asfalto, semáforo), lixo (entulho), esgoto (bueiro, vazamento, alagamento), area_verde (praça, árvore), higiene_urbana (fedor genérico, sujeira), animais (bicho morto, rato), poluicao (fumaça, barulho, som alto, perturbação), feedback_camara (vereador), outro (quando não encaixar)"
          },
          subcategory_label: {
            type: "string",
            description: "Label INTUITIVO em português que descreve o problema específico. SEMPRE gerar. Exemplos: 'Perturbação Sonora' (som alto de bar), 'Barulho de Obra' (obra fora de horário), 'Veículo Abandonado' (carro parado há meses), 'Estabelecimento Barulhento' (bar/balada), 'Poste Apagado', 'Bueiro Entupido', etc."
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Nível de confiança na classificação (0.0 a 1.0). Se >= 0.8, classificação automática. Se < 0.8, perguntar ao usuário."
          },
          reasoning: {
            type: "string",
            description: "Justificativa da classificação (para auditoria)"
          },
          user_confirmed: {
            type: "boolean",
            description: "Se o usuário confirmou a categoria (true quando usuário escolheu entre opções)"
          },
          alternative_categories: {
            type: "array",
            items: { type: "string" },
            description: "Quando confiança < 80%, listar 2-3 categorias alternativas mais prováveis"
          }
        },
        required: ["category", "subcategory_label", "confidence", "reasoning", "user_confirmed"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "classify_transport_type",
      description: "Classifica o tipo de problema no transporte público. CHAMAR APENAS quando o cidadão DESCREVER um problema específico (ex: 'ônibus atrasou', 'metrô lotado', 'motorista imprudente'). NÃO CHAMAR para mensagens genéricas como 'quero relatar problema no transporte'. Se confiança >= 80%, classificar automaticamente. Se < 80%, perguntar entre 2-3 opções. SEMPRE gerar subcategory_label intuitivo.",
      parameters: {
        type: "object",
        properties: {
          report_type: {
            type: "string",
            enum: ["atraso", "lotacao", "seguranca", "acessibilidade", "limpeza", "conducao", "outro"],
            description: "Tipo PAI mais próximo: atraso (demora, espera), lotacao (cheio, superlotado), seguranca (assédio, roubo, briga), acessibilidade (elevador, rampa), limpeza (sujo, fedido), conducao (motorista, freada), outro (quando não encaixar)"
          },
          subcategory_label: {
            type: "string",
            description: "Label INTUITIVO em português. SEMPRE gerar. Exemplos: 'Atraso de Veículo', 'Superlotação', 'Assédio no Transporte', 'Elevador Quebrado', 'Veículo Sujo', 'Freada Brusca', etc."
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Nível de confiança (0.0-1.0). Se >= 0.8, classificação automática. Se < 0.8, perguntar ao usuário."
          },
          reasoning: {
            type: "string",
            description: "Justificativa da classificação (para auditoria)"
          },
          user_confirmed: {
            type: "boolean",
            description: "Se o usuário confirmou o tipo (true quando usuário escolheu entre opções)"
          },
          alternative_types: {
            type: "array",
            items: { type: "string" },
            description: "Quando confiança < 80%, listar 2-3 tipos alternativos mais prováveis"
          }
        },
        required: ["report_type", "subcategory_label", "confidence", "reasoning", "user_confirmed"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "validate_cep",
      description: "Valida CEP e retorna endereço completo. CHAMAR SEMPRE que cidadão informar um CEP (8 dígitos). Retorna rua, bairro, cidade automaticamente.",
      parameters: {
        type: "object",
        properties: {
          cep: { type: "string", description: "CEP no formato 00000-000 ou 00000000 (8 dígitos)" }
        },
        required: ["cep"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_urban_report",
      description: "Registra problema urbano ou feedback sobre a Câmara. SOMENTE chamar quando tiver: 1) categoria, 2) descrição (min 15 chars), 3) rua + bairro (via CEP validado ou informados manualmente). Para categorias de risco (via_publica, iluminacao, esgoto, area_verde), coletar também dados de impacto.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "lixo", "esgoto", "area_verde", "higiene_urbana", "animais", "poluicao", "feedback_camara", "outro"],
            description: "Categoria: iluminacao (poste, luz), calcada (passeio), via_publica (buraco, asfalto, semáforo), lixo (entulho), esgoto (bueiro, vazamento), area_verde (praça, árvore), higiene_urbana (fedor, sujeira), animais (bicho morto, rato), poluicao (fumaça, barulho), feedback_camara (vereador/câmara), outro"
          },
          subcategory: { type: "string", description: "Subcategoria (para feedback_camara: elogio, reclamacao, sugestao)" },
          description: { type: "string", description: "Descrição completa do problema (mínimo 15 caracteres)" },
          cep: { type: "string", description: "CEP do local (se validado via validate_cep)" },
          street: { type: "string", description: "OBRIGATÓRIO: Nome da rua/avenida (ex: Rua Augusta, Av. Paulista)" },
          street_number: { type: "string", description: "Número ou 'sem número' ou 'altura X'" },
          reference_point: { type: "string", description: "Ponto de referência (ex: perto do metrô, em frente à escola)" },
          neighborhood: { type: "string", description: "OBRIGATÓRIO: Bairro de São Paulo (ex: Consolação, Pinheiros, Centro)" },
          council_member_name: { type: "string", description: "Para feedback_camara: nome COMPLETO do vereador" },
          council_member_party: { type: "string", description: "Para feedback_camara: partido do vereador" },
          risk_level: { 
            type: "string", 
            enum: ["critical", "moderate", "low", "none"],
            description: "Nível de risco imediato: critical (risco de vida, fios expostos, desabamento), moderate (bloqueio parcial, risco de acidente), low (incômodo, desconforto), none (sem risco)"
          },
          risk_types: { 
            type: "array", 
            items: { type: "string", enum: ["electrical", "traffic", "flooding", "structural", "health", "fire"] },
            description: "Tipos de risco presentes: electrical (fios/choque), traffic (via bloqueada), flooding (alagamento), structural (desabamento), health (contaminação), fire (incêndio)"
          },
          affected_scope: { 
            type: "string", 
            enum: ["individual", "street", "neighborhood", "zone", "city"],
            description: "Alcance da afetação: individual (só eu), street (toda a rua), neighborhood (bairro todo), zone (zona inteira), city (cidade)"
          },
          affected_estimate: { 
            type: "integer", 
            description: "Estimativa de pessoas afetadas (quando conseguir inferir)"
          },
          active_consequences: { 
            type: "array", 
            items: { type: "string", enum: ["power_outage", "water_outage", "traffic_blocked", "flooding", "health_hazard", "service_disruption"] },
            description: "Consequências já em andamento: power_outage (falta luz), water_outage (falta água), traffic_blocked (trânsito parado), flooding (alagando), health_hazard (risco saúde), service_disruption (serviço interrompido)"
          },
          urgency_reason: { 
            type: "string", 
            description: "Motivo de urgência descrito pelo cidadão em suas palavras"
          }
        },
        required: ["category", "description", "street", "neighborhood"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_transport_report",
      description: "Registra problema no transporte público. CHAMAR APENAS quando tiver: 1) descrição (min 10 chars), 2) data da ocorrência. NÃO CHAMAR para mensagens genéricas. Se não conseguir classificar o tipo, usar 'outro' e gerar subcategory_label intuitivo.",
      parameters: {
        type: "object",
        properties: {
          report_type: {
            type: "string",
            enum: ["atraso", "lotacao", "seguranca", "acessibilidade", "limpeza", "conducao", "outro"],
            description: "Tipo PAI mais próximo. Se não encaixar, usar 'outro'."
          },
          subcategory_label: {
            type: "string",
            description: "Label INTUITIVO em português. SEMPRE gerar. Exemplos: 'Atraso de Veículo', 'Veículo Lotado', 'Problema com Motorista', 'Veículo Não Parou', 'Porta com Defeito', etc."
          },
          description: { type: "string", description: "Descrição do problema (mínimo 10 caracteres)" },
          occurrence_date: { type: "string", description: "Data YYYY-MM-DD (inferir 'hoje' se contexto indicar)" },
          occurrence_time: { type: "string", description: "Horário HH:MM (perguntar horário aproximado)" },
          line_code: { type: "string", description: "Código da linha de ônibus/metrô" },
          location: { type: "string", description: "Ponto, estação ou trecho" },
          severity: {
            type: "string",
            enum: ["baixa", "media", "alta", "critica"],
            description: "Gravidade: critica (acidente, agressão), alta (atraso >30min), media (atraso 15-30min), baixa (desconforto)"
          },
          impact_description: { type: "string", description: "Como afetou a rotina do cidadão" }
        },
        required: ["report_type", "description", "occurrence_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_service_rating",
      description: "Registra avaliação de serviço público. NUNCA CHAMAR COM rating_stars=0 ou rating_text vazio. VERIFICAR que todos os campos foram coletados: 1) service_type, 2) service_name (mínimo 3 chars), 3) rating_stars (1-5, NUNCA 0), 4) rating_text (mínimo 10 chars). Se faltar algum dado, PERGUNTAR antes de chamar. NÃO CHAMAR para mensagens genéricas como 'quero avaliar'.",
      parameters: {
        type: "object",
        properties: {
          service_type: {
            type: "string",
            enum: ["ubs", "school", "ceu", "hospital", "library", "sports_center", "other"],
            description: "PERGUNTAR PRIMEIRO: tipo do serviço (ubs, escola, hospital, etc)"
          },
          service_name: { type: "string", description: "Nome do serviço avaliado - MÍNIMO 3 caracteres (ex: UBS Vila Madalena)" },
          service_neighborhood: { type: "string", description: "Bairro onde fica o serviço (ajuda a localizar)" },
          rating_stars: { type: "integer", minimum: 1, maximum: 5, description: "OBRIGATÓRIO: Nota 1-5 estrelas. NUNCA usar 0!" },
          rating_text: { type: "string", description: "OBRIGATÓRIO: Comentário da avaliação - MÍNIMO 10 caracteres" },
          sentiment: {
            type: "string",
            enum: ["positive", "neutral", "negative"],
            description: "Sentimento inferido do comentário"
          }
        },
        required: ["service_type", "service_name", "rating_stars", "rating_text", "sentiment"]
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
      description: "Busca audiências públicas da Câmara (agendadas e histórico). OBRIGATÓRIO chamar com o parâmetro tema quando o cidadão escolher um tema da lista (ex: Saúde, Meio Ambiente) para retornar audiências desse tema inclusive do histórico. Usar também para: audiências, consultas públicas, participação popular, próximas audiências.",
      parameters: {
        type: "object",
        properties: {
          tema: { type: "string", description: "Tema de interesse (ex: Saúde, Meio Ambiente, Educação). Sempre preencher quando o usuário escolher um tema da lista 'Temas com histórico de audiências'." },
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
  },
  // === JORNADA CONSCIENTE: Tools de Detecção e Transição ===
  {
    type: "function",
    function: {
      name: "detect_user_intent",
      description: "Classificar a intenção do cidadão. USAR APENAS quando a mensagem contiver descrição específica do problema (>= 15 chars com contexto). Para mensagens genéricas como 'quero relatar', 'problema na cidade', 'avaliar serviço' SEM detalhes, NÃO CHAMAR - apenas pergunte 'Qual o problema/serviço e onde fica?'. Se a mensagem já contém descrição detalhada, extrair categoria/tipo junto.",
      parameters: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            enum: ["urban_report", "transport_report", "service_rating", "services", "general", "unknown"],
            description: "Intenção detectada semanticamente. Exemplos: 'ônibus capotou na avenida' = urban_report (acidente urbano), 'ônibus atrasou 30 minutos' = transport_report (problema de serviço)"
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Nível de confiança (0.0-1.0). Se >= 0.8, ativar jornada automaticamente."
          },
          reasoning: {
            type: "string",
            description: "Justificativa semântica da classificação"
          },
          suggested_alternatives: {
            type: "array",
            items: { type: "string" },
            description: "Se confiança < 80%, listar alternativas prováveis"
          },
          // NOVO: Campos extraídos da mensagem inicial
          urban_category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "lixo", "esgoto", "area_verde", "higiene_urbana", "animais", "poluicao", "feedback_camara", "outro"],
            description: "PARA urban_report: categoria inferida do problema. Ex: 'ônibus capotou' = via_publica, 'poste apagado' = iluminacao, 'bueiro entupido' = esgoto"
          },
          transport_type: {
            type: "string",
            enum: ["atraso", "lotacao", "seguranca", "acessibilidade", "limpeza", "outro"],
            description: "PARA transport_report: tipo de problema inferido"
          },
          extracted_description: {
            type: "string",
            description: "Se a mensagem inicial já contém descrição detalhada do problema (>= 30 chars), extrair aqui. Ex: 'Ônibus capotou na Paulista' → 'Ônibus capotou na Avenida Paulista'"
          },
          category_confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Confiança na categoria/tipo extraído (0.0-1.0)"
          }
        },
        required: ["intent", "confidence", "reasoning"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "confirm_journey_switch",
      description: "USAR quando detectar mudança de intenção durante uma jornada de coleta estruturada (urban_report, transport_report, service_rating). Gera prompt de confirmação com botões para o usuário decidir. NÃO usar para jornadas leves (services, general).",
      parameters: {
        type: "object",
        properties: {
          current_journey: {
            type: "string",
            enum: ["urban_report", "transport_report", "service_rating"],
            description: "Jornada atual em andamento"
          },
          detected_journey: {
            type: "string",
            enum: ["urban_report", "transport_report", "service_rating", "services", "general"],
            description: "Nova jornada detectada"
          },
          current_progress_summary: {
            type: "string",
            description: "Resumo do que já foi coletado na jornada atual (ex: 'Problema de iluminação na Rua Augusta')"
          }
        },
        required: ["current_journey", "detected_journey", "current_progress_summary"]
      }
    }
  }
];
