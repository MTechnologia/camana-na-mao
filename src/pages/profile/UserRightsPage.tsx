import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import ProfilePageHeader from "@/components/profile/ProfilePageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Shield, 
  Trash2,
  Edit,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Info,
  FileText,
  XCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const UserRightsPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (deleteConfirmText !== "EXCLUIR") {
      toast.error("Por favor, digite 'EXCLUIR' para confirmar");
      return;
    }

    setLoading(true);
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      // Call Edge Function to delete user
      const { error } = await supabase.functions.invoke('delete-own-account', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        throw error;
      }

      toast.success("Conta excluída com sucesso");
      
      // Sign out and redirect
      await signOut();
      navigate("/");
    } catch (error: unknown) {
      console.error('Error deleting account:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir conta. Tente novamente.');
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
    }
  };

  const rights = [
    {
      id: 'access',
      title: 'Acesso aos Dados',
      description: 'Visualizar todos os seus dados pessoais',
      icon: Eye,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      action: () => navigate('/perfil'),
      actionLabel: 'Ver meus dados',
    },
    {
      id: 'export',
      title: 'Portabilidade',
      description: 'Exportar seus dados em formato JSON',
      icon: Download,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      action: () => navigate('/perfil/exportar-dados'),
      actionLabel: 'Exportar dados',
    },
    {
      id: 'correction',
      title: 'Correção de Dados',
      description: 'Atualizar ou corrigir informações pessoais',
      icon: Edit,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      action: () => navigate('/perfil/dados-pessoais'),
      actionLabel: 'Editar dados',
    },
    {
      id: 'consents',
      title: 'Gestão de Consentimentos',
      description: 'Gerenciar seus consentimentos LGPD',
      icon: Shield,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
      action: () => navigate('/perfil/consentimentos'),
      actionLabel: 'Gerenciar consentimentos',
    },
    {
      id: 'deletion',
      title: 'Exclusão de Conta',
      description: 'Excluir permanentemente sua conta e todos os dados',
      icon: Trash2,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      action: () => setShowDeleteDialog(true),
      actionLabel: 'Excluir conta',
      isDestructive: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Meus Direitos LGPD" backTo="/perfil" />

      <div className="p-4 space-y-4">
        <ProfilePageHeader subtitle="Seus direitos como titular de dados" />

        {/* Informação sobre direitos LGPD */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-foreground font-medium">
                  Lei Geral de Proteção de Dados (LGPD)
                </p>
                <p className="text-xs text-muted-foreground">
                  Você tem direito a acessar, corrigir, exportar, revogar consentimentos 
                  e excluir seus dados pessoais a qualquer momento. Todos os seus direitos 
                  estão garantidos pela LGPD.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-primary"
                  onClick={() => navigate('/privacidade')}
                >
                  Ver Política de Privacidade completa →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Direitos */}
        <div className="space-y-3">
          {rights.map((right) => {
            const Icon = right.icon;
            return (
              <Card key={right.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${right.iconBg}`}>
                          <Icon className={`h-5 w-5 ${right.iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-foreground">
                            {right.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {right.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant={right.isDestructive ? "destructive" : "default"}
                      size="sm"
                      onClick={right.action}
                      className="flex-shrink-0"
                    >
                      {right.actionLabel}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Aviso sobre exclusão */}
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-200">
                  Exclusão permanente
                </p>
                <p className="text-xs text-red-800 dark:text-red-300">
                  A exclusão da conta é permanente e irreversível. Todos os seus dados 
                  serão removidos do sistema, incluindo relatos, avaliações e histórico. 
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão voltar */}
        <div className="pt-4">
          <Button
            variant="outline"
            onClick={() => navigate("/perfil")}
            className="w-full"
          >
            Voltar ao Perfil
          </Button>
        </div>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Excluir Conta Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                Você está prestes a excluir sua conta permanentemente. Esta ação 
                <strong className="text-foreground"> não pode ser desfeita</strong>.
              </p>
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Serão excluídos:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Seu perfil e dados pessoais</li>
                  <li>Todos os seus relatos (urbanos e transporte)</li>
                  <li>Suas avaliações de serviços</li>
                  <li>Histórico de conversas</li>
                  <li>Consentimentos e preferências</li>
                  <li>Todos os outros dados associados à sua conta</li>
                </ul>
              </div>
              <div className="pt-2">
                <Label htmlFor="confirm-delete" className="text-sm font-medium">
                  Digite <strong className="text-red-600">EXCLUIR</strong> para confirmar:
                </Label>
                <Input
                  id="confirm-delete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  className="mt-2"
                  disabled={loading}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={loading || deleteConfirmText !== "EXCLUIR"}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Excluindo..." : "Excluir Conta Permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserRightsPage;
