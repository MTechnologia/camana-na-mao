import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/ui/page-header";
import AvatarUpload from "@/components/profile/AvatarUpload";
import PersonalInfoDialog from "@/components/profile/PersonalInfoDialog";
import DemographicsDialog from "@/components/profile/DemographicsDialog";
import AddressDialog from "@/components/profile/AddressDialog";
import PreferencesDialog from "@/components/profile/PreferencesDialog";
import { User, MapPin, BarChart3, Settings, ChevronRight } from "lucide-react";

const Profile = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    avatarUrl: null as string | null,
  });

  const [openDialog, setOpenDialog] = useState<'personal' | 'demographics' | 'address' | 'preferences' | null>(null);

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

  const profileCards = [
    {
      id: 'personal',
      title: 'Informações Pessoais',
      description: 'Nome, email e telefone',
      icon: User,
      color: 'text-blue-500',
    },
    {
      id: 'demographics',
      title: 'Dados Demográficos',
      description: 'Gênero, idade e classe social',
      icon: BarChart3,
      color: 'text-purple-500',
    },
    {
      id: 'address',
      title: 'Endereço',
      description: 'CEP, rua e complemento',
      icon: MapPin,
      color: 'text-green-500',
    },
    {
      id: 'preferences',
      title: 'Configurações',
      description: 'Notificações e privacidade',
      icon: Settings,
      color: 'text-orange-500',
    },
  ];

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

        {/* Profile Cards */}
        <div className="space-y-3 mb-8">
          {profileCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.id}
                className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => setOpenDialog(card.id as typeof openDialog)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg bg-primary/10 ${card.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Logout Button */}
        <Button
          onClick={signOut}
          variant="destructive"
          className="w-full h-12"
        >
          Sair da Conta
        </Button>
      </div>

      {/* Dialogs */}
      {user && (
        <>
          <PersonalInfoDialog
            userId={user.id}
            userEmail={user.email || ""}
            isOpen={openDialog === 'personal'}
            onClose={() => setOpenDialog(null)}
            onUpdate={loadProfile}
          />
          <DemographicsDialog
            userId={user.id}
            isOpen={openDialog === 'demographics'}
            onClose={() => setOpenDialog(null)}
          />
          <AddressDialog
            userId={user.id}
            isOpen={openDialog === 'address'}
            onClose={() => setOpenDialog(null)}
          />
          <PreferencesDialog
            userId={user.id}
            isOpen={openDialog === 'preferences'}
            onClose={() => setOpenDialog(null)}
          />
        </>
      )}
    </div>
  );
};

export default Profile;
