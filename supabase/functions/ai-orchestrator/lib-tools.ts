// Unified tools for CMSP Assistant - extracted to reduce bundle size

// Unified tools for all citizen actions
export const tools = [
  {
    type: "function",
    function: {
      name: "classify_report_category",
      description: "Classifica a categoria do relato urbano (eixo técnico: iluminação, via, esgoto, etc.). CHAMAR quando o cidadão DESCREVER algo específico — inclui reclamações, mas também sugestões ou elogios sobre infraestrutura (ex.: 'parabéns pela limpeza da praça' → area_verde ou outro com label positivo). NÃO CHAMAR para mensagens genéricas sem conteúdo. Se confiança >= 80%, classificar automaticamente. Se < 80%, perguntar entre 2-3 opções. SEMPRE gerar subcategory_label intuitivo.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "sinalizacao", "drenagem", "lixo", "esgoto", "area_verde", "higiene_urbana", "animais", "poluicao", "feedback_camara", "outro"],
            description: "Categoria PAI mais próxima: iluminacao (poste, luz), calcada (passeio), via_publica (buraco, asfalto, pavimentação), sinalizacao (semáforo, placa, faixa de pedestre, sinalização), drenagem (água pluvial, sarjeta, galeria, bueiro pluvial, poça), lixo (entulho), esgoto (bueiro sanitário, vazamento de esgoto), area_verde (praça, árvore), higiene_urbana (fedor genérico, sujeira), animais (bicho morto, rato), poluicao (SOM: barulho, música alta, festa, vizinho, poluição sonora/acústica, buzina — subcategory_label tipo Perturbação Sonora; AMBIENTAL: fumaça, chaminé, poluição do ar/atmosférica, contaminação, químico — subcategory_label tipo Poluição Atmosférica/Contaminação; NÃO misturar os dois sentidos), feedback_camara (vereador), outro (quando não encaixar)"
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
      description: "Registra relato urbano (reclamação, dúvida, sugestão ou elogio) ou feedback sobre a Câmara. SOMENTE chamar quando tiver: 1) categoria, 2) descrição (min 15 chars), 3) rua + bairro (via CEP validado ou informados manualmente). Preencher report_nature quando o cidadão deixou claro. Para categorias de risco (via_publica, iluminacao, esgoto, area_verde, calcada, sinalizacao, drenagem), coletar também dados de impacto.",
      parameters: {
        type: "object",
        properties: {
          report_nature: {
            type: "string",
            enum: ["reclamacao", "duvida", "sugestao", "elogio"],
            description: "Natureza conversacional: reclamacao (problema), duvida, sugestao (melhoria), elogio (reconhecimento positivo). Se não souber, usar reclamacao."
          },
          category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "sinalizacao", "drenagem", "lixo", "esgoto", "area_verde", "higiene_urbana", "animais", "poluicao", "feedback_camara", "outro"],
            description: "Categoria: iluminacao (poste, luz), calcada (passeio), via_publica (buraco, asfalto), sinalizacao (semáforo, placa, faixa), drenagem (pluvial, sarjeta, galeria), lixo (entulho), esgoto (bueiro sanitário, vazamento), area_verde (praça, árvore), higiene_urbana (fedor, sujeira), animais (bicho morto, rato), poluicao (sonora: barulho/som/festa/vizinho; ambiental: fumaça/poluição do ar/contaminação — usar subcategory_label distinto), feedback_camara (vereador/câmara), outro"
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
      description: "Registra problema no transporte público. CHAMAR APENAS quando tiver: 1) descrição (mínimo 20 caracteres), 2) data da ocorrência. NÃO CHAMAR para mensagens genéricas. Se não conseguir classificar o tipo, usar 'outro' e gerar subcategory_label intuitivo.",
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
          sub_category: {
            type: "string",
            description: "Subcategoria estruturada do transporte, escolhida pelo usuário no picker [SUBCATEGORY_PICKER:report_type]. Ex.: nao_passou, superlotado, assedio."
          },
          description: { type: "string", description: "Descrição do problema (mínimo 20 caracteres)" },
          occurrence_date: { type: "string", description: "Data YYYY-MM-DD (inferir 'hoje' se contexto indicar)" },
          occurrence_time: { type: "string", description: "Horário exato HH:MM (aceitar formatos variados e normalizar)" },
          direction: {
            type: "string",
            enum: ["ida", "volta", "circular"],
            description: "Sentido da viagem: ida, volta ou circular"
          },
          recurrence_frequency: {
            type: "string",
            enum: ["primeira_vez", "algumas_vezes_mes", "toda_semana", "todos_os_dias"],
            description: "Frequência de recorrência: primeira_vez, algumas_vezes_mes, toda_semana ou todos_os_dias"
          },
          line_code: { type: "string", description: "Código da linha de ônibus/metrô" },
          line_id: {
            type: "string",
            description: "UUID da linha em transport_lines quando o usuário selecionou na lista ([LINE_SELECTED]). Opcional; se ausente, resolve-se por line_code.",
          },
          location: { type: "string", description: "Ponto, estação ou trecho" },
          stop_name: {
            type: "string",
            description: "HU-6.4: nome do ponto, terminal ou estação (opcional, até ~200 caracteres).",
          },
          stop_location: {
            type: "string",
            description:
              "HU-6.4: referência textual do local ou coordenadas lat,lng. Se GPS estiver fora de São Paulo, o registro é bloqueado.",
          },
          accessibility_details: {
            type: "object",
            description:
              "Checklist condicional para report_type='acessibilidade' com 4 chaves booleanas: elevador_funcionando, piso_tatil_presente, espaco_cadeirante, info_sonora_visual_disponivel.",
          },
          severity: {
            type: "string",
            enum: ["baixa", "media", "alta", "critica"],
            description: "Gravidade: critica (acidente, agressão), alta (atraso >30min), media (atraso 15-30min), baixa (desconforto)"
          },
          impact_description: { type: "string", description: "Como afetou a rotina do cidadão (texto livre; opcional se personal_impact vier do picker)" },
          personal_impact: {
            type: "integer",
            description: "Impacto na rotina (2–5), normalmente preenchido pelo app via [IMPACT_SELECTED] após o ImpactPicker",
            minimum: 2,
            maximum: 5,
          },
          photos: {
            type: "array",
            items: { type: "string" },
            description: "URLs das fotos anexadas pelo usuário (até 3). Preenchido pelo sistema quando o usuário anexa imagens no chat."
          }
        },
        required: ["report_type", "sub_category", "description", "occurrence_date", "occurrence_time", "direction", "recurrence_frequency"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_service_rating",
      description: "Registra avaliação de serviço público. rating_stars 1-5 é a média arredondada das quatro dimensões (tempo_espera, atendimento, infraestrutura, limpeza) quando o fluxo coleta scores. Dois modos: 1) COM visit_id — visita já identificada; 2) SEM visit_id — localizar serviço (tipo, nome, endereço) e depois [FIELD_REQUEST:rating_dimensions] + [MULTI_DIMENSION_RATING_PICKER] (quatro notas num passo), comentário e confirmação de pré-visualização antes de gravar. NUNCA rating_text vazio.",
      parameters: {
        type: "object",
        properties: {
          visit_id: { type: "string", description: "ID da visita (service_visits). Quando informado, serviço e visita já existem — coletar nota geral, tempo de espera, dimensões e comentário (paridade com o modo sem visit_id após identificar o serviço)." },
          service_id: { type: "string", description: "ID do serviço (public_services). Usado junto com visit_id para evitar lookup." },
          service_type: {
            type: "string",
            enum: ["ubs", "school", "ceu", "hospital", "library", "sports_center", "other"],
            description: "Tipo do serviço. Obrigatório APENAS quando visit_id NÃO for informado."
          },
          service_name: { type: "string", description: "Nome do serviço. Obrigatório APENAS quando visit_id NÃO for informado." },
          service_neighborhood: { type: "string", description: "Bairro (ajuda a localizar quando sem visit_id)" },
          service_address_confirmed: { type: "boolean", description: "Confirmação do endereço. Obrigatório APENAS quando visit_id NÃO for informado." },
          rating_dimensions: {
            type: "object",
            description: "Opcional (legado): notas 1-5 por dimensão; preferir rating_stars",
            properties: {
              atendimento: { type: "integer", minimum: 1, maximum: 5 },
              limpeza: { type: "integer", minimum: 1, maximum: 5 },
              infraestrutura: { type: "integer", minimum: 1, maximum: 5 },
              tempo_espera: { type: "integer", minimum: 1, maximum: 5 },
            },
          },
          rating_stars: { type: "integer", minimum: 1, maximum: 5, description: "OBRIGATÓRIO quando aplicável: nota 1-5 estrelas. NUNCA usar 0. Obrigatória se não houver rating_dimensions completas." },
          wait_time_score: {
            type: "integer",
            minimum: 2,
            maximum: 5,
            description: "Opcional: nota da faixa de tempo de espera (RN-EVAL-001: só 2–5). N/A (null) vem dos campos acumulados na conversa, não precisa repetir aqui."
          },
          rating_text: { type: "string", description: "OBRIGATÓRIO: Comentário da avaliação - MÍNIMO 10 caracteres" },
          sentiment: {
            type: "string",
            enum: ["positive", "neutral", "negative"],
            description: "Sentimento inferido do comentário"
          }
        },
        required: ["rating_text", "sentiment"]
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
      description: "Busca serviços públicos próximos ao cidadão (por coordenadas quando disponíveis). Usar para qualquer equipamento: UBS, escola, hospital, CEU, biblioteca, parques, feiras, creches, teatros, museus, centros esportivos, pontos de ônibus (transit_station), delegacia, bombeiros, etc. Quando o cidadão disser 'parques mais perto', 'qual UBS mais próxima', 'creches perto de mim', use o service_type correspondente.",
      parameters: {
        type: "object",
        properties: {
          service_type: {
            type: "string",
            enum: ["ubs", "school", "ceu", "hospital", "library", "sports_center", "park", "street_market", "community_center", "daycare", "market", "city_market", "theater", "museum", "social_assistance", "transit_station", "police_station", "cemetery", "accessibility", "recycling_point", "fire_station", "other"],
            description: "Tipo do equipamento: ubs, school, ceu, hospital, library, sports_center, park (parques), street_market (feiras), community_center, daycare (creches), market, city_market, theater, museum, social_assistance, transit_station (ônibus/transporte), police_station, cemetery, accessibility, recycling_point, fire_station, other"
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
      name: "get_service_occupancy_status",
      description: "Consulta a estimativa atual de ocupação/movimentação de um equipamento público específico pelo nome (ex.: 'Como está o CEU Butantã agora?'). Usar quando o cidadão perguntar 'como está', 'está cheio', 'ocupação', 'movimentação' de um local/equipamento.",
      parameters: {
        type: "object",
        properties: {
          service_name: { type: "string", description: "Nome do equipamento/serviço (ex.: CEU Butantã, UBS Vila Mariana)" },
          service_id: { type: "string", description: "UUID do serviço quando o cidadão escolheu um item na lista (picker); preferir em relação ao nome." },
          district: { type: "string", description: "Bairro/região para desambiguar quando houver nomes parecidos (opcional)." }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_bus_lines",
      description: "Busca linhas de ônibus da SPTrans (Olho Vivo) por número ou nome. Usar quando o cidadão perguntar: qual linha passa aqui, ônibus 8000, linha para a Lapa, etc.",
      parameters: {
        type: "object",
        properties: {
          termos_busca: { type: "string", description: "Número ou nome da linha (ex: 8000, Lapa, Ramos)" }
        },
        required: ["termos_busca"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_bus_stops",
      description: "Busca pontos de parada por NOME da parada ou ENDEREÇO (rua, logradouro). NÃO aceita coordenadas; se o cidadão enviar só lat/lon, peça um endereço ou nome de rua/ponto (ex: Afonso Braz, Rua Augusta, Jóquei).",
      parameters: {
        type: "object",
        properties: {
          termos_busca: { type: "string", description: "Nome da parada ou endereço/rua (ex: Afonso Braz, Balthazar da Veiga). Nunca use coordenadas." }
        },
        required: ["termos_busca"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_bus_stop_forecast_all_lines",
      description: "Previsão de chegada de TODAS as linhas em um ponto de parada. Usar quando perguntar: quando passa ônibus nesse ponto, previsão na parada X (sem citar linha específica).",
      parameters: {
        type: "object",
        properties: {
          codigo_parada: { type: "integer", description: "Código da parada (cp) obtido em search_bus_stops" }
        },
        required: ["codigo_parada"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_bus_line_itinerary",
      description: "Retorna o itinerário (trajeto) de uma linha de ônibus: todas as paradas em ordem. Usar quando perguntar: por onde passa a linha X, trajeto da linha, percurso.",
      parameters: {
        type: "object",
        properties: {
          codigo_linha: { type: "integer", description: "Código da linha (cl) obtido em search_bus_lines" }
        },
        required: ["codigo_linha"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_bus_arrival_forecast",
      description: "Previsão de chegada dos ônibus em um ponto de parada para uma linha. Usar quando perguntar: que horas passa o ônibus, quando chega o próximo, previsão no ponto.",
      parameters: {
        type: "object",
        properties: {
          codigo_parada: { type: "integer", description: "Código da parada (cp) obtido em search_bus_stops" },
          codigo_linha: { type: "integer", description: "Código da linha (cl) obtido em search_bus_lines" }
        },
        required: ["codigo_parada", "codigo_linha"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_audiencias",
      description: "Busca audiências públicas da Câmara (agendadas e histórico) com filtros por tema, data e região. OBRIGATÓRIO chamar com o parâmetro tema quando o cidadão escolher um tema da lista. Usar data_inicio/data_fim quando o usuário mencionar período (ex: dezembro, próximo mês). Usar regiao quando mencionar zona de São Paulo (Centro, Zona Norte, Sul, Leste, Oeste).",
      parameters: {
        type: "object",
        properties: {
          tema: { type: "string", description: "Tema de interesse (ex: Saúde, Meio Ambiente, Educação). Sempre preencher quando o usuário escolher um tema da lista 'Temas com histórico de audiências'." },
          status: {
            type: "string",
            enum: ["scheduled", "ongoing", "finished"],
            description: "Status da audiência: scheduled (agendada), ongoing (em andamento), finished (encerrada)"
          },
          inscricoes_abertas: { type: "boolean", description: "Filtrar apenas audiências com inscrições abertas" },
          data_inicio: { type: "string", description: "Data inicial do período (YYYY-MM-DD). Ex.: 2025-12-01. Usar quando o cidadão pedir audiências a partir de uma data ou em um mês/ano." },
          data_fim: { type: "string", description: "Data final do período (YYYY-MM-DD). Ex.: 2026-01-31. Usar quando o cidadão pedir audiências até uma data ou em um intervalo." },
          regiao: {
            type: "string",
            enum: ["Centro", "Zona Norte", "Zona Sul", "Zona Leste", "Zona Oeste"],
            description: "Região (zona) de São Paulo onde a audiência ocorre. Usar quando o cidadão pedir audiências na zona norte, sul, centro, etc."
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "subscribe_audiencia_topic_alert",
      description: "Registra que o cidadão quer receber aviso quando houver novas audiências públicas sobre um tema. Usar quando o cidadão pedir para ser avisado, notificado ou lembrado sobre audiências de um tema (ex: 'avise quando tiver audiências sobre esporte', 'me notifique sobre audiências de saúde'). Requer que o cidadão esteja logado.",
      parameters: {
        type: "object",
        properties: {
          tema: { type: "string", description: "Tema para o qual o cidadão quer receber avisos (ex: Esportes, Saúde, Educação, Meio Ambiente, Cultura)." }
        },
        required: ["tema"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "subscribe_service",
      description:
        "Registra que o cidadão quer acompanhar um equipamento público (UBS, escola, parque, etc.) e receber notificações quando houver nova avaliação publicada. Usar quando pedir para seguir, acompanhar ou ser avisado sobre um serviço específico já identificado (UUID do equipamento). Requer login.",
      parameters: {
        type: "object",
        properties: {
          service_id: {
            type: "string",
            description:
              "UUID do equipamento em public_services (mesmo id usado na URL /servico/:id ou retornado por find_nearby_services).",
          },
        },
        required: ["service_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "subscribe_transport_line",
      description:
        "Registra que o cidadão quer acompanhar uma linha de ônibus/metrô e receber notificações quando houver novos relatos ou padrões naquela linha. Usar quando pedir para seguir linha, acompanhar ônibus ou ser avisado sobre problemas numa linha. Informar line_id (UUID) OU line_code (ex.: 8000-10). Requer login.",
      parameters: {
        type: "object",
        properties: {
          line_id: {
            type: "string",
            description: "UUID da linha em transport_lines, se conhecido.",
          },
          line_code: {
            type: "string",
            description: "Código oficial da linha (ex.: 8000-10, LINHA-1-AZUL) quando não houver UUID.",
          },
        },
        required: [],
      },
    },
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
            enum: ["iluminacao", "calcada", "via_publica", "sinalizacao", "drenagem", "lixo", "esgoto", "area_verde", "higiene_urbana", "animais", "poluicao", "feedback_camara", "outro"],
            description: "PARA urban_report: categoria inferida do problema. Ex: 'ônibus capotou' = via_publica, 'poste apagado' = iluminacao, 'semáforo apagado' = sinalizacao, 'sarjeta entupida' = drenagem, 'bueiro de esgoto' = esgoto"
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
