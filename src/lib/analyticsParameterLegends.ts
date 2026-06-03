import type { AnalyticsMetric } from "@/types/analyticsDrill";

export type ParameterLegendItem = {
  term: string;
  description: string;
  /** Preenchido quando o valor não é bruto (contagem direta). */
  formula?: string;
};

/** Recorte local da página Análise de relatos urbanos (período, categoria, status). */
export const URBAN_ANALYTICS_FILTER_LEGENDS: ParameterLegendItem[] = [
  {
    term: "Período",
    description:
      "Intervalo de datas dos relatos urbanos considerados. KPIs, gráficos e abas usam esse recorte.",
  },
  {
    term: "Categoria",
    description:
      "Tema do relato (Mobilidade, Saúde, Urbanismo, etc.). Restringe volumes e padrões ao assunto escolhido.",
  },
  {
    term: "Status",
    description:
      "Etapa do protocolo (pendente, em andamento, resolvido, rejeitado). Filtra a base antes das agregações.",
  },
];

export const FILTER_PARAMETER_LEGENDS: ParameterLegendItem[] = [
  {
    term: "Período",
    description:
      "Intervalo de datas dos relatos considerados (ex.: últimos 30 dias). Tudo na página usa esse recorte.",
  },
  {
    term: "Comparar períodos",
    description:
      "Modo HU-5.1: define o período principal (A) e, opcionalmente, um período B para comparar volume e categorias. KPIs e gráfico territorial seguem o período A; a seção de comparação mostra deltas A vs B.",
    formula:
      "Presets do período B: anterior (mesma duração antes de A), mesmo intervalo no ano passado, ou datas personalizadas.",
  },
  {
    term: "Região",
    description:
      "Área de São Paulo (capital) escolhida. Restringe números e mapas ao território selecionado.",
  },
  {
    term: "Categoria",
    description:
      "Assunto do relato (Mobilidade, Saúde, etc.). Filtra volumes, sentimento e padrões por tema.",
  },
];

export const KPI_PARAMETER_LEGENDS: Record<AnalyticsMetric, ParameterLegendItem> = {
  volume: {
    term: "Volume de relatos",
    description: "Quantidade total de relatos no recorte (período + região + categoria).",
  },
  response_time: {
    term: "Tempo médio de resposta",
    description:
      "Média de horas entre abertura e encerramento dos relatos resolvidos no recorte (urbano e transporte). Zonas sem resolvidos aparecem com 0 h.",
    formula:
      "Para cada relato resolvido: horas entre created_at e updated_at (ou responded_at no transporte). Média aritmética no período e filtros ativos.",
  },
  sentiment: {
    term: "Sentimento agregado",
    description:
      "Percentual de relatos classificados como positivos no recorte. Neutro e negativo entram na classificação geral, mas este indicador destaca só a parcela favorável.",
    formula: "Relatos positivos ÷ total de relatos classificados no recorte × 100.",
  },
  patterns: {
    term: "Padrões recorrentes",
    description: "Quantos assuntos diferentes aparecem repetidas vezes no período.",
    formula:
      "Conta temas distintos que atingem um mínimo de repetições (ex.: vários relatos sobre o mesmo problema).",
  },
};

/** Três polaridades de sentimento — exibidas em todo gráfico analítico com dados de sentimento. */
export const SENTIMENT_POLARITY_LEGENDS: ParameterLegendItem[] = [
  {
    term: "Positivo",
    description:
      "Tom favorável: apoio, satisfação, elogio ou avaliação positiva em relação ao assunto do relato.",
  },
  {
    term: "Neutro",
    description:
      "Tom equilibrado ou factual: o relato informa ou descreve a situação sem crítica nem elogio evidentes.",
  },
  {
    term: "Negativo",
    description:
      "Tom desfavorável: reclamação, insatisfação, crítica ou oposição em relação ao assunto do relato.",
  },
];

export const SENTIMENT_POLARITY_LEGEND_TITLE = "O que significa positivo, neutro e negativo?";

export const SENTIMENT_POLARITY_PREPEND_SECTION = {
  title: SENTIMENT_POLARITY_LEGEND_TITLE,
  items: SENTIMENT_POLARITY_LEGENDS,
} as const;

export const CHART_PARAMETER_LEGENDS = {
  volumeTimeSeries: [
    {
      term: "Novos relatos",
      description: "Quantos relatos foram abertos em cada dia ou semana.",
    },
    {
      term: "Resolvidos",
      description: "Quantos relatos foram encerrados no mesmo intervalo.",
    },
    {
      term: "Eixo horizontal",
      description: "Divide o período em dias (7 ou 30) ou em semanas (90 dias ou ano).",
    },
  ],
  volumeByCategory: [
    {
      term: "Eixo vertical",
      description: "Quantidade de relatos em cada categoria (Mobilidade, Saúde, etc.).",
    },
    {
      term: "Barras",
      description: "Quanto maior a barra, maior o número de relatos naquele tema.",
    },
  ],
  statusPipeline: [
    {
      term: "Etapas",
      description: "Em qual fase do atendimento cada relato está (triagem, encaminhado, etc.).",
    },
    {
      term: "Quantidade",
      description: "Número de relatos em cada etapa no período filtrado.",
    },
  ],
  sentimentDistribution: [
    {
      term: "Percentual no gráfico",
      description:
        "Cada fatia mostra quantos relatos do recorte foram classificados naquela polaridade.",
      formula:
        "Relatos na faixa ÷ total de relatos com classificação × 100. Positivo + neutro + negativo = 100%.",
    },
  ],
  sentimentByRegion: [
    {
      term: "Fatias por zona",
      description:
        "Cada pizza mostra a divisão entre relatos positivos, neutros e negativos naquela região.",
      formula: "Relatos na polaridade ÷ total da zona × 100. As três fatias somam 100%.",
    },
    {
      term: "Cores",
      description:
        "Verde = positivo, cinza = neutro, vermelho = negativo (mesma legenda em todas as zonas).",
    },
  ],
  sentimentByCategory: [
    {
      term: "Índice positivo",
      description: "De 0 a 100%: o quanto os relatos daquela categoria são favoráveis.",
      formula: "Relatos positivos da categoria ÷ total da categoria × 100.",
    },
    {
      term: "Barras",
      description: "Permite comparar categorias no mesmo período e região.",
    },
  ],
  patternsRanking: [
    {
      term: "Ocorrências",
      description: "Quantas vezes aquele tema apareceu nos relatos do recorte.",
    },
    {
      term: "Tendência",
      description: "Se o tema cresceu ou caiu em relação ao período anterior.",
      formula:
        "(Quantidade agora − quantidade no período anterior) ÷ quantidade no período anterior × 100. Ex.: +10% = 10% a mais que antes.",
    },
  ],
  patternsByRegion: [
    {
      term: "Padrão predominante",
      description: "Tema mais recorrente nos relatos daquela zona no período filtrado.",
    },
    {
      term: "Temas secundários",
      description: "Outros assuntos frequentes na mesma região, abaixo do padrão principal.",
    },
    {
      term: "Lista por região",
      description:
        "Complementa o ranking geral do gráfico: cada cartão resume o recorte territorial da zona.",
    },
  ],
  correlationScatter: [
    {
      term: "Eixo X — Volume",
      description: "Quantidade de relatos na região.",
    },
    {
      term: "Eixo Y — Tempo médio",
      description: "Média de horas até a primeira resposta na região.",
      formula:
        "Soma do tempo de resposta de todos os relatos da região ÷ quantidade de relatos da região.",
    },
    {
      term: "Tamanho da bolha (sentimento)",
      description:
        "Reflete o percentual de relatos positivos na região. Neutro e negativo não entram neste tamanho — veja as definições de polaridade abaixo.",
      formula:
        "Relatos positivos da região ÷ total classificados na região × 100. Bolha maior = maior parcela positiva.",
    },
  ],
  territoryHeatmap: [
    {
      term: "Valor por zona",
      description:
        "Número bruto da métrica ativa no mapa (usuários, avaliações, demanda agregada ou minutos de espera).",
    },
    {
      term: "Intensidade (cor)",
      description:
        "Peso da zona em relação à que tem o maior valor na métrica selecionada — não é população nem área km².",
      formula:
        "Valor da zona ÷ maior valor entre as zonas exibidas × 100. A zona líder fica em 100%.",
    },
    {
      term: "Cor de fundo",
      description: "Ajuda a comparar zonas de relance.",
      formula: "Quanto maior a intensidade (%), mais escuro o tom de vinho no card.",
    },
  ],
  territoryRanking: [
    {
      term: "Volume",
      description: "Mesmo número do mapa de calor, em formato de ranking em barras.",
    },
    {
      term: "Eixo",
      description: "Zonas da capital (Centro, Zona Norte, etc.) no recorte escolhido.",
    },
  ],
  aiSummaryCards: [
    {
      term: "Volume (recorte)",
      description: "Total de relatos com período, região e categoria já aplicados.",
    },
    {
      term: "Padrão em destaque",
      description: "O assunto que mais apareceu nos relatos do recorte atual.",
      formula: "É o tema com a maior contagem de ocorrências entre todos os temas listados.",
    },
    {
      term: "Origem dos dados",
      description: "Fontes agregadas de relatos e indicadores operacionais.",
    },
  ],
  aiInsights: [
    {
      term: "Padrão",
      description: "Algo que se destaca em relação ao comportamento usual.",
      formula:
        "Sinaliza quando o valor atual está bem acima da média dos últimos 30 dias (pico fora do comum).",
    },
    {
      term: "Anomalia",
      description: "Mudança forte que merece atenção (volume ou tempo de resposta).",
      formula:
        "Compara com o esperado: se a diferença passar de um limite (ex.: tempo de resposta 40% pior que o habitual), aparece como anomalia.",
    },
    {
      term: "Previsão",
      description: "Estimativa para a próxima semana com base na tendência recente.",
      formula:
        "Média das últimas semanas ajustada pela tendência. Ex.: +12% ≈ cerca de 12% a mais relatos que a média recente.",
    },
  ],
  executiveChart: [
    {
      term: "Valor da barra",
      description: "Muda conforme o indicador escolhido no topo.",
      formula:
        "Volume: conta relatos. Tempo: média de horas até responder. Sentimento: % de positivos. Padrões: quantidade de temas repetidos.",
    },
    {
      term: "Drill-down",
      description:
        "Clique na barra para ver o detalhe do território ou tema, sem mudar os filtros.",
    },
    {
      term: "Troca de métrica (gráfico territorial)",
      description:
        "Altera volume, tempo, sentimento ou padrões no gráfico de região sem mudar o recorte. O drill-across categoria × demografia está na seção de cruzamento abaixo.",
    },
  ],
} as const satisfies Record<string, ParameterLegendItem[]>;

const executiveKpiOrder: AnalyticsMetric[] = ["volume", "response_time", "sentiment", "patterns"];

/** Lista ordenada dos quatro KPIs oficiais (dashboard executivo e referência RN-ANL-004). */
export const EXECUTIVE_KPI_LEGENDS_LIST: ParameterLegendItem[] = executiveKpiOrder.map(
  (m) => KPI_PARAMETER_LEGENDS[m],
);

export function kpiLegendHint(metric: AnalyticsMetric): string {
  const item = KPI_PARAMETER_LEGENDS[metric];
  const formulaPart = item.formula ? ` Como calculamos: ${item.formula}` : "";
  return `${item.description}${formulaPart}`;
}

/** Regra de negócio exibida na página Tendências temporais (RN-ANL-003). */
export const RN_ANL_003_TRENDS_LEGEND: ParameterLegendItem = {
  term: "RN-ANL-003 — contexto do recorte",
  description:
    "Evolução dos indicadores no tempo sempre no recorte dos filtros globais (Período, Região e Categoria). Ao aprofundar dados, trocar visualização ou abrir listagens, o contexto analítico é preservado.",
};

/** Métricas oficiais do mapa de calor (RN-MAP-001). */
export const HEATMAP_METRICS = [
  { id: "uso", label: "Densidade de uso" },
  { id: "avaliacoes", label: "Concentração de avaliações" },
  { id: "demanda", label: "Intensidade de demanda" },
  { id: "espera", label: "Tempo médio de espera" },
] as const;

export type HeatmapMetricId = (typeof HEATMAP_METRICS)[number]["id"];

export const HEATMAP_METRIC_LEGENDS: Record<HeatmapMetricId, ParameterLegendItem> = {
  uso: {
    term: "Densidade de uso",
    description:
      "Concentração geográfica de interações com a plataforma em São Paulo: relatos urbanos, avaliações publicadas, visitas a equipamentos e relatos de transporte (quando a fonte inclui transporte).",
    formula:
      "Por célula no mapa (~50 m): soma dos pesos das fontes selecionadas. Manchas mais quentes = mais eventos no período.",
  },
  avaliacoes: {
    term: "Concentração de avaliações",
    description: "Número de avaliações de equipamentos ou serviços registradas em cada região.",
    formula: "Total de avaliações concluídas vinculadas ao território da zona.",
  },
  demanda: {
    term: "Intensidade de demanda",
    description:
      "Volume de relatos (urbanos e/ou transporte) por zona da capital, com tempo médio composto de atendimento para priorização.",
    formula:
      "Por zona: contagem de relatos no período; tempo composto = média ponderada de resolução, primeira resposta e pendência; score de prioridade 0–100.",
  },
  espera: {
    term: "Tempo médio de espera",
    description:
      "Média do tempo de espera informado pelo cidadão nas avaliações de equipamentos, agregada por zona da cidade.",
    formula:
      "Média do wait_time_score (1–5, maior = espera mais longa) por zona, a partir do distrito do equipamento avaliado.",
  },
};

export const EXPORTS_PAGE_LEGEND: ParameterLegendItem = {
  term: "Exportações de dados",
  description:
    "Exportações em CSV, XLS e XLSX com recorte, granularidade, campos e ordenação (RN-EXP-001). Jobs agendados com histórico de execuções (RN-EXP-002).",
};

export const RN_MAP_001_HEATMAP_PAGE_LEGEND: ParameterLegendItem = {
  term: "Quatro métricas territoriais",
  description:
    "Mapas de calor por densidade de uso (eventos georreferenciados), concentração de avaliações, intensidade de demanda (relatos urbanos + transporte) e tempos médios de espera informados nas avaliações de equipamentos. Cada aba traz legenda e tooltips nos parâmetros.",
};

/** HU-4.1 — Filtro “Fonte de dados” do painel de densidade de uso. */
export const USAGE_HEATMAP_SOURCE_FILTER_LEGEND: ParameterLegendItem = {
  term: "Fonte de dados",
  description:
    "Define quais tipos de interação entram no mapa. O padrão “Uso total” agrega todas as fontes disponíveis na mesma camada de calor.",
};

export const USAGE_HEATMAP_SOURCE_OPTIONS_LEGENDS: ParameterLegendItem[] = [
  {
    term: "Uso total (todas as fontes)",
    description:
      "Relatos urbanos, avaliações, visitas a equipamentos e transporte (por zona) no mesmo mapa.",
  },
  {
    term: "Apenas relatos (urbano + avaliações)",
    description:
      "Exclui visitas e transporte; útil para comparar demandas registradas como relato ou avaliação.",
  },
  {
    term: "Relatos urbanos",
    description:
      "Relatos de problemas urbanos com coordenada ou endereço dentro dos limites de São Paulo.",
  },
  {
    term: "Avaliações de serviços",
    description: "Avaliações publicadas vinculadas a equipamentos com localização conhecida.",
  },
  {
    term: "Visitas a equipamentos",
    description:
      "Registros de visita presencial a UBS, escolas e demais equipamentos georreferenciados.",
  },
  {
    term: "Relatos de transporte",
    description:
      "Relatos sem GPS direto: contagem por zona da capital (centroide da zona) a partir do bairro ou local informado.",
  },
];

/** HU-4.1 — Filtro de período do mapa de densidade. */
export const USAGE_HEATMAP_PERIOD_LEGEND: ParameterLegendItem = {
  term: "Período",
  description: "Janela de tempo dos eventos exibidos no mapa.",
  formula:
    "Inclui registros com data de criação a partir de hoje menos 7, 30 ou 90 dias, ou 12 meses (365 dias).",
};

/** HU-4.1 — Camada Google Maps HeatmapLayer e rodapé do painel. */
export const USAGE_HEATMAP_LAYER_LEGENDS: ParameterLegendItem[] = [
  {
    term: "Intensidade no mapa (cor)",
    description:
      "Camada de calor: tons frios (azul/verde) = poucos eventos na área; tons quentes (amarelo/laranja/vermelho) = maior concentração no recorte.",
    formula:
      "Peso da célula ÷ maior peso entre as células carregadas — escala normalizada ao atualizar dados ou filtros.",
  },
  {
    term: "Agregação por célula",
    description:
      "Coordenadas próximas (~50 m) são agrupadas. Vários eventos no mesmo ponto somam peso e aumentam o brilho da mancha.",
  },
  {
    term: "Contagem no rodapé",
    description:
      "“Células no mapa” = pontos geográficos únicos após agregação. Os badges Urbano/Avaliações/Visitas/Transporte mostram quantas células cada fonte contribuiu.",
  },
  {
    term: "Limite territorial",
    description:
      "Somente coordenadas dentro do retângulo de São Paulo (capital) entram na visualização.",
  },
];

/** Lista completa para legenda expandida e tooltip “?” do painel HU-4.1. */
export function usageHeatmapPanelLegends(): ParameterLegendItem[] {
  return [
    HEATMAP_METRIC_LEGENDS.uso,
    USAGE_HEATMAP_SOURCE_FILTER_LEGEND,
    ...USAGE_HEATMAP_SOURCE_OPTIONS_LEGENDS,
    USAGE_HEATMAP_PERIOD_LEGEND,
    ...USAGE_HEATMAP_LAYER_LEGENDS,
  ];
}

/** Período com opção “Tudo” (abas avaliações, demanda, espera). */
export const HEATMAP_EXTENDED_PERIOD_LEGEND: ParameterLegendItem = {
  term: "Período",
  description: "Janela de tempo dos dados no mapa e nos cartões resumo.",
  formula: "Últimos 30 ou 90 dias, 12 meses, ou “Tudo” sem data inicial de corte.",
};

/** HU-4.2 — Concentração de avaliações. */
export const RATINGS_HEATMAP_SERVICE_TYPE_LEGEND: ParameterLegendItem = {
  term: "Tipo de serviço",
  description:
    "Filtra avaliações pelo tipo de equipamento (UBS, escola, etc.). “Todos” mantém todos os tipos com coordenada válida em São Paulo.",
};

export const RATINGS_HEATMAP_MAP_LEGENDS: ParameterLegendItem[] = [
  {
    term: "Camada de fundo (calor)",
    description:
      "Mancha de densidade onde há mais avaliações publicadas, independentemente da nota média.",
  },
  {
    term: "Clique na bolha",
    description:
      "Abre o detalhe do equipamento: comentários, distribuição de estrelas e dimensões com pior nota.",
  },
  {
    term: "Polarização",
    description:
      "Percentual de avaliações extremas (1–2★ e 4–5★) em relação ao total do equipamento — alto índice indica opiniões divididas.",
    formula: "(Avaliações 1–2★ + 4–5★) ÷ total de avaliações do equipamento × 100.",
  },
  {
    term: "Ranking polarizado",
    description:
      "Lista equipamentos com maior índice de polarização no recorte; o limiar mínimo de avaliações adapta-se (5→3→2→1) para sempre exibir resultados quando possível.",
  },
  {
    term: "Cartões resumo",
    description:
      "Equipamentos distintos, total de avaliações, média geral de estrelas e polarização média do recorte filtrado.",
  },
];

export function ratingsConcentrationPanelLegends(): ParameterLegendItem[] {
  return [
    HEATMAP_METRIC_LEGENDS.avaliacoes,
    HEATMAP_EXTENDED_PERIOD_LEGEND,
    RATINGS_HEATMAP_SERVICE_TYPE_LEGEND,
    ...RATINGS_HEATMAP_MAP_LEGENDS,
  ];
}

/** HU-4.3 — Intensidade de demanda. */
export const INTENSITY_HEATMAP_SCOPE_LEGEND: ParameterLegendItem = {
  term: "Tipo de relato",
  description: "Define se entram relatos urbanos, de transporte ou ambos na agregação por zona.",
};

export const INTENSITY_DEMAND_MAP_LEGENDS: ParameterLegendItem[] = [
  {
    term: "Tempo médio composto",
    description:
      "Combina tempo até resolução, primeira resposta e tempo em aberto para relatos da zona.",
    formula:
      "50% resolução + 30% primeira resposta + 20% pendente (pesos redistribuídos se alguma parcela faltar).",
  },
  {
    term: "Score de prioridade",
    description:
      "Ranking 0–100 que cruza volume alto com tempo de espera alto — usado na lista abaixo do mapa.",
    formula: "Normalização do volume e do tempo médio da zona em relação ao máximo do recorte.",
  },
  {
    term: "Clique na zona",
    description: "Destaca volume, tempo médio, score e percentual resolvido da zona selecionada.",
  },
  {
    term: "Cartões resumo",
    description:
      "Zonas com dados, total de relatos, tempo médio geral e zona com pior indicador composto.",
  },
];

export function intensityDemandPanelLegends(): ParameterLegendItem[] {
  return [
    HEATMAP_METRIC_LEGENDS.demanda,
    HEATMAP_EXTENDED_PERIOD_LEGEND,
    INTENSITY_HEATMAP_SCOPE_LEGEND,
    ...INTENSITY_DEMAND_MAP_LEGENDS,
  ];
}

/** Tempo médio de espera (avaliações). */
export const WAIT_TIME_HEATMAP_MAP_LEGENDS: ParameterLegendItem[] = [
  {
    term: "wait_time_score",
    description:
      "Campo preenchido pelo cidadão na avaliação do equipamento (escala 1–5). Valores maiores representam faixas de espera mais longas no app.",
  },
  {
    term: "Agregação por zona",
    description:
      "Cada bolha é o centroide de uma zona (Norte, Sul, etc.) a partir do distrito cadastrado do equipamento.",
    formula: "Média aritmética dos wait_time_score das avaliações com o campo preenchido na zona.",
  },
  {
    term: "Cartões resumo",
    description:
      "Total de avaliações com tempo informado, média geral do recorte e zona com maior tempo médio.",
  },
];

export function waitTimeHeatmapPanelLegends(): ParameterLegendItem[] {
  return [
    HEATMAP_METRIC_LEGENDS.espera,
    HEATMAP_EXTENDED_PERIOD_LEGEND,
    ...WAIT_TIME_HEATMAP_MAP_LEGENDS,
  ];
}

export function heatmapMetricLabel(metricId: string): string {
  return HEATMAP_METRICS.find((m) => m.id === metricId)?.label ?? metricId;
}

export const SECTION_CHART_LEGENDS = {
  volumeTimeSeries: CHART_PARAMETER_LEGENDS.volumeTimeSeries,
  volumeByCategory: CHART_PARAMETER_LEGENDS.volumeByCategory,
  metricTrends: [
    KPI_PARAMETER_LEGENDS.volume,
    KPI_PARAMETER_LEGENDS.sentiment,
    KPI_PARAMETER_LEGENDS.patterns,
    KPI_PARAMETER_LEGENDS.response_time,
    {
      term: "Eixo temporal",
      description: "Pontos alinhados ao período dos filtros globais (dias ou semanas).",
    },
  ],
  territoryHeatmap: CHART_PARAMETER_LEGENDS.territoryHeatmap,
  territoryRanking: CHART_PARAMETER_LEGENDS.territoryRanking,
  classificationByCategory: [
    {
      term: "Acurácia por categoria",
      description: "Percentual de classificações do modelo confirmadas por revisão humana.",
      formula: "Acertos ÷ (acertos + correções) × 100, por tema do relato.",
    },
    {
      term: "Barras",
      description: "Compara categorias no mesmo recorte de período e região.",
    },
  ],
  classificationTrend: [
    {
      term: "Acurácia semanal",
      description: "Evolução da taxa de acerto do modelo ao longo das semanas.",
    },
    {
      term: "Escala",
      description: "Eixo vertical limitado entre 60% e 100% para destacar variações.",
    },
  ],
  widgetUsage: [
    {
      term: "Fatias",
      description: "Participação relativa de cada tipo de widget nos painéis salvos.",
    },
  ],
  savedPanelsTrend: [
    {
      term: "Painéis salvos",
      description: "Quantidade acumulada de layouts personalizados por mês.",
    },
  ],
  paineisCanvas: [
    KPI_PARAMETER_LEGENDS.volume,
    {
      term: "Tempo de resposta (h)",
      description: "Média de horas até a primeira resposta no recorte, eixo secundário.",
      formula: KPI_PARAMETER_LEGENDS.response_time.formula,
    },
  ],
  panelBuilderFunnel: [
    {
      term: "Etapas do assistente",
      description: "Percentual de usuários que avançam em cada passo ao criar um painel.",
    },
  ],
  statusPipeline: CHART_PARAMETER_LEGENDS.statusPipeline,
  referralFunnel: [
    {
      term: "Funil operacional",
      description: "Quantidade de encaminhamentos em cada etapa do fluxo.",
    },
    {
      term: "Etapas",
      description: "Recebidos → triagem → enviados → resolvidos no recorte filtrado.",
    },
  ],
  referralTimeline: [
    {
      term: "Criados",
      description: "Novos encaminhamentos abertos por dia.",
    },
    {
      term: "Concluídos",
      description: "Encaminhamentos finalizados no mesmo intervalo.",
    },
  ],
  commissionByTheme: [
    {
      term: "Fila temática",
      description: "Manifestações elegíveis aguardando parecer de comissão parlamentar.",
    },
  ],
  councilMemberQueue: [
    {
      term: "Fila por vereador",
      description:
        "Encaminhamentos ativos atribuídos a cada parlamentar, com afinidade temática ao relato.",
    },
  ],
  notificationStats: [
    {
      term: "Enviadas",
      description: "Notificações disparadas pelo painel no período.",
    },
    {
      term: "Entregues",
      description: "Confirmação de entrega ao canal (e-mail ou push).",
    },
    {
      term: "Falhas",
      description: "Tentativas sem entrega — exige retry ou correção de destino.",
    },
  ],
  exportByFormat: [
    {
      term: "Formato",
      description: "Tipo de arquivo gerado na exportação (CSV, planilha, PDF).",
    },
  ],
  exportTimeline: [
    {
      term: "Jobs agendados",
      description: "Execuções automáticas de exportação por semana.",
    },
  ],
  correctionsByStatus: [
    {
      term: "Status da moderação",
      description: "Situação de cada sugestão de correção cadastral enviada por cidadãos.",
    },
  ],
  accessibilityAdoption: [
    {
      term: "Adoção de recursos",
      description: "Uso relativo de opções de acessibilidade no painel.",
    },
  ],
  moduleAccess: [
    {
      term: "Acessos por módulo",
      description: "Volume de consultas a cada área do painel administrativo.",
    },
  ],
  auditByDay: [
    {
      term: "Eventos de auditoria",
      description: "Registros append-only por dia (login, export, alteração de perfil, etc.).",
    },
  ],
  usersByRole: [
    {
      term: "Perfis RBAC",
      description: "Distribuição de usuários por papel (gestor, analista, admin, leitura).",
    },
  ],
} as const satisfies Record<string, ParameterLegendItem[]>;

export function heatmapChartLegend(metricId: string): ParameterLegendItem[] {
  const metric = HEATMAP_METRIC_LEGENDS[metricId as HeatmapMetricId];
  return metric
    ? [metric, ...CHART_PARAMETER_LEGENDS.territoryHeatmap]
    : [...CHART_PARAMETER_LEGENDS.territoryHeatmap];
}

export const CLASSIFICATION_ACCURACY_PAGE_LEGEND: ParameterLegendItem = {
  term: "Acurácia da classificação",
  description:
    "Monitoramento do ciclo de feedback do classificador automático: precisão no recorte, fila de revisão humana e amostras com confirmação ou correção para retreino do modelo.",
};

export const CLASSIFICATION_KPI_LEGENDS = {
  precision: {
    term: "Precisão global",
    description: "Taxa média de acerto do classificador no recorte atual.",
    formula: "Predições corretas ÷ total de predições revisadas × 100.",
  },
  pending: {
    term: "Predições pendentes",
    description: "Classificações automáticas aguardando revisão humana.",
  },
  feedback: {
    term: "Amostras com feedback",
    description: "Relatos com correção ou confirmação registrada para retreino.",
  },
} as const satisfies Record<string, ParameterLegendItem>;

export const URBAN_REPORTS_MANAGEMENT_PAGE_LEGEND: ParameterLegendItem = {
  term: "Gestão de relatos urbanos",
  description:
    "Central operacional para priorizar relatos na fila, encaminhar à comissão temática ou vereador responsável e acompanhar cada etapa até a conclusão. A triagem é obrigatória antes do encaminhamento; todas as mudanças de status ficam na linha do tempo do protocolo. Os indicadores e a lista seguem o recorte de período, região e categoria definido no topo da página.",
};

export const REPORTS_WORKFLOW_KPI_LEGENDS = {
  awaitingTriage: {
    term: "Aguardando triagem",
    description: "Relatos recebidos que ainda aguardam definição de prioridade.",
  },
  triaged: {
    term: "Triados",
    description: "Prioridade definida; prontos para encaminhamento à comissão.",
  },
  inReferral: {
    term: "Em encaminhamento",
    description: "Enviados ou em análise pela comissão ou vereador.",
  },
  resolved: {
    term: "Concluídos",
    description: "Fluxo encerrado com resposta registrada ao cidadão.",
  },
} as const satisfies Record<string, ParameterLegendItem>;

export const EXECUTIVE_DASHBOARD_PAGE_LEGEND: ParameterLegendItem = {
  term: "Dashboard executivo",
  description:
    "Visão executiva consolidada. Use o recorte no topo para período, região e categoria; a trilha de navegação para aprofundar o território; os cartões de indicadores para trocar a métrica do gráfico territorial; e o heatmap de cruzamento para drill-across entre tipo de problema e perfil demográfico.",
};

export const EXECUTIVE_CROSS_ANALYTICS_LEGENDS: ParameterLegendItem[] = [
  {
    term: "Linha e coluna",
    description:
      "Escolha duas dimensões (ex.: Categoria × Gênero). O padrão atende a HU-3.4 — tipo de problema por perfil demográfico.",
  },
  {
    term: "Célula do heatmap",
    description:
      "Cor mais escura = mais relatos naquele cruzamento. Clique para listar os relatos (painel lateral).",
  },
  {
    term: "Cruzamento vs. gráfico territorial",
    description:
      "O heatmap cruza dimensões analíticas. O gráfico de barras acima detalha por nível territorial (região → bairro → rua).",
  },
  {
    term: "Recorte global",
    description:
      "Período, região e categoria do topo do dashboard aplicam-se ao heatmap e à lista ao clicar na célula (urbano, transporte e avaliações).",
  },
];

export const URBAN_REPORTS_ANALYTICS_PAGE_LEGEND: ParameterLegendItem = {
  term: "Análise de relatos urbanos",
  description:
    "Indicadores e drills sobre volume, sentimento e padrões de relatos urbanos. Use o recorte no topo (período, categoria e status); a aba Território explora zonas sem filtro global de região. Para avaliações de equipamento use o menu dedicado; para audiências, Audiências públicas.",
};

export const EQUIPMENT_RATINGS_PAGE_LEGEND: ParameterLegendItem = {
  term: "Avaliações de equipamentos",
  description:
    "Registros estruturados de avaliação de serviços e equipamentos públicos (nota, tempo de espera, vínculo ao equipamento). Distinto de relatos urbanos abertos pelo cidadão.",
};

export const PUBLIC_HEARINGS_PAGE_LEGEND: ParameterLegendItem = {
  term: "Audiências públicas",
  description:
    "Inscrições e manifestações em audiências da Câmara. Fluxo, vagas e status de participação — separado de relatos urbanos e de avaliações de equipamento.",
};

export const EQUIPMENT_RATINGS_KPI_LEGENDS = {
  total: {
    term: "Total de avaliações",
    description: "Avaliações concluídas no recorte filtrado.",
  },
  pending: {
    term: "Pendentes de moderação",
    description: "Avaliações aguardando revisão antes de entrar nos indicadores oficiais.",
  },
  avgWait: {
    term: "Tempo médio de espera",
    description:
      "Média dos tempos informados pelo cidadão nas avaliações com esse campo preenchido.",
    formula: "Soma dos minutos informados ÷ quantidade de avaliações com tempo preenchido.",
  },
} as const satisfies Record<string, ParameterLegendItem>;

export const PUBLIC_HEARINGS_KPI_LEGENDS = {
  open: {
    term: "Audiências abertas",
    description:
      "Audiências agendadas no recorte com inscrições abertas e data de hoje ou futura (mesmo critério do app cidadão).",
  },
  registrations: {
    term: "Inscrições confirmadas",
    description: "Cidadãos com vaga confirmada para participar.",
  },
  statements: {
    term: "Manifestações",
    description: "Textos ou pedidos de fala enviados para audiências no recorte.",
  },
} as const satisfies Record<string, ParameterLegendItem>;

export const REFERRALS_PAGE_LEGEND: ParameterLegendItem = {
  term: "Análise de encaminhamentos",
  description:
    "Visão unificada do encaminhamento: indicadores do fluxo, filas por comissão temática e por vereador. Para triar e registrar ações em cada protocolo, use Gestão de relatos. Respeita o recorte global de período, região e categoria.",
};

export const REFERRAL_KPI_LEGENDS = {
  total: { term: "Total", description: "Encaminhamentos no recorte (todas as etapas)." },
  pending: { term: "Pendentes", description: "Aguardando triagem ou envio." },
  sent: { term: "Enviados", description: "Encaminhados à comissão ou unidade responsável." },
  resolved: { term: "Resolvidos", description: "Encerrados com resposta ao cidadão." },
} as const satisfies Record<string, ParameterLegendItem>;
