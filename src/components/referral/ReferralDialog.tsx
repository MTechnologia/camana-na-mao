import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReferralWizard } from './ReferralWizard';

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

  const handleComplete = () => {
    onOpenChange(false);
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Encaminhar para Vereador</DialogTitle>
        </DialogHeader>
        <ReferralWizard
          report={report}
          onComplete={handleComplete}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
