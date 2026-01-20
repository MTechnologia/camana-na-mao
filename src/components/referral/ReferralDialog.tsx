import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReferralWizard } from './ReferralWizard';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

interface ReportSummary {
  id: string;
  type: 'transport' | 'urban' | 'service';
  title: string;
  description?: string;
  category?: string;
  location?: string;
  date?: string;
  severity?: string;
  region?: string;
  report_type?: string;
}

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportSummary | null;
  onComplete?: () => void;
}

export const ReferralDialog = ({ 
  open, 
  onOpenChange, 
  report,
  onComplete 
}: ReferralDialogProps) => {
  if (!report) return null;
  const { loading, canReferToCouncilMember } = useUserRole();

  const handleComplete = () => {
    onOpenChange(false);
    onComplete?.();
  };

  const handleBlocked = () => {
    toast.error('Acesso restrito', {
      description: 'Encaminhar para vereador está disponível apenas para Cidadão Engajado, Gestor e Admin.',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Encaminhar para Vereador</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground">Verificando permissões...</p>
          </div>
        ) : canReferToCouncilMember ? (
          <ReferralWizard
            report={report}
            onComplete={handleComplete}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <div className="p-6 space-y-3">
            <h3 className="text-base font-semibold">Acesso restrito</h3>
            <p className="text-sm text-muted-foreground">
              Encaminhar para vereador está disponível apenas para <strong>Cidadão Engajado</strong>,{' '}
              <strong>Gestor</strong> e <strong>Admin</strong>.
            </p>
            <button
              className="text-sm text-primary underline"
              onClick={handleBlocked}
              type="button"
            >
              Entendi
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
