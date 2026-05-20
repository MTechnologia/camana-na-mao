import type { ComponentType } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  AiInsightsPanel,
  CorrelationTabPanel,
  PatternsTabPanel,
  SentimentTabPanel,
  TerritoryTabPanel,
  VolumeTabPanel,
} from '@/components/admin/analytics/AnalyticsTabPanels';

const tabs = [
  {
    id: 'volume',
    label: 'Volume',
    shortLabel: 'Volume',
    description: '',
  },
  {
    id: 'sentimento',
    label: 'Sentimento',
    shortLabel: 'Sentim.',
    description: 'Polaridade positiva, neutra e negativa por região.',
  },
  {
    id: 'padroes',
    label: 'Padrões',
    shortLabel: 'Padrões',
    description: 'Temas recorrentes e distribuição por zona.',
  },
  {
    id: 'correlacao',
    label: 'Correlação',
    shortLabel: 'Corr.',
    description: 'Relação entre volume, tempo de resposta e sentimento.',
  },
  {
    id: 'territorio',
    label: 'Território',
    shortLabel: 'Territ.',
    description: 'Intensidade e ranking por zona no recorte.',
  },
  {
    id: 'ia',
    label: 'IA',
    shortLabel: 'IA',
    description: 'Síntese automática a partir dos agregados do período.',
  },
] as const;

type TabId = (typeof tabs)[number]['id'];

const tabPanels: Record<TabId, ComponentType> = {
  volume: VolumeTabPanel,
  sentimento: SentimentTabPanel,
  padroes: PatternsTabPanel,
  correlacao: CorrelationTabPanel,
  territorio: TerritoryTabPanel,
  ia: AiInsightsPanel,
};

export function UrbanAnalyticsTabs() {
  return (
    <section aria-label="Análises temáticas" className="space-y-3">
      <Tabs defaultValue="volume" className="w-full">
        <Card className="overflow-hidden border-border/80 p-1.5 shadow-sm">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-transparent p-0 sm:grid-cols-6">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className={cn(
                  'h-9 shrink-0 rounded-md px-2 text-xs font-medium sm:text-sm',
                  'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
                )}
              >
                <span className="sm:hidden">{t.shortLabel}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Card>

        {tabs.map((t) => {
          const Panel = tabPanels[t.id];
          return (
            <TabsContent key={t.id} value={t.id} className="mt-0 pt-3 focus-visible:outline-none">
              {t.description ? (
                <p className="mb-3 text-xs text-muted-foreground">{t.description}</p>
              ) : null}
              <Panel />
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}
