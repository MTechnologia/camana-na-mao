import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ReferralRulesSummary } from '@/components/admin/referrals/ReferralRulesSummary';
import { ArrowLeft, Building2, Share2, Users } from 'lucide-react';
import { ReferralsCommissionsTab } from '@/components/admin/referrals/ReferralsCommissionsTab';
import { ReferralsCouncilorsTab } from '@/components/admin/referrals/ReferralsCouncilorsTab';
import { ReferralsFlowTab } from '@/components/admin/referrals/ReferralsFlowTab';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/PageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { REFERRALS_PAGE_LEGEND } from '@/lib/analyticsParameterLegends';
import { useReferralsAdmin } from '@/hooks/useReferralsAdmin';

const TABS = [
  { id: 'fluxo', label: 'Fluxo', icon: Share2 },
  { id: 'comissoes', label: 'Comissões', icon: Building2 },
  { id: 'vereadores', label: 'Vereadores', icon: Users },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function ReferralsAnalysisPage() {
  const { kpis } = useReferralsAdmin();
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
      title="Análise de encaminhamentos"
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
          <ReferralsFlowTab kpis={kpis} />
        </TabsContent>

        <TabsContent value="comissoes" className="mt-0 space-y-6">
          <ReferralsCommissionsTab />
        </TabsContent>

        <TabsContent value="vereadores" className="mt-0 space-y-6">
          <ReferralsCouncilorsTab />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

