import {
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  Download,
  FileText,
  Glasses,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  Map,
  Plug,
  PlusCircle,
  ScrollText,
  Settings2,
  Share2,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import type { NavSection } from '@/config/adminNav.types';

/**
 * Menu com submenus — agrupado por afinidade (mapeamento PO).
 */
export const adminNavSectionsDropdown: NavSection[] = [
  {
    title: 'Indicadores e análise',
    groups: [
      {
        id: 'institutional-analytics',
        label: 'Análise institucional',
        Icon: BarChart3,
        items: [
          {
            to: '/admin',
            label: 'Dashboard executivo',
            Icon: LayoutDashboard,
            requiredAnyPermission: ['analytics.view_advanced', 'reports.read'],
          },
          {
            to: '/admin/analytics',
            label: 'Análise de relatos urbanos',
            Icon: BarChart3,
            requiredAnyPermission: ['analytics.view_advanced'],
          },
          {
            to: '/admin/trends',
            label: 'Tendências',
            Icon: TrendingUp,
            requiredAnyPermission: ['analytics.view_advanced'],
          },
          {
            to: '/admin/reports-heatmap',
            label: 'Mapa de calor',
            Icon: Map,
            requiredAnyPermission: ['analytics.view_advanced'],
          },
          {
            to: '/admin/classification-accuracy',
            label: 'Acurácia da classificação',
            Icon: Target,
            requiredAnyPermission: ['analytics.view_advanced'],
          },
        ],
      },
      {
        id: 'custom-dashboards',
        label: 'Painéis personalizados',
        Icon: LayoutGrid,
        items: [
          { to: '/paineis', label: 'Meus painéis', Icon: LayoutGrid },
          { to: '/paineis/avancado', label: 'Painel avançado', Icon: LineChart },
          { to: '/paineis/criar', label: 'Criar painel', Icon: PlusCircle },
        ],
      },
    ],
  },
  {
    title: 'Participação cidadã',
    groups: [
      {
        id: 'urban-reports',
        label: 'Relatos urbanos',
        Icon: FileText,
        items: [
          {
            to: '/admin/reports',
            label: 'Gestão de relatos',
            Icon: FileText,
            requiredAnyPermission: ['reports.read'],
          },
          {
            to: '/admin/referrals',
            label: 'Análise de Encaminhamentos',
            Icon: Share2,
            requiredAnyPermission: ['reports.read', 'gabinete.view'],
          },
        ],
      },
      {
        id: 'equipment-ratings',
        label: 'Avaliações de equipamentos',
        Icon: Star,
        items: [
          {
            to: '/admin/equipment-ratings',
            label: 'Gestão de avaliações',
            Icon: Star,
          },
        ],
      },
      {
        id: 'public-hearings',
        label: 'Audiências públicas',
        Icon: CalendarDays,
        items: [
          {
            to: '/admin/public-hearings',
            label: 'Gestão de audiências',
            Icon: CalendarDays,
          },
        ],
      },
    ],
  },
  {
    title: 'Governança',
    groups: [
      {
        id: 'governance-platform',
        label: 'Plataforma e integrações',
        Icon: Settings2,
        items: [
          { to: '/admin/notifications', label: 'Notificações', Icon: Bell },
          { to: '/admin/exports', label: 'Exportações de dados', Icon: Download },
          {
            to: '/admin/settings/parameters',
            label: 'Parametrização geral',
            Icon: Settings2,
            adminOnly: true,
          },
          {
            to: '/admin/settings/referral-rules',
            label: 'Regras de encaminhamento',
            Icon: Share2,
            adminOnly: true,
          },
          {
            to: '/admin/settings/integrations',
            label: 'Integrações e APIs',
            Icon: Plug,
            adminOnly: true,
          },
          {
            to: '/admin/settings/ai',
            label: 'IA — versionamento',
            Icon: Brain,
            adminOnly: true,
          },
          {
            to: '/admin/settings/accessibility',
            label: 'Acessibilidade (sistema)',
            Icon: Glasses,
            adminOnly: true,
          },
        ],
      },
      {
        id: 'governance-admin',
        label: 'Administração e conformidade',
        Icon: ShieldCheck,
        items: [
          {
            to: '/admin/docs/overview',
            label: 'Documentação',
            Icon: BookOpen,
            requiredAnyPermission: ['reports.read', 'gabinete.view'],
          },
          { to: '/admin/users', label: 'Usuários e perfis', Icon: Users, adminOnly: true },
          { to: '/admin/audit-logs', label: 'Auditoria', Icon: ScrollText, adminOnly: true },
          {
            to: '/admin/service-corrections',
            label: 'Correções de equipamentos',
            Icon: Wrench,
            adminOnly: true,
          },
        ],
      },
    ],
  },
];
