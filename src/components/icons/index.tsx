/**
 * Ícones SVG customizados (substituição a emojis - task 2.2).
 * Exporta componentes e mapeamentos para uso em toda a UI.
 */
import {
  Check,
  Search,
  MapPin,
  Bus,
  FileText,
  Star,
  Newspaper,
  User,
  Mic,
  Building2,
  Bell,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Calendar,
  Clock,
  Megaphone,
  PartyPopper,
  BookOpen,
  TreePine,
  Landmark,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SERVICE_TYPE_ICONS, getServiceTypeMarkerChar } from "./serviceTypeIcons";
import type { LucideIcon } from "lucide-react";

export {
  SERVICE_TYPE_ICONS,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPE_MAP_COLORS,
  SERVICE_BALLOON_MARKER_LAYOUT,
  getServiceTypeMarkerChar,
  getServiceTypeBalloonIconUrl,
  getServiceTypeLabel,
  getServiceTypeMapColor,
} from "./serviceTypeIcons";
export * from "./ui-icons";

/** Ícones para categorias de filtro da busca (id → componente). */
export const FILTER_CATEGORY_ICONS: Record<string, LucideIcon> = {
  all: Search,
  servico: MapPin,
  transporte: Bus,
  relato_urbano: FileText,
  recomendacao: Star,
  noticia: Newspaper,
  vereador: User,
  audiencia: Mic,
};

/** Ícones para tipos de notificação (substituição a emojis). */
export const NOTIFICATION_TYPE_ICONS: Record<string, LucideIcon> = {
  legislativa: FileText,
  servico: Building2,
  transporte: Bus,
  urbano: Building2,
  new_urban_report: Building2,
  new_transport_report: Bus,
  new_user: User,
  critical_report: AlertCircle,
  status_change: RefreshCw,
  system_alert: Settings,
  report_received: CheckCircle,
  report_in_analysis: Search,
  report_resolved: PartyPopper,
  report_rejected: XCircle,
  referral: Mail,
  referral_update: RefreshCw,
  audiencia: Mic,
  audiencia_inscricao: CheckCircle,
  audiencia_lembrete_d1: Calendar,
  audiencia_lembrete_1h: Clock,
  servico_nova_avaliacao: Star,
  transporte_linha_relato: Bus,
  transporte_linha_padrao: TrendingUp,
  info: Bell,
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
  general: Megaphone,
};

/** Ícones para interesses do usuário (onboarding / perfil). */
export const INTEREST_ICONS: Record<string, LucideIcon> = {
  legislativo: FileText,
  mobilidade: Bus,
  cultura: Landmark,
  saude: Building2,
  educacao: BookOpen,
  meio_ambiente: TreePine,
  habitacao: Building2,
  economia: FileText,
};

const defaultSize = 24;

/** Ícone de tipo de serviço (UBS, escola, etc.) para uso em cards e listas. */
export function ServiceTypeIcon({
  serviceType,
  className,
  size = defaultSize,
}: {
  serviceType: string;
  className?: string;
  size?: number;
}) {
  const Icon = SERVICE_TYPE_ICONS[serviceType] ?? SERVICE_TYPE_ICONS.other;
  return <Icon className={cn("shrink-0", className)} size={size} aria-hidden />;
}

/** Ícone de confirmação (substitui "✓" em texto). */
export function IconCheck({
  className,
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Check
      className={cn("shrink-0 text-green-600", className)}
      size={size}
      aria-hidden
    />
  );
}
