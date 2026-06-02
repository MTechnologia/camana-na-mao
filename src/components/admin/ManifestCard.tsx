import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Building2,
  Bus,
  Star,
  MessageSquare,
  MoreVertical,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Forward,
  Reply,
  Eye,
  Trash2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UnifiedManifest, ManifestType } from "@/hooks/useReportsAdmin";

interface ManifestCardProps {
  manifest: UnifiedManifest;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onStatusChange: (status: string) => void;
  onViewDetails: () => void;
  onReferral: () => void;
  onDelete: () => void;
}

const typeConfig: Record<
  ManifestType,
  { label: string; shortLabel: string; icon: typeof Building2; color: string }
> = {
  urban: {
    label: "Urbana",
    shortLabel: "Urb",
    icon: Building2,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  transport: {
    label: "Transporte",
    shortLabel: "Transp",
    icon: Bus,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  evaluation: {
    label: "Avaliação",
    shortLabel: "Aval",
    icon: Star,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  feedback: {
    label: "Feedback",
    shortLabel: "Feed",
    icon: MessageSquare,
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
};

const statusConfig: Record<
  string,
  { label: string; shortLabel: string; color: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pendente",
    shortLabel: "Pend.",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    icon: Clock,
  },
  in_progress: {
    label: "Em Andamento",
    shortLabel: "Andam.",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: TrendingUp,
  },
  resolved: {
    label: "Resolvido",
    shortLabel: "Resolv.",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejeitado",
    shortLabel: "Rejeit.",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: XCircle,
  },
  completed: {
    label: "Concluída",
    shortLabel: "Concl.",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle2,
  },
};

const severityConfig: Record<string, { label: string; color: string }> = {
  critical: { label: "Crítica", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  high: { label: "Alta", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  medium: { label: "Média", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  low: { label: "Baixa", color: "bg-green-500/10 text-green-600 border-green-500/20" },
};

// Primary action based on manifest type
const getPrimaryAction = (type: ManifestType) => {
  switch (type) {
    case "urban":
    case "feedback":
      return { label: "Encaminhar", icon: Forward };
    case "transport":
      return { label: "Responder", icon: Reply };
    case "evaluation":
      return { label: "Ver Serviço", icon: ExternalLink };
    default:
      return { label: "Ver", icon: Eye };
  }
};

export const ManifestCard = ({
  manifest,
  isSelected,
  onSelect,
  onStatusChange,
  onViewDetails,
  onReferral,
  onDelete,
}: ManifestCardProps) => {
  const TypeIcon = typeConfig[manifest.type].icon;
  const primaryAction = getPrimaryAction(manifest.type);
  const PrimaryIcon = primaryAction.icon;

  const handlePrimaryAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (manifest.type === "urban" || manifest.type === "feedback") {
      onReferral();
    } else if (manifest.type === "transport") {
      onViewDetails();
    } else if (manifest.type === "evaluation" && manifest.evaluation_data?.service_id) {
      window.open(`/servico/${manifest.evaluation_data.service_id}`, "_blank");
    }
  };

  const protocolCode = manifest.urban_data?.protocol_code || manifest.transport_data?.protocol_code;

  return (
    <div
      className={`group border-b last:border-b-0 hover:bg-muted/50 transition-colors ${isSelected ? "bg-muted/30" : ""}`}
    >
      {/* Desktop (>=1024px): Full horizontal layout */}
      <div className="hidden lg:flex items-center gap-3 p-4">
        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(!!checked)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />

        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0 cursor-pointer" onClick={onViewDetails}>
          <AvatarImage src={manifest.author?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {manifest.author?.full_name?.slice(0, 2).toUpperCase() || "??"}
          </AvatarFallback>
        </Avatar>

        {/* Main Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewDetails}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className={`${typeConfig[manifest.type].color} shrink-0`}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {typeConfig[manifest.type].label}
            </Badge>
            {manifest.severity && severityConfig[manifest.severity] && (
              <Badge
                variant="outline"
                className={`${severityConfig[manifest.severity].color} shrink-0`}
              >
                {severityConfig[manifest.severity].label}
              </Badge>
            )}
            {protocolCode && (
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                {protocolCode}
              </Badge>
            )}
            {manifest.urban_data?.risk_level === "critical" && (
              <Badge variant="destructive" className="shrink-0">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Risco Crítico
              </Badge>
            )}
            {manifest.type === "evaluation" && manifest.evaluation_data && (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0"
              >
                ★ {manifest.evaluation_data.rating_stars}
              </Badge>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="font-medium truncate cursor-help">{manifest.title}</p>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs z-50">
              <p className="text-xs">{manifest.description || "Sem descrição disponível"}</p>
            </TooltipContent>
          </Tooltip>
          <p className="text-xs text-muted-foreground truncate">
            {manifest.urban_data?.neighborhood ||
              manifest.author?.full_name ||
              "Clique para ver detalhes"}
          </p>
        </div>

        {/* Date */}
        <div className="text-right text-xs text-muted-foreground shrink-0 w-14">
          <p>{format(new Date(manifest.created_at), "dd/MM", { locale: ptBR })}</p>
          <p>{format(new Date(manifest.created_at), "HH:mm", { locale: ptBR })}</p>
        </div>

        {/* Inline Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Dropdown */}
          <Select value={manifest.status} onValueChange={(value) => onStatusChange(value)}>
            <SelectTrigger
              className={`w-[130px] h-8 text-xs ${statusConfig[manifest.status]?.color || ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Pendente
                </span>
              </SelectItem>
              <SelectItem value="in_progress">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Em Andamento
                </span>
              </SelectItem>
              <SelectItem value="resolved">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Resolvido
                </span>
              </SelectItem>
              <SelectItem value="rejected">
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Rejeitado
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Kebab Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-50" sideOffset={5}>
              <DropdownMenuItem onClick={onViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              {(manifest.type === "urban" || manifest.type === "feedback") && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onReferral();
                  }}
                >
                  <Forward className="h-4 w-4 mr-2" />
                  Encaminhar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tablet (640px-1023px): Compact horizontal layout */}
      <div className="hidden sm:flex lg:hidden items-center gap-2 p-3">
        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(!!checked)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />

        {/* Avatar - smaller */}
        <Avatar className="h-8 w-8 shrink-0 cursor-pointer" onClick={onViewDetails}>
          <AvatarImage src={manifest.author?.avatar_url || undefined} />
          <AvatarFallback className="text-[10px]">
            {manifest.author?.full_name?.slice(0, 2).toUpperCase() || "??"}
          </AvatarFallback>
        </Avatar>

        {/* Main Content - reduced badges */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewDetails}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Badge
              variant="outline"
              className={`${typeConfig[manifest.type].color} text-[10px] px-1.5 py-0 shrink-0`}
            >
              <TypeIcon className="h-2.5 w-2.5 mr-0.5" />
              {typeConfig[manifest.type].shortLabel}
            </Badge>
            {manifest.severity && severityConfig[manifest.severity] && (
              <Badge
                variant="outline"
                className={`${severityConfig[manifest.severity].color} text-[10px] px-1.5 py-0 shrink-0`}
              >
                {severityConfig[manifest.severity].label}
              </Badge>
            )}
            {manifest.urban_data?.risk_level === "critical" && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                <AlertTriangle className="h-2.5 w-2.5" />
              </Badge>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="font-medium text-sm truncate cursor-help">{manifest.title}</p>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs z-50">
              <p className="text-xs">{manifest.description || "Sem descrição disponível"}</p>
            </TooltipContent>
          </Tooltip>
          <p className="text-[10px] text-muted-foreground truncate">
            {manifest.urban_data?.neighborhood ||
              manifest.author?.full_name ||
              "Toque para detalhes"}
          </p>
        </div>

        {/* Date - compact */}
        <div className="text-right text-[10px] text-muted-foreground shrink-0">
          <p>{format(new Date(manifest.created_at), "dd/MM")}</p>
        </div>

        {/* Status Dropdown - flexible width */}
        <Select value={manifest.status} onValueChange={(value) => onStatusChange(value)}>
          <SelectTrigger
            className={`w-auto min-w-[90px] max-w-[110px] h-8 text-[10px] px-2 ${statusConfig[manifest.status]?.color || ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate">
              {statusConfig[manifest.status]?.shortLabel || manifest.status}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Pendente
              </span>
            </SelectItem>
            <SelectItem value="in_progress">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Em Andamento
              </span>
            </SelectItem>
            <SelectItem value="resolved">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Resolvido
              </span>
            </SelectItem>
            <SelectItem value="rejected">
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Rejeitado
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Kebab Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 z-50" sideOffset={5}>
            <DropdownMenuItem onClick={onViewDetails}>
              <Eye className="h-4 w-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrimaryAction}>
              <PrimaryIcon className="h-4 w-4 mr-2" />
              {primaryAction.label}
            </DropdownMenuItem>
            {(manifest.type === "urban" || manifest.type === "feedback") && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onReferral();
                }}
              >
                <Forward className="h-4 w-4 mr-2" />
                Encaminhar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile (<640px): Vertical card layout */}
      <div className="sm:hidden p-3 space-y-2">
        {/* Header row: checkbox, avatar, badges, date, menu */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(!!checked)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
          <Avatar className="h-8 w-8 shrink-0 cursor-pointer" onClick={onViewDetails}>
            <AvatarImage src={manifest.author?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">
              {manifest.author?.full_name?.slice(0, 2).toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            <Badge
              variant="outline"
              className={`${typeConfig[manifest.type].color} text-[10px] px-1.5 py-0`}
            >
              <TypeIcon className="h-2.5 w-2.5 mr-0.5" />
              {typeConfig[manifest.type].shortLabel}
            </Badge>
            {manifest.severity && severityConfig[manifest.severity] && (
              <Badge
                variant="outline"
                className={`${severityConfig[manifest.severity].color} text-[10px] px-1.5 py-0`}
              >
                {severityConfig[manifest.severity].label}
              </Badge>
            )}
            {manifest.urban_data?.risk_level === "critical" && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                <AlertTriangle className="h-2.5 w-2.5" />
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {format(new Date(manifest.created_at), "dd/MM HH:mm")}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-50" sideOffset={5}>
              <DropdownMenuItem onClick={onViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrimaryAction}>
                <PrimaryIcon className="h-4 w-4 mr-2" />
                {primaryAction.label}
              </DropdownMenuItem>
              {(manifest.type === "urban" || manifest.type === "feedback") && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onReferral();
                  }}
                >
                  <Forward className="h-4 w-4 mr-2" />
                  Encaminhar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div onClick={onViewDetails} className="cursor-pointer">
          <p className="font-medium text-sm line-clamp-1">{manifest.title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Toque para ver detalhes</p>
        </div>

        {/* Footer: Status select full width */}
        <Select value={manifest.status} onValueChange={onStatusChange}>
          <SelectTrigger
            className={`w-full h-9 text-xs ${statusConfig[manifest.status]?.color || ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Pendente
              </span>
            </SelectItem>
            <SelectItem value="in_progress">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Em Andamento
              </span>
            </SelectItem>
            <SelectItem value="resolved">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Resolvido
              </span>
            </SelectItem>
            <SelectItem value="rejected">
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Rejeitado
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
