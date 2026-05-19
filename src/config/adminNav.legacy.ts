import {
  BarChart3,
  Bell,
  BookOpen,
  Download,
  FileText,
  LayoutDashboard,
  Send,
  Settings,
  Users,
} from 'lucide-react';
import type { NavSection } from '@/config/adminNav.types';

/** Menu plano legado — rollback via feature flag. */
export const adminNavSectionsLegacy: NavSection[] = [
  {
    title: 'Inteligência',
    items: [
      { to: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
      { to: '/admin/analytics/general', label: 'Análise de relatos', Icon: BarChart3 },
    ],
  },
  {
    title: 'Operação',
    items: [
      { to: '/admin/reports', label: 'Relatos', Icon: FileText },
      { to: '/admin/referrals', label: 'Encaminhamentos', Icon: Send },
    ],
  },
  {
    title: 'Governança',
    items: [
      { to: '/admin/notifications', label: 'Alertas', Icon: Bell },
      { to: '/admin/exports', label: 'Exportações', Icon: Download },
      { to: '/admin/docs/overview', label: 'Documentação', Icon: BookOpen },
      {
        to: '/admin/users',
        label: 'Usuários',
        Icon: Users,
        adminOnly: true,
      },
      {
        to: '/admin/settings/accessibility',
        label: 'Configurações',
        Icon: Settings,
        adminOnly: true,
      },
    ],
  },
];
