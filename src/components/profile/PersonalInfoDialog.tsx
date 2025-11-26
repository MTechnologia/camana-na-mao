import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PersonalInfoDialogProps {
  userId: string;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const PersonalInfoDialog = ({ userId, userEmail, isOpen, onClose, onUpdate }: PersonalInfoDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, userId]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          fullName: data.full_name || "",
          phone: data.phone || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success("Informações atualizadas!");
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Informações Pessoais</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Nome Completo</label>
            <Input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              className="h-12"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">E-mail</label>
            <Input
              type="email"
              value={userEmail}
              disabled
              className="h-12 bg-muted"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Celular</label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="h-12"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-foreground text-background hover:bg-foreground/90"
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonalInfoDialog;
