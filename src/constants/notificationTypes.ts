// Tipos padronizados de notificação para o sistema CMSP Connect

export const NOTIFICATION_TYPES = {
  // =========================================
  // Categorias principais (para notification_settings.categories_enabled)
  // =========================================
  legislativa: { 
    label: 'Legislativa', 
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: '📜',
    audience: 'all'
  },
  servico: { 
    label: 'Serviço', 
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    icon: '🏥',
    audience: 'all'
  },
  transporte: { 
    label: 'Transporte', 
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    icon: '🚌',
    audience: 'all'
  },
  urbano: { 
    label: 'Urbano', 
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    icon: '🏙️',
    audience: 'all'
  },
  
  // =========================================
  // Admin/CMS - Tipos específicos para gestores
  // =========================================
  new_urban_report: { 
    label: 'Novo Relato Urbano', 
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    icon: '🏙️',
    audience: 'admin'
  },
  new_transport_report: { 
    label: 'Novo Relato Transporte', 
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    icon: '🚌',
    audience: 'admin'
  },
  new_user: { 
    label: 'Novo Usuário', 
    color: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    icon: '👤',
    audience: 'admin'
  },
  critical_report: { 
    label: 'Relato Crítico', 
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: '🚨',
    audience: 'admin'
  },
  status_change: { 
    label: 'Mudança de Status', 
    color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    icon: '🔄',
    audience: 'admin'
  },
  system_alert: { 
    label: 'Alerta de Sistema', 
    color: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    icon: '⚙️',
    audience: 'admin'
  },

  // =========================================
  // Cidadão - Tipos específicos para usuários
  // =========================================
  report_received: { 
    label: 'Relato Recebido', 
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    icon: '✅',
    audience: 'citizen'
  },
  report_in_analysis: { 
    label: 'Em Análise', 
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: '🔍',
    audience: 'citizen'
  },
  report_resolved: { 
    label: 'Relato Resolvido', 
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    icon: '🎉',
    audience: 'citizen'
  },
  report_rejected: { 
    label: 'Relato Rejeitado', 
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: '❌',
    audience: 'citizen'
  },
  
  // =========================================
  // Tipos compartilhados
  // =========================================
  referral: { 
    label: 'Encaminhamento', 
    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    icon: '📨',
    audience: 'all'
  },
  referral_update: { 
    label: 'Atualização de Encaminhamento', 
    color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    icon: '🔄',
    audience: 'all'
  },
  audiencia: { 
    label: 'Audiência Pública', 
    color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    icon: '🎤',
    audience: 'all'
  },
  
  // Sistema
  info: { 
    label: 'Informação', 
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: 'ℹ️',
    audience: 'all'
  },
  success: { 
    label: 'Sucesso', 
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    icon: '✅',
    audience: 'all'
  },
  warning: { 
    label: 'Aviso', 
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    icon: '⚠️',
    audience: 'all'
  },
  error: { 
    label: 'Erro', 
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: '❌',
    audience: 'all'
  },
  general: { 
    label: 'Geral', 
    color: 'bg-muted text-muted-foreground border-border',
    icon: '📢',
    audience: 'all'
  },
} as const;

// Tipos para Admin
export const ADMIN_NOTIFICATION_TYPES = Object.entries(NOTIFICATION_TYPES)
  .filter(([_, config]) => config.audience === 'admin' || config.audience === 'all')
  .map(([value, config]) => ({ value, ...config }));

// Tipos para Cidadão
export const CITIZEN_NOTIFICATION_TYPES = Object.entries(NOTIFICATION_TYPES)
  .filter(([_, config]) => config.audience === 'citizen' || config.audience === 'all')
  .map(([value, config]) => ({ value, ...config }));

export const NOTIFICATION_PRIORITIES = {
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', color: 'bg-primary/10 text-primary' },
  high: { label: 'Alta', color: 'bg-destructive/10 text-destructive' },
} as const;

export const NOTIFICATION_CATEGORIES = [
  { value: 'legislativa', label: 'Legislativa' },
  { value: 'servico', label: 'Serviços' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'urbano', label: 'Urbano' },
] as const;

// Helper functions
export const getNotificationType = (type: string) => {
  return NOTIFICATION_TYPES[type as keyof typeof NOTIFICATION_TYPES] || NOTIFICATION_TYPES.general;
};

export const getNotificationPriority = (priority: string) => {
  return NOTIFICATION_PRIORITIES[priority as keyof typeof NOTIFICATION_PRIORITIES] || NOTIFICATION_PRIORITIES.normal;
};

// Options for filter selects
export const NOTIFICATION_TYPE_OPTIONS = Object.entries(NOTIFICATION_TYPES).map(([value, config]) => ({
  value,
  label: config.label,
}));

export const NOTIFICATION_PRIORITY_OPTIONS = Object.entries(NOTIFICATION_PRIORITIES).map(([value, config]) => ({
  value,
  label: config.label,
}));

export const NOTIFICATION_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'read', label: 'Lidos' },
  { value: 'unread', label: 'Não lidos' },
];
