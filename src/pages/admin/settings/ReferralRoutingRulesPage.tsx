import { Link } from 'react-router-dom';
import { PlatformSectionHeading } from '@/components/admin/platform/PlatformSectionHeading';
import { ReferralRulesEditor } from '@/components/admin/referrals/ReferralRulesEditor';
import { SettingsLayout } from '@/components/admin/settings/SettingsLayout';
import { Button } from '@/components/ui/button';

export function ReferralRoutingRulesPage() {
  return (
    <SettingsLayout
      title="Regras de encaminhamento"
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/referrals">Análise de encaminhamentos</Link>
        </Button>
      }
    >
      <section className="space-y-3" aria-labelledby="referral-rules-editor-heading">
        <PlatformSectionHeading id="referral-rules-editor-heading" title="Editor de regras" />
        <ReferralRulesEditor surface="page" />
      </section>
    </SettingsLayout>
  );
}
