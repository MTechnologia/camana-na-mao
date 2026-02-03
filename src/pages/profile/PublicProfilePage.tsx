import { useParams, useNavigate } from "react-router-dom";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import PageHeader from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mail, 
  Phone, 
  Calendar, 
  Lock, 
  Eye, 
  User,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getInitials } from "@/lib/utils";

const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profile, loading, error } = usePublicProfile(userId || null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-[60px]">
        <PageHeader title="Perfil" backTo="/perfil" />
        <div className="p-4 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background pt-[60px]">
        <PageHeader title="Perfil" backTo="/perfil" />
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || "Perfil não encontrado ou não disponível"}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/perfil")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao meu perfil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader 
        title={profile.is_own_profile ? "Meu Perfil" : "Perfil Público"} 
        backTo="/perfil" 
      />
      
      <div className="p-4 space-y-4">
        {/* Card Principal do Perfil */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-xl">{profile.full_name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  {profile.profile_visibility === 'public' && (
                    <>
                      <Eye className="h-3 w-3" />
                      Perfil Público
                    </>
                  )}
                  {profile.profile_visibility === 'private' && (
                    <>
                      <Lock className="h-3 w-3" />
                      Perfil Privado
                    </>
                  )}
                  {profile.profile_visibility === 'friends' && (
                    <>
                      <User className="h-3 w-3" />
                      Apenas Amigos
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email */}
            {profile.email ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="text-sm font-medium">{profile.email}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Mail className="h-4 w-4 text-muted-foreground/50" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground/50">E-mail</p>
                  <p className="text-sm text-muted-foreground/50 italic">
                    Não disponível publicamente
                  </p>
                </div>
              </div>
            )}

            {/* Telefone */}
            {profile.phone ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium">{profile.phone}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Phone className="h-4 w-4 text-muted-foreground/50" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground/50">Telefone</p>
                  <p className="text-sm text-muted-foreground/50 italic">
                    Não disponível publicamente
                  </p>
                </div>
              </div>
            )}

            {/* Data de Cadastro */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Membro desde</p>
                <p className="text-sm font-medium">
                  {format(new Date(profile.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão para editar (apenas se for o próprio perfil) */}
        {profile.is_own_profile && (
          <Button
            onClick={() => navigate("/perfil")}
            className="w-full"
            variant="outline"
          >
            Editar meu perfil
          </Button>
        )}
      </div>
    </div>
  );
};

export default PublicProfilePage;
