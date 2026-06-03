import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import ProfilePageHeader from "@/components/profile/ProfilePageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Mail, Phone } from "lucide-react";
import { formatPhone, unformatPhone } from "@/lib/phoneMask";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData runs when user changes
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
        throw error;
      }

      if (data) {
        setFormData({
          fullName: data.full_name || "",
          phone: data.phone || "",
        });
      }
    } catch (error: unknown) {
      console.error("Error loading profile:", error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Informações atualizadas!");
      navigate("/perfil");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Informações Pessoais" backTo="/perfil" />

      <div className="p-4 space-y-4">
        <ProfilePageHeader subtitle="Informações pessoais" />

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Dados de Contato
            </CardTitle>
            <CardDescription>Informações pessoais para identificação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Nome Completo
              </label>
              <Input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                className="h-11"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                E-mail
              </label>
              <Input type="email" value={user?.email || ""} disabled className="h-11 bg-muted" />
              <p className="text-xs text-muted-foreground mt-1">O e-mail não pode ser alterado</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                Celular
              </label>
              <Input
                type="tel"
                value={formatPhone(formData.phone)}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  setFormData((prev) => ({ ...prev, phone: unformatPhone(formatted) }));
                }}
                className="h-11"
                placeholder="(11) 99999-9999"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => navigate("/perfil")}
            className="flex-1 h-11"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1 h-11">
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoPage;
