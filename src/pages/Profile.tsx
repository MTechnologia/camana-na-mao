import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          fullName: data.full_name || "",
          phone: data.phone || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.fullName,
          phone: profile.phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-background shadow-sm" style={{ height: '60px' }}>
        <div className="flex items-center justify-between px-4 h-full">
          <button
            onClick={() => navigate("/home")}
            className="text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft size={28} strokeWidth={2} />
          </button>
          <h1 className="text-sm font-medium text-foreground">Meu Perfil</h1>
          <div className="w-7" />
        </div>
      </header>

      <div className="p-6">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="personal">Pessoal</TabsTrigger>
            <TabsTrigger value="demographics">Demografia</TabsTrigger>
            <TabsTrigger value="address">Endereço</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome Completo</label>
              <Input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
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
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                className="h-12"
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={loading}
              className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-full"
            >
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </TabsContent>

          <TabsContent value="demographics">
            <p className="text-center text-muted-foreground py-8">
              Funcionalidade em desenvolvimento
            </p>
          </TabsContent>

          <TabsContent value="address">
            <p className="text-center text-muted-foreground py-8">
              Funcionalidade em desenvolvimento
            </p>
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <Button
            onClick={signOut}
            variant="destructive"
            className="w-full h-12 rounded-full"
          >
            Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
