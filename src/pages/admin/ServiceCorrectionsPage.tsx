import { RefreshCw } from 'lucide-react';
import ServiceCorrectionsManagement from '@/pages/admin/ServiceCorrectionsManagement';
import { GovernancePageShell } from '@/components/admin/governance/GovernancePageShell';
import { Button } from '@/components/ui/button';
import { useRef } from 'react';

export function ServiceCorrectionsPage() {
  const refreshRef = useRef<(() => void) | null>(null);

  return (
    <GovernancePageShell
      title="Correções de equipamentos"
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => refreshRef.current?.()}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Atualizar
        </Button>
      }
    >
      <ServiceCorrectionsManagement
        embedded
        hidePageHeader
        onRefreshReady={(fn) => {
          refreshRef.current = fn;
        }}
      />
    </GovernancePageShell>
  );
}
