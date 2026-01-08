import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/ui/page-header";
import ProfileCompletionCard from "@/components/home/ProfileCompletionCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { 
  User, 
  MapPin, 
  BarChart3, 
  ChevronRight, 
  Heart, 
  Settings, 
  Accessibility,
  CheckCircle2,
  LogOut,
  Pencil
} from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { status: profileStatus } = useProfileCompletion();
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
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
        throw error;
      }

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

  // Determinar status de completude de cada seção
  const getCompletionStatus = (cardId: string): boolean | null => {
    switch (cardId) {
      case 'personal':
        return profileStatus.basic;
      case 'address':
        return profileStatus.address;
      case 'interests':
        return profileStatus.interests;
      case 'demographics':
        return profileStatus.demographics;
      default:
        return null; // Configurações não têm status de completude
    }
  };

  const dataCards = [
    {
      id: 'personal',
      title: 'Informações Pessoais',
      description: 'Nome, email e telefone',
      icon: User,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      path: '/perfil/dados-pessoais',
    },
    {
      id: 'address',
      title: 'Endereço',
      description: 'CEP, rua e complemento',
      icon: MapPin,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      path: '/perfil/endereco',
    },
    {
      id: 'interests',
      title: 'Interesses',
      description: 'Áreas de interesse e preferências',
      icon: Heart,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-100',
      path: '/perfil/interesses',
    },
    {
      id: 'demographics',
      title: 'Dados Demográficos',
      description: 'Gênero, idade e classe social',
      icon: BarChart3,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-100',
      path: '/perfil/dados-demograficos',
    },
  ];

  const settingsCards = [
    {
      id: 'accessibility',
      title: 'Acessibilidade',
      description: 'Fonte, contraste e leitura',
      icon: Accessibility,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100',
      path: '/configuracoes/acessibilidade',
    },
    {
      id: 'preferences',
      title: 'Preferências',
      description: 'Notificações e privacidade',
      icon: Settings,
      iconColor: 'text-slate-600',
      iconBg: 'bg-slate-100',
      path: '/perfil/preferencias',
    },
  ];

  const renderCard = (card: typeof dataCards[0], showStatus: boolean = false) => {
    const Icon = card.icon;
    const completionStatus = showStatus ? getCompletionStatus(card.id) : null;
    
    return (
      <Card
        key={card.id}
        className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] border-border/50"
        onClick={() => navigate(card.path)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div>
                <h3 className="font-medium text-foreground text-sm">{card.title}</h3>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {completionStatus !== null && (
                completionStatus ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                )
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Meu Perfil" backTo="/" />

      <div className="px-4 pt-2 pb-4 space-y-4">
        {/* Profile Card Compacto */}
        {user && (
          <Card
            className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] border-border/50"
            onClick={() => navigate('/perfil/dados-pessoais')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Avatar compacto */}
                <div className="relative flex-shrink-0">
                  <Avatar className="w-16 h-16 ring-2 ring-border">
                    {profile.avatarUrl ? (
                      <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
                    ) : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                      {profile.fullName ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                    <Pencil className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
                
                {/* Informações */}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-foreground truncate">
                    {profile.fullName || "Sem nome"}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                
                {/* Seta */}
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Completion Card */}
        {profileStatus.percentage < 100 && (
          <ProfileCompletionCard status={profileStatus} />
        )}

        {/* Meus Dados Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Meus Dados
          </h3>
          <div className="space-y-2">
            {dataCards.map(card => renderCard(card, true))}
          </div>
        </div>

        {/* Configurações Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Configurações
          </h3>
          <div className="space-y-2">
            {settingsCards.map(card => renderCard(card, false))}
          </div>
        </div>

        {/* Logout Button */}
        <Button
          onClick={signOut}
          variant="outline"
          className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair da Conta
        </Button>
      </div>
    </div>
  );
};

export default Profile;
