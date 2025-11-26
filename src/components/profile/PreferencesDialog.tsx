import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PreferencesForm from "./PreferencesForm";

interface PreferencesDialogProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const PreferencesDialog = ({ userId, isOpen, onClose }: PreferencesDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferências e Privacidade</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <PreferencesForm userId={userId} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreferencesDialog;
