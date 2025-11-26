import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DemographicsForm from "./DemographicsForm";

interface DemographicsDialogProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const DemographicsDialog = ({ userId, isOpen, onClose }: DemographicsDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dados Demográficos</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <DemographicsForm userId={userId} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemographicsDialog;
