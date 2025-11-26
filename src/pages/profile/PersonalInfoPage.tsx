import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/ui/page-header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PersonalInfoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
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
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Informações atualizadas!");
      navigate("/profile");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Informações Pessoais" backTo="/profile" />

      <div className="p-6">
        <div className="space-y-4">
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
              value={user?.email || ""}
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
              onClick={() => navigate("/profile")}
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
      </div>
    </div>
  );
};

export default PersonalInfoPage;
