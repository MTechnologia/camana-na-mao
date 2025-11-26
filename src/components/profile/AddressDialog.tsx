import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddressForm from "./AddressForm";

interface AddressDialogProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const AddressDialog = ({ userId, isOpen, onClose }: AddressDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Endereço</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <AddressForm userId={userId} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressDialog;
