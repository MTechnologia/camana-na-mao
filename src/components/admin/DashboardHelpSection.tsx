import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  HelpCircle,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const shortcuts = [
  {
    to: '/admin/analytics',
    label: 'Análise de relatos urbanos',
    hint: 'Volume, sentimento e padrões de relatos sobre a cidade',
    Icon: BarChart3,
  },
  {
    to: '/paineis',
    label: 'Painéis personalizáveis',
    hint: 'Salvar filtros e visualizações por território',
    Icon: LayoutGrid,
  },
] as const;

export function DashboardHelpSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-8 space-y-3" aria-label="Ajuda e navegação complementar">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {shortcuts.map(({ to, label, hint, Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3',
              'shadow-sm transition-colors hover:border-primary/30 hover:bg-accent',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs sm:flex-initial',
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                {label}
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </span>
              <span className="block truncate text-xs text-muted-foreground">{hint}</span>
            </span>
          </Link>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            'h-auto min-h-[60px] flex-1 gap-2 rounded-xl border-dashed px-4 py-3 sm:max-w-[220px] sm:flex-initial',
            open && 'border-primary/40 bg-accent',
          )}
        >
          <HelpCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="text-left text-sm font-medium">Como usar esta tela</span>
          <ChevronDown
            className={cn('ml-auto h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </Button>
      </div>

      {open ? (
        <Card className="border-border/80 shadow-sm">
          <CardContent className="p-4 pt-3">
            <Tabs defaultValue="navegacao">
              <TabsList className="mb-3 h-9 w-full justify-start sm:w-auto">
                <TabsTrigger value="navegacao" className="text-xs sm:text-sm">
                  Navegação
                </TabsTrigger>
                <TabsTrigger value="homologacao" className="text-xs sm:text-sm">
                  Para homologação
                </TabsTrigger>
              </TabsList>

              <TabsContent value="navegacao" className="mt-0 space-y-3 text-sm">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Esta página é a visão executiva: indicadores principais, trilha de recorte e um
                  gráfico interativo. Use os atalhos acima para análises mais profundas ou painéis
                  salvos.
                </p>
                <ul className="space-y-2">
                  {shortcuts.map(({ to, label, hint, Icon }) => (
                    <li
                      key={to}
                      className="flex gap-3 rounded-lg border border-border bg-muted/25 px-3 py-2"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <div>
                        <Link to={to} className="font-medium text-primary hover:underline">
                          {label}
                        </Link>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {hint}. Indicado quando for preciso cruzar dimensões além do resumo
                          desta página.
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="homologacao" className="mt-0 space-y-2 text-sm text-muted-foreground">
                <p className="text-xs leading-relaxed">
                  Referência para validação do projeto Câmara na Mão (Participação Cidadã da Câmara
                  Municipal de São Paulo). Códigos RN-ANL na documentação interna — não exibidos ao
                  cidadão.
                </p>
                <ul className="space-y-2 text-xs leading-relaxed">
                  <li className="rounded-lg border border-border bg-muted/25 px-3 py-2">
                    <p className="font-medium text-foreground">
                      Regra de negócio RN-ANL-002 — filtros globais obrigatórios
                    </p>
                    <p className="mt-1">
                      Período, Região e Categoria no topo definem o recorte de KPIs e gráfico.
                      Complemento RN-ANL-001: atualização ao mudar filtro em tempo real.
                    </p>
                  </li>
                  <li className="rounded-lg border border-border bg-muted/25 px-3 py-2">
                    <p className="font-medium text-foreground">
                      Regra de negócio RN-ANL-003 — navegação em camadas
                    </p>
                    <p className="mt-1">
                      Trilha analítica, drill no gráfico e botão Ver relatos mantêm o contexto do
                      recorte.
                    </p>
                  </li>
                  <li className="rounded-lg border border-border bg-muted/25 px-3 py-2">
                    <p className="font-medium text-foreground">
                      Regra de negócio RN-ANL-004 — quatro indicadores oficiais
                    </p>
                    <p className="mt-1">
                      Volume, tempo de resposta, sentimento e padrões recorrentes no recorte
                      selecionado.
                    </p>
                  </li>
                </ul>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
