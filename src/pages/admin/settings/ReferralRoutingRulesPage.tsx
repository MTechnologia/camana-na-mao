import { Link } from 'react-router-dom';
import { ReferralRulesEditor } from '@/components/admin/referrals/ReferralRulesEditor';
import { SettingsLayout } from '@/components/admin/settings/SettingsLayout';
import { Button } from '@/components/ui/button';

export function ReferralRoutingRulesPage() {
  return (
    <SettingsLayout
      title="Regras de encaminhamento"
      description="Parâmetros da sugestão inteligente de comissão e vereador por tema e carga de fila."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/referrals">Análise de encaminhamentos</Link>
        </Button>
      }
    >
      <ReferralRulesEditor />
    </SettingsLayout>
  );
}
