import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Check, X } from "lucide-react";
import { IconCheck } from "@/components/icons";

interface InlineAddressConfirmProps {
  address: string;
  onConfirm: (confirmed: boolean) => void;
}

export const InlineAddressConfirm = ({ address, onConfirm }: InlineAddressConfirmProps) => {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm(true);
  };

  const handleReject = () => {
    setConfirmed(false);
    onConfirm(false);
  };

  if (confirmed !== null) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <MapPin className="h-3 w-3" />
        <span className="inline-flex items-center gap-1">
              {confirmed ? (
                <>
                  Endereço confirmado
                  <IconCheck size={14} />
                </>
              ) : (
                'Endereço não confirmado'
              )}
            </span>
      </div>
    );
  }

  return (
    <div className="mt-3 w-full max-w-[280px]">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 flex-shrink-0" />
        <span>Confirme o endereço:</span>
      </div>
      <div className="p-3 rounded-md bg-muted/50 border mb-3">
        <p className="text-sm font-medium">{address || 'Endereço não informado'}</p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleConfirm}
          className="flex-1"
        >
          <Check className="h-4 w-4 mr-1" />
          Sim, correto
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReject}
          className="flex-1"
        >
          <X className="h-4 w-4 mr-1" />
          Não, corrigir
        </Button>
      </div>
    </div>
  );
};

export default InlineAddressConfirm;
