import type { ConfigEnvironment, EnvironmentConfigBundle } from '@/types/systemConfig';

const promptTemplates = [
  {
    id: 'tpl-assistente-relatos',
    name: 'Assistente — triagem de relatos',
    description: 'Template padrão para classificação e encaminhamento inicial.',
    body: `Você é o assistente institucional da Câmara na Mão.
Contexto: {{regiao}} | Categoria: {{categoria}}
Regras: prazo máximo de resposta {{prazo_horas}}h; tom {{tom_institucional}}.
Priorize RN-REL-001 (triagem antes de encaminhamento).`,
    variables: [
      { key: 'regiao', label: 'Região', example: 'Zona Sul', required: true },
      { key: 'categoria', label: 'Categoria', example: 'Saúde', required: true },
      { key: 'prazo_horas', label: 'Prazo (horas)', example: '48', required: true },
      { key: 'tom_institucional', label: 'Tom', example: 'acolhedor', required: false },
    ],
  },
  {
    id: 'tpl-avaliacao-servico',
    name: 'Assistente — avaliação de serviços',
    description: 'Conversação guiada para avaliação de equipamentos públicos.',
    body: `Conduza avaliação do serviço {{tipo_servico}} em {{bairro}}.
Limite: {{limite_avaliacoes_dia}} avaliação(ões) por dia por cidadão.
Dimensões: espera, atendimento, infraestrutura, limpeza.`,
    variables: [
      { key: 'tipo_servico', label: 'Tipo de serviço', example: 'UBS', required: true },
      { key: 'bairro', label: 'Bairro', example: 'Sé', required: true },
      { key: 'limite_avaliacoes_dia', label: 'Limite diário', example: '1', required: true },
    ],
  },
];

const production: EnvironmentConfigBundle = {
  promptTemplates,
  rollbackPolicy: {
    enabled: true,
    maxAccuracyDropPct: 3,
    observationHours: 24,
  },
  aiVersions: [
    {
      id: 'ai-prod-1',
      version: '2026.05.1',
      status: 'active',
      templateId: 'tpl-assistente-relatos',
      templateName: 'Assistente — triagem de relatos',
      modelId: 'gpt-4o-mini',
      body: promptTemplates[0].body,
      variables: ['regiao', 'categoria', 'prazo_horas', 'tom_institucional'],
      accuracyPct: 91.2,
      publishedAt: '2026-05-10T14:00:00Z',
      publishedBy: 'bruno@exemplo.camara.sp.gov.br',
    },
    {
      id: 'ai-prod-2',
      version: '2026.05.2-draft',
      status: 'draft',
      templateId: 'tpl-assistente-relatos',
      templateName: 'Assistente — triagem de relatos',
      modelId: 'gpt-4o-mini',
      body: promptTemplates[0].body.replace('acolhedor', 'formal e objetivo'),
      variables: ['regiao', 'categoria', 'prazo_horas', 'tom_institucional'],
      accuracyPct: null,
      publishedAt: null,
      publishedBy: null,
    },
    {
      id: 'ai-prod-0',
      version: '2026.04.3',
      status: 'archived',
      templateId: 'tpl-assistente-relatos',
      templateName: 'Assistente — triagem de relatos',
      modelId: 'gpt-4o-mini',
      body: promptTemplates[0].body,
      variables: ['regiao', 'categoria', 'prazo_horas'],
      accuracyPct: 89.8,
      publishedAt: '2026-04-28T09:00:00Z',
      publishedBy: 'bruno@exemplo.camara.sp.gov.br',
    },
  ],
  parameters: [
    {
      key: 'rating.cooldown_hours',
      label: 'Intervalo entre avaliações',
      value: 48,
      type: 'number',
      scope: 'global',
      description: 'Horas mínimas entre duas avaliações do mesmo cidadão no mesmo serviço.',
    },
    {
      key: 'rating.daily_limit',
      label: 'Limite diário de avaliações',
      value: 1,
      type: 'number',
      scope: 'global',
      description: 'Máximo de avaliações por cidadão por dia.',
    },
    {
      key: 'reports.auto_classify',
      label: 'Classificação automática de relatos',
      value: true,
      type: 'boolean',
      scope: 'global',
      description: 'Ativa sugestão de categoria via IA antes da triagem humana.',
    },
    {
      key: 'notifications.digest_hour',
      label: 'Hora do resumo diário',
      value: '08:00',
      type: 'string',
      scope: 'global',
      description: 'Horário de envio do digest para gestores (fuso America/Sao_Paulo).',
    },
  ],
  integrations: [
    {
      id: 'int-1',
      slug: 'ai-orchestrator',
      displayName: 'Orquestrador de IA',
      source: 'catalog',
      baseUrl: '/functions/v1/ai-orchestrator',
      enabled: true,
      rateLimitPerMinute: 120,
      timeoutMs: 30000,
      healthStatus: 'up',
      lastCheckedAt: '2026-05-18T16:30:00Z',
    },
    {
      id: 'int-2',
      slug: 'fetch-vereadores',
      displayName: 'Vereadores (portal CMSP)',
      source: 'catalog',
      baseUrl: '/functions/v1/fetch-vereadores',
      enabled: true,
      rateLimitPerMinute: 60,
      timeoutMs: 15000,
      healthStatus: 'up',
      lastCheckedAt: '2026-05-18T16:28:00Z',
    },
    {
      id: 'int-3',
      slug: 'legado-relatorios',
      displayName: 'API legada — relatórios internos',
      source: 'custom',
      baseUrl: 'https://homolog.interno.camara.sp.gov.br/api/relatorios/v2',
      enabled: false,
      rateLimitPerMinute: 30,
      timeoutMs: 20000,
      healthStatus: 'degraded',
      lastCheckedAt: '2026-05-18T15:00:00Z',
    },
  ],
};

const homologation: EnvironmentConfigBundle = {
  ...production,
  rollbackPolicy: { ...production.rollbackPolicy, maxAccuracyDropPct: 5 },
  aiVersions: production.aiVersions.map((v) =>
    v.status === 'active'
      ? { ...v, version: '2026.05.1-hml', accuracyPct: 88.5 }
      : v,
  ),
  integrations: production.integrations.map((i) =>
    i.source === 'custom'
      ? {
          ...i,
          baseUrl: 'https://homolog.interno.camara.sp.gov.br/api/relatorios/v2',
          enabled: true,
          healthStatus: 'up' as const,
        }
      : i,
  ),
};

/** Valores iniciais de configuração institucional (sem tabela Supabase dedicada ainda). */
export const defaultConfigByEnvironment: Record<ConfigEnvironment, EnvironmentConfigBundle> = {
  production,
  homologation,
};
