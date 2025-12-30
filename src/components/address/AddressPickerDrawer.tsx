import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete, StructuredAddress } from "./AddressAutocomplete";
import { MapPin, Check } from "lucide-react";

interface AddressPickerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddressSelected: (address: StructuredAddress) => void;
}

export function AddressPickerDrawer({
  open,
  onOpenChange,
  onAddressSelected,
}: AddressPickerDrawerProps) {
  const [selectedAddress, setSelectedAddress] = useState<StructuredAddress | null>(null);

  const handleSelect = (address: StructuredAddress) => {
    setSelectedAddress(address);
  };

  const handleConfirm = () => {
    if (selectedAddress) {
      onAddressSelected(selectedAddress);
      onOpenChange(false);
      setSelectedAddress(null);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedAddress(null);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Buscar endereço
          </DrawerTitle>
          <DrawerDescription>
            Digite parte do endereço para buscar
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4">
          <AddressAutocomplete
            onSelect={handleSelect}
            placeholder="Ex: Rua Augusta, São Paulo"
          />

          {selectedAddress && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Check className="h-4 w-4" />
                Endereço selecionado
              </div>
              <div className="text-sm space-y-1">
                <p className="font-medium">{selectedAddress.street}{selectedAddress.streetNumber ? `, ${selectedAddress.streetNumber}` : ''}</p>
                <p className="text-muted-foreground">
                  {selectedAddress.neighborhood}{selectedAddress.neighborhood && selectedAddress.city ? ' - ' : ''}
                  {selectedAddress.city}
                  {selectedAddress.state ? `, ${selectedAddress.state}` : ''}
                </p>
                {selectedAddress.cep && (
                  <p className="text-muted-foreground text-xs">
                    CEP: {selectedAddress.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!selectedAddress}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
