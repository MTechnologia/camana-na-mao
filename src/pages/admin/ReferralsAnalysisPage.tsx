import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ReferralRulesSummary } from '@/components/admin/referrals/ReferralRulesSummary';
import { ArrowLeft, Building2, Share2, Users } from 'lucide-react';
import { ReferralDestinationsTable } from '@/components/admin/referrals/ReferralDestinationsTable';
import {
  CommissionsChartSection,
  CouncilMembersChartSection,
  ReferralsChartSection,
} from '@/components/admin/charts/SectionChartPanels';
import { KpiCard } from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/PageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { REFERRAL_KPI_LEGENDS, REFERRALS_PAGE_LEGEND } from '@/lib/analyticsParameterLegends';
import { useReferralsAdmin } from '@/hooks/useReferralsAdmin';
import { useReferralDestinations } from '@/hooks/useReferralDestinations';

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
    <PageShell
      title="Análise de Encaminhamentos"
      titleInfo={REFERRALS_PAGE_LEGEND}
      actions={
        <Button variant="default" size="sm" asChild>
          <Link to="/admin/reports">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Ir para Gestão de relatos
          </Link>
        </Button>
      }
    >
      <ReferralRulesSummary className="mb-4" />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 p-1">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <t.icon className="h-4 w-4" aria-hidden />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="fluxo" className="mt-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <KpiCard label="Total" value={String(kpis.total)} parameter={REFERRAL_KPI_LEGENDS.total} />
            <KpiCard label="Pendentes" value={String(kpis.pending)} parameter={REFERRAL_KPI_LEGENDS.pending} />
            <KpiCard label="Enviados" value={String(kpis.sent)} parameter={REFERRAL_KPI_LEGENDS.sent} />
            <KpiCard label="Resolvidos" value={String(kpis.resolved)} parameter={REFERRAL_KPI_LEGENDS.resolved} />
          </div>
          <ReferralsChartSection />
        </TabsContent>

        <TabsContent value="comissoes" className="mt-0 space-y-6">
          <CommissionsChartSection />
          <ReferralDestinationsTable
            title="Comissões temáticas"
            description="Destinos institucionais para encaminhamento após triagem do relato."
            destinations={commissions}
            nameColumnLabel="Comissão"
          />
        </TabsContent>

        <TabsContent value="vereadores" className="mt-0 space-y-6">
          <CouncilMembersChartSection />
          <ReferralDestinationsTable
            title="Vereadores"
            description="Parlamentares disponíveis para encaminhamento direto, com temas de afinidade e carga atual."
            destinations={councilMembers}
            nameColumnLabel="Vereador(a)"
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

