import { ChevronRight, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/** @deprecated Use UnifiedAnalyticsContextBar quando USE_UNIFIED_ANALYTICS_CONTEXT_BAR = true */
export function AnalyticsContextBar() {
  const { lastRecalcAt, touchRecalc } = useGlobalFilters();

  const formatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(lastRecalcAt);

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-card px-4 py-2.5 md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Última atualização dos indicadores
        </span>
        <span className="text-sm font-medium tabular-nums text-foreground">{formatted}</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              touchRecalc();
              toast.success('Indicadores atualizados', {
                description: 'Recorte recalculado.',
              });
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Atualizar dados
          </Button>
        </TooltipTrigger>
        <TooltipContent>Recalcula referência temporal do painel.</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function AdminBreadcrumbs() {
  const { pathname: path } = useLocation();
  const segments = path.split('/').filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  let acc = '';
  for (const seg of segments) {
    acc += `/${seg}`;
    const label = SEGMENT_LABELS[seg] ?? prettify(seg);
    crumbs.push({ href: acc, label });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Trilha" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden /> : null}
            {i === crumbs.length - 1 ? (
              <span className="font-medium text-foreground">{c.label}</span>
            ) : (
              <Link to={c.href} className="hover:text-primary hover:underline">
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function prettify(s: string): string {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/** Rótulos de segmento de rota (protótipo); mantidos alinhados ao menu lateral. */
const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Painel',
  notifications: 'Notificações',
  analytics: 'Análise de relatos urbanos',
  trends: 'Tendências',
  'reports-heatmap': 'Mapa de calor',
  'classification-accuracy': 'Acurácia da classificação',
  exports: 'Exportações de dados',
  reports: 'Gestão de relatos urbanos',
  referrals: 'Análise de Encaminhamentos',
  commissions: 'Análise de Encaminhamentos',
  'equipment-ratings': 'Avaliações de equipamentos',
  'public-hearings': 'Audiências públicas',
  docs: 'Documentação',
  overview: 'Visão geral',
  users: 'Usuários',
  'audit-logs': 'Auditoria',
  'service-corrections': 'Correções',
  settings: 'Configurações',
  ai: 'IA — versionamento',
  parameters: 'Parametrização',
  'referral-rules': 'Regras de encaminhamento',
  integrations: 'Integrações e APIs',
  accessibility: 'Acessibilidade',
  paineis: 'Painéis',
  avancado: 'Painel avançado',
  criar: 'Criar painel',
};
