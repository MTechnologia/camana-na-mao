import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/ui/page-header";
import ProfileCompletionCard from "@/components/home/ProfileCompletionCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { toast } from "sonner";
import { 
  MapPin, 
  BarChart3, 
  ChevronRight, 
  Heart,
  Bookmark,
  Settings, 
  Accessibility,
  CheckCircle2,
  LogOut,
  Camera,
  Loader2,
  Shield,
  Download,
  History,
} from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { status: profileStatus, checkCompletion } = useProfileCompletion();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    avatarUrl: null as string | null,
  });
  const [primaryAddress, setPrimaryAddress] = useState<{
    street?: string;
    number?: string;
    complement?: string | null;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadProfile runs when user changes
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const [profileRes, addressRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('user_addresses')
          .select('street, number, complement, neighborhood, city, state, zip_code')
          .eq('user_id', user.id)
          .eq('is_primary', true)
          .maybeSingle(),
      ]);

      if (profileRes.error) {
        console.error("Error loading profile:", profileRes.error);
        throw profileRes.error;
      }
      if (profileRes.data) {
        setProfile({
          fullName: profileRes.data.full_name || "",
          phone: profileRes.data.phone || "",
          avatarUrl: profileRes.data.avatar_url,
        });
      }

      if (!addressRes.error && addressRes.data) {
        setPrimaryAddress(addressRes.data);
      } else {
        setPrimaryAddress(null);
      }
    } catch (error: unknown) {
      console.error("Error loading profile:", error);
    }
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      // Upload para Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Atualizar perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatarUrl }));
      checkCompletion();
      toast.success("Foto atualizada com sucesso!");
    } catch (error: unknown) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao atualizar foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Determinar status de completude de cada seção
  const getCompletionStatus = (cardId: string): boolean | null => {
    switch (cardId) {
      case 'address':
        return profileStatus.address;
      case 'interests':
        return profileStatus.interests;
      case 'demographics':
        return profileStatus.demographics;
      default:
        return null;
    }
  };

  const addressDescription = primaryAddress
    ? [primaryAddress.street, primaryAddress.number, primaryAddress.complement, primaryAddress.neighborhood]
        .filter(Boolean)
        .join(" · ") || "CEP, rua e complemento"
    : "CEP, rua e complemento";

  const dataCards = [
    {
      id: 'address',
      title: 'Endereço',
      description: addressDescription,
      icon: MapPin,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      path: '/perfil/endereco',
    },
    {
      id: 'favorites',
      title: 'Meus Favoritos',
      description: 'Equipamentos públicos salvos',
      icon: Bookmark,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      path: '/servicos/favoritos',
    },
    {
      id: 'visitas',
      title: 'Histórico de visitas',
      description: 'Equipamentos detectados por geolocalização',
      icon: History,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-100',
      path: '/perfil/visitas',
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
    {
      id: 'consents',
      title: 'Consentimentos',
      description: 'Gestão de consentimentos LGPD',
      icon: Shield,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      path: '/perfil/consentimentos',
    },
    {
      id: 'export',
      title: 'Exportar Dados',
      description: 'Portabilidade de dados (LGPD)',
      icon: Download,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      path: '/perfil/exportar-dados',
    },
    {
      id: 'rights',
      title: 'Meus Direitos LGPD',
      description: 'Acesso, correção, exclusão e mais',
      icon: Shield,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
      path: '/perfil/direitos',
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
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${card.iconBg}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
              <div>
                <h3 className="font-medium text-foreground text-sm">{card.title}</h3>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {completionStatus !== null && (
                completionStatus ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                )
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-screen bg-background pt-[80px] flex flex-col overflow-hidden">
      <PageHeader title="Meu Perfil" backTo="/" />

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        className="hidden"
      />

      <div className="flex-1 px-4 pb-4 flex flex-col overflow-hidden">
        {/* Profile Card Compacto - Agora editável */}
        {user && (
          <Card
            className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] border-border/50 mb-2"
            onClick={() => navigate('/perfil/dados-pessoais')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                {/* Avatar com botão de upload */}
                <div 
                  className="relative flex-shrink-0 group"
                  onClick={handleAvatarClick}
                >
                  <Avatar className="w-14 h-14 ring-2 ring-border transition-opacity group-hover:opacity-80">
                    {profile.avatarUrl ? (
                      <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
                    ) : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                      {profile.fullName ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
                    {uploadingAvatar ? (
                      <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
                    ) : (
                      <Camera className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                </div>
                
                {/* Informações */}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-foreground text-sm truncate">
                    {profile.fullName || "Sem nome"}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <p className="text-[10px] text-primary mt-0.5">
                    Toque para editar dados
                  </p>
                </div>
                
                {/* Status de completude */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {profileStatus.basic ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Completion Card */}
        {profileStatus.percentage < 100 && (
          <div className="mb-2">
            <ProfileCompletionCard status={profileStatus} />
          </div>
        )}

        {/* Sections Container - grows to fill space */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Meus Dados Section */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Meus Dados
            </h3>
            <div className="space-y-1.5">
              {dataCards.map(card => renderCard(card, true))}
            </div>
          </div>

          {/* Configurações Section */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Configurações
            </h3>
            <div className="space-y-1.5">
              {settingsCards.map(card => renderCard(card, false))}
            </div>
          </div>
        </div>

        {/* Logout Button - fixed at bottom */}
        <Button
          onClick={signOut}
          variant="outline"
          className="w-full h-10 mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 flex-shrink-0"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair da Conta
        </Button>
      </div>
    </div>
  );
};

export default Profile;
