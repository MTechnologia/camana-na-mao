/**
 * HU-11.2 — Catálogo de permissões do RBAC.
 *
 * Fonte ÚNICA da verdade do controle de acesso. Tudo que envolve "quem pode
 * o quê" deve consultar este arquivo:
 *
 *   - Hook `usePermission(key)` no front
 *   - Componente `<PermissionGate permission="x">` no front
 *   - Página `/admin/permissions` (matriz read-only)
 *   - Função Postgres `has_permission(uid, key)` no backend (sincronizada
 *     via migration que faz seed da tabela `role_permissions`)
 *
 * Quando uma nova action surgir, adicione aqui PRIMEIRO. A próxima migration
 * sincroniza com o banco.
 *
 * Domínios:
 *   - users     : gestão de usuários e papéis
 *   - reports   : relatos cidadãos (urbanos + transporte)
 *   - triage    : triagem gerencial dos relatos
 *   - exports   : exportação de dados
 *   - analytics : dashboards e análises
 *   - audiences : audiências públicas
 *   - gabinete  : área restrita a vereador/assessor
 *   - system    : configurações e auditoria
 */

import type { UserRole } from "@/hooks/useUserRole";

export type PermissionDomain =
  | "users"
  | "reports"
  | "triage"
  | "exports"
  | "analytics"
  | "audiences"
  | "gabinete"
  | "system";

export interface PermissionDefinition {
  /** Chave canônica usada nos checks (`reports.update_status` etc.) */
  key: string;
  /** Label PT-BR exibido na matriz. */
  label: string;
  /** Descrição curta da capacidade. */
  description: string;
  /** Domínio funcional (para agrupar na UI). */
  domain: PermissionDomain;
  /** Lista de roles que possuem a permissão. */
  roles: UserRole[];
}

export const ALL_ROLES: UserRole[] = [
  "admin",
  "gestor",
  "vereador",
  "assessor",
  "cidadao_engajado",
  "cidadao",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  gestor: "Gestor",
  vereador: "Vereador",
  assessor: "Assessor",
  cidadao_engajado: "Cidadão Engajado",
  cidadao: "Cidadão",
};

/**
 * Definição completa das ~25 permissões.
 * Mantém em sincronia com a migration que faz seed da tabela role_permissions.
 */
export const PERMISSIONS: PermissionDefinition[] = [
  // === USERS ===
  {
    key: "users.read",
    label: "Visualizar usuários",
    description: "Lista usuários, perfis e papéis.",
    domain: "users",
    roles: ["admin"],
  },
  {
    key: "users.invite",
    label: "Convidar usuários",
    description: "Envia convite por email para novo usuário com papel definido.",
    domain: "users",
    roles: ["admin"],
  },
  {
    key: "users.update_role",
    label: "Alterar papel de usuário",
    description: "Muda o papel de um usuário existente.",
    domain: "users",
    roles: ["admin"],
  },
  {
    key: "users.suspend",
    label: "Suspender/reativar conta",
    description: "Bloqueia o login de um usuário sem deletá-lo.",
    domain: "users",
    roles: ["admin"],
  },
  {
    key: "users.delete",
    label: "Deletar usuário",
    description: "Remove permanentemente um usuário do sistema.",
    domain: "users",
    roles: ["admin"],
  },
  {
    key: "users.link_gabinete",
    label: "Vincular a gabinete",
    description: "Associa um usuário a um vereador como vereador/assessor.",
    domain: "users",
    roles: ["admin"],
  },

  // === REPORTS ===
  {
    key: "reports.read",
    label: "Ver relatos",
    description: "Visualiza a lista e detalhes de relatos urbanos e de transporte.",
    domain: "reports",
    roles: ["admin", "gestor", "vereador", "assessor", "cidadao_engajado"],
  },
  {
    key: "reports.update_status",
    label: "Alterar status do relato",
    description: "Marca como Em andamento, Resolvido ou Rejeitado.",
    domain: "reports",
    roles: ["admin", "gestor"],
  },
  {
    key: "reports.add_note",
    label: "Comentar em relato",
    description: "Adiciona observações internas ao relato.",
    domain: "reports",
    roles: ["admin", "gestor", "vereador", "assessor"],
  },
  {
    key: "reports.mark_duplicate",
    label: "Marcar duplicata",
    description: "Vincula um relato como duplicata de outro.",
    domain: "reports",
    roles: ["admin", "gestor"],
  },

  // === TRIAGE ===
  {
    key: "triage.manage",
    label: "Gerenciar triagem",
    description: "Define prioridade, responsável e status do funil de triagem.",
    domain: "triage",
    roles: ["admin", "gestor"],
  },
  {
    key: "triage.view_kanban",
    label: "Ver kanban de triagem",
    description: "Acessa /admin/triagem com a vista agregada do funil.",
    domain: "triage",
    roles: ["admin", "gestor", "assessor"],
  },
  {
    key: "triage.refer_commission",
    label: "Encaminhar a comissão",
    description: "Encaminha relato a uma comissão temática com justificativa.",
    domain: "triage",
    roles: ["admin", "gestor", "assessor"],
  },
  {
    key: "triage.respond_commission",
    label: "Responder encaminhamento",
    description: "Marca encaminhamento como aceito, rejeitado ou processado.",
    domain: "triage",
    roles: ["admin", "gestor"],
  },

  // === EXPORTS ===
  {
    key: "exports.create",
    label: "Criar exportação",
    description: "Gera CSV/XLSX de relatos e dados.",
    domain: "exports",
    roles: ["admin", "gestor", "assessor", "vereador"],
  },
  {
    key: "exports.schedule",
    label: "Agendar exportação",
    description: "Configura exportações recorrentes (diárias, semanais).",
    domain: "exports",
    roles: ["admin", "gestor", "assessor", "vereador"],
  },
  {
    key: "exports.view_logs",
    label: "Ver logs de exportação",
    description: "Acessa o histórico de exportações executadas.",
    domain: "exports",
    roles: ["admin", "gestor", "assessor", "vereador"],
  },

  // === ANALYTICS ===
  {
    key: "analytics.view_advanced",
    label: "Análises avançadas",
    description: "Acessa /admin/analytics com filtros e drill-downs.",
    domain: "analytics",
    roles: ["admin", "gestor", "vereador", "assessor"],
  },
  {
    key: "analytics.view_forecast",
    label: "Ver previsões",
    description: "Acessa /admin/previsoes (forecast de volume).",
    domain: "analytics",
    roles: ["admin", "gestor"],
  },
  {
    key: "analytics.view_anomalies",
    label: "Ver anomalias",
    description: "Acessa /admin/anomalias e roda detecção manual.",
    domain: "analytics",
    roles: ["admin", "gestor"],
  },
  {
    key: "analytics.view_patterns",
    label: "Ver padrões da IA",
    description: "Acessa /admin/padroes e reanalisa padrões.",
    domain: "analytics",
    roles: ["admin", "gestor"],
  },

  // === GABINETE ===
  {
    key: "gabinete.view",
    label: "Acessar gabinete",
    description: "Visualiza dashboard, manifestações e encaminhamentos do gabinete.",
    domain: "gabinete",
    roles: ["vereador", "assessor"],
  },
  {
    key: "gabinete.respond_referrals",
    label: "Responder encaminhamentos do gabinete",
    description: "Marca encaminhamentos de vereador como processados.",
    domain: "gabinete",
    roles: ["vereador", "assessor"],
  },

  // === SYSTEM ===
  {
    key: "system.configure",
    label: "Configurar sistema",
    description: "Acessa /admin/settings (integrações, acessibilidade).",
    domain: "system",
    roles: ["admin"],
  },
  {
    key: "system.view_audit_logs",
    label: "Ver logs de auditoria",
    description: "Acessa /admin/audit-logs com histórico de mudanças.",
    domain: "system",
    roles: ["admin"],
  },
  {
    key: "system.moderate_services",
    label: "Moderar equipamentos",
    description: "Aprova/rejeita correções de equipamentos públicos.",
    domain: "system",
    roles: ["admin"],
  },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as readonly string[];

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

/** Lookup O(1) por chave. */
const PERMISSION_BY_KEY: Record<string, PermissionDefinition> = Object.fromEntries(
  PERMISSIONS.map((p) => [p.key, p]),
);

/** Retorna a definição da permissão ou null se não existe. */
export function getPermission(key: string): PermissionDefinition | null {
  return PERMISSION_BY_KEY[key] ?? null;
}

/**
 * Checa se um conjunto de papéis tem acesso a uma permissão.
 * Lógica core: usada pelo hook usePermission e por testes.
 */
export function rolesGrantPermission(
  roles: UserRole[],
  permissionKey: string,
): boolean {
  const def = PERMISSION_BY_KEY[permissionKey];
  if (!def) return false;
  return roles.some((r) => def.roles.includes(r));
}

/** Agrupa permissões por domínio (para renderizar a matriz). */
export function groupPermissionsByDomain(): Record<PermissionDomain, PermissionDefinition[]> {
  const acc: Record<PermissionDomain, PermissionDefinition[]> = {
    users: [],
    reports: [],
    triage: [],
    exports: [],
    analytics: [],
    audiences: [],
    gabinete: [],
    system: [],
  };
  for (const p of PERMISSIONS) acc[p.domain].push(p);
  return acc;
}

export const DOMAIN_LABELS: Record<PermissionDomain, string> = {
  users: "Usuários",
  reports: "Relatos",
  triage: "Triagem",
  exports: "Exportações",
  analytics: "Analytics",
  audiences: "Audiências",
  gabinete: "Gabinete",
  system: "Sistema",
};
