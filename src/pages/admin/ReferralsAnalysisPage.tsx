import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ReferralRulesSummary } from '@/components/admin/referrals/ReferralRulesSummary';
import { FileText } from 'lucide-react';
import { ReferralDestinationsTable } from '@/components/admin/referrals/ReferralDestinationsTable';
import {
  CommissionsChartSection,
  CouncilMembersChartSection,
  ReferralsChartSection,
} from '@/components/admin/charts/SectionChartPanels';
import { ReferralsKpiStrip } from '@/components/admin/urban-reports/ReferralsKpiStrip';
import { PageUsageGuideFooter } from '@/components/admin/guide/PageUsageGuideFooter';
import { UrbanReportsExploreLinks } from '@/components/admin/urban-reports/UrbanReportsExploreLinks';
import { REFERRALS_PAGE_LEGENDS } from '@/lib/analyticsParameterLegends';
import { UrbanReportsPageHeader } from '@/components/admin/urban-reports/UrbanReportsPageHeader';
import { UrbanReportsSubNav } from '@/components/admin/urban-reports/UrbanReportsSubNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReferralsAdmin } from '@/hooks/useReferralsAdmin';
import { useReferralDestinations } from '@/hooks/useReferralDestinations';
import { cn } from '@/lib/utils';
import { Building2, Share2, Users } from 'lucide-react';

const TABS = [
  { id: 'fluxo', label: 'Fluxo', icon: Share2 },
  { id: 'comissoes', label: 'Comissões', icon: Building2 },
  { id: 'vereadores', label: 'Vereadores', icon: Users },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function ReferralsAnalysisPage() {
  const { kpis } = useReferralsAdmin();
  const { commissions, councilMembers } = useReferralDestinations();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabId =
    tabParam === 'comissoes' || tabParam === 'vereadores' || tabParam === 'fluxo'
      ? tabParam
      : 'fluxo';

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [tabParam, activeTab, setSearchParams]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <UrbanReportsPageHeader
        title="Análise de encaminhamentos"
        actions={
          <Button variant="outline" size="sm" className="gap-1.5 shadow-sm" asChild>
            <Link to="/admin/reports">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Gestão de relatos
            </Link>
          </Button>
        }
      />

      <UrbanReportsSubNav />

      <ReferralRulesSummary />

      <section aria-label="Abas de encaminhamento" className="space-y-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
          className="w-full"
        >
          <Card className="overflow-hidden border-border/80 p-1.5 shadow-sm">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-transparent p-0">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className={cn(
                    'h-9 gap-1.5 rounded-md text-xs font-medium sm:text-sm',
                    'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
                  )}
                >
                  <t.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Card>

          <TabsContent value="fluxo" className="mt-4 space-y-6 focus-visible:outline-none">
            <ReferralsKpiStrip kpis={kpis} />
            <ReferralsChartSection />
          </TabsContent>

          <TabsContent value="comissoes" className="mt-4 space-y-6 focus-visible:outline-none">
            <CommissionsChartSection />
            <ReferralDestinationsTable
              title="Comissões temáticas"
              description="Destinos institucionais para encaminhamento após triagem do relato."
              destinations={commissions}
              nameColumnLabel="Comissão"
            />
          </TabsContent>

          <TabsContent value="vereadores" className="mt-4 space-y-6 focus-visible:outline-none">
            <CouncilMembersChartSection />
            <ReferralDestinationsTable
              title="Vereadores"
              description="Parlamentares disponíveis para encaminhamento direto, com temas de afinidade e carga atual."
              destinations={councilMembers}
              nameColumnLabel="Vereador(a)"
            />
          </TabsContent>
        </Tabs>
      </section>

      <PageUsageGuideFooter
        items={REFERRALS_PAGE_LEGENDS}
        pageName="Análise de encaminhamentos"
      >
        <UrbanReportsExploreLinks />
      </PageUsageGuideFooter>
    </div>
  );
}
