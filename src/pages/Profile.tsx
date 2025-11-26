import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageHeader from "@/components/ui/page-header";
import DemographicsForm from "@/components/profile/DemographicsForm";
import AddressForm from "@/components/profile/AddressForm";
import AvatarUpload from "@/components/profile/AvatarUpload";
import PreferencesForm from "@/components/profile/PreferencesForm";

const Profile = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    avatarUrl: null as string | null,
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
          avatarUrl: data.avatar_url,
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
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Meu Perfil" backTo="/home" />

      <div className="p-6">
        {/* Avatar Section */}
        {user && (
          <div className="mb-8 flex flex-col items-center">
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8 w-full flex flex-col items-center">
              <AvatarUpload
                userId={user.id}
                userName={profile.fullName}
                currentAvatarUrl={profile.avatarUrl}
                onAvatarUpdated={(url) => setProfile(prev => ({ ...prev, avatarUrl: url }))}
              />
              <div className="mt-4 text-center">
                <h2 className="text-2xl font-bold text-foreground">
                  {profile.fullName || "Sem nome"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="personal">Pessoal</TabsTrigger>
            <TabsTrigger value="demographics">Demografia</TabsTrigger>
            <TabsTrigger value="address">Endereço</TabsTrigger>
            <TabsTrigger value="preferences">Configurações</TabsTrigger>
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
              className="w-full h-12 bg-foreground text-background hover:bg-foreground/90"
            >
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </TabsContent>

          <TabsContent value="demographics">
            {user && <DemographicsForm userId={user.id} />}
          </TabsContent>

          <TabsContent value="address">
            {user && <AddressForm userId={user.id} />}
          </TabsContent>

          <TabsContent value="preferences">
            {user && <PreferencesForm userId={user.id} />}
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <Button
            onClick={signOut}
            variant="destructive"
            className="w-full h-12"
          >
            Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
