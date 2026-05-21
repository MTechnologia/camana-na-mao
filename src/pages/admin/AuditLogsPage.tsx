import { Download, Lock } from 'lucide-react';
import AuditLogs from '@/pages/admin/AuditLogs';
import { GovernancePageShell } from '@/components/admin/governance/GovernancePageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRef } from 'react';

/** Auditoria — shell institucional + trilha imutável. */
export function AuditLogsPage() {
  const exportRef = useRef<(() => void) | null>(null);

  return (
    <GovernancePageShell
      title="Auditoria"
      actions={
        <>
          <Badge variant="outline" className="h-7 gap-1 px-2 text-[10px]">
            <Lock className="h-3 w-3" aria-hidden />
            Imutável
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => exportRef.current?.()}
          >
            <Download className="h-4 w-4" aria-hidden />
            Exportar CSV
          </Button>
        </>
      }
    >
      <AuditLogs embedded hidePageHeader onExportReady={(fn) => { exportRef.current = fn; }} />
    </GovernancePageShell>
  );
}
