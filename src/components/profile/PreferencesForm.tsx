import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Lock, Eye, MessageSquare, Mail, Smartphone, CalendarDays, ArrowRight, Users, FileWarning } from "lucide-react";
import { Link } from "react-router-dom";
import { NOTIFICATION_CATEGORIES } from "@/constants/notificationTypes";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useUserRole } from "@/hooks/useUserRole";

interface PreferencesFormProps {
  userId: string;
}

interface NotificationSettings {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  newsletter_enabled: boolean;
  categories_enabled: string[];
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'friends';
  show_email: boolean;
  show_phone: boolean;
}

const PreferencesForm = ({ userId }: PreferencesFormProps) => {
  const [loading, setLoading] = useState(false);
  const { subscribe, supported: pushSupported } = usePushNotifications();
  const { isAdmin, isGestor } = useUserRole();
  const [adminNotifyNewUsers, setAdminNotifyNewUsers] = useState(true);
  const [adminNotifyNewReports, setAdminNotifyNewReports] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    push_enabled: true,
    email_enabled: true,
    sms_enabled: false,
    newsletter_enabled: false,
    categories_enabled: ['legislativa', 'servico', 'transporte', 'urbano'],
    quiet_hours_start: null,
    quiet_hours_end: null,
  });
  
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profile_visibility: 'public',
    show_email: false,
    show_phone: false,
  });

  const loadPreferences = useCallback(async () => {
    try {
      const { data: notifData, error: notifError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (notifError && notifError.code !== 'PGRST116') throw notifError;

      if (notifData) {
        setNotificationSettings({
          push_enabled: notifData.push_enabled ?? true,
          email_enabled: notifData.email_enabled ?? true,
          sms_enabled: notifData.sms_enabled ?? false,
          newsletter_enabled: notifData.newsletter_enabled ?? false,
          categories_enabled: notifData.categories_enabled ?? ['legislativa', 'servico', 'transporte', 'urbano'],
          quiet_hours_start: notifData.quiet_hours_start,
          quiet_hours_end: notifData.quiet_hours_end,
        });
      }

      const { data: privData, error: privError } = await supabase
        .from('user_preferences')
        .select('profile_visibility, show_email, show_phone, notify_new_users, notify_new_reports')
        .eq('user_id', userId)
        .maybeSingle();

      if (privError && privError.code !== 'PGRST116') throw privError;

      if (privData) {
        setPrivacySettings({
          profile_visibility: privData.profile_visibility as 'public' | 'private' | 'friends',
          show_email: privData.show_email,
          show_phone: privData.show_phone,
        });
        if (privData.notify_new_users !== undefined) setAdminNotifyNewUsers(privData.notify_new_users);
        if (privData.notify_new_reports !== undefined) setAdminNotifyNewReports(privData.notify_new_reports);
      }
    } catch (error: unknown) {
      console.error("Error loading preferences:", error);
    }
  }, [userId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error: notifError } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          push_enabled: notificationSettings.push_enabled,
          email_enabled: notificationSettings.email_enabled,
          sms_enabled: false,
          newsletter_enabled: notificationSettings.newsletter_enabled,
          categories_enabled: notificationSettings.categories_enabled,
          quiet_hours_start: notificationSettings.quiet_hours_start,
          quiet_hours_end: notificationSettings.quiet_hours_end,
        }, {
          onConflict: 'user_id'
        });

      if (notifError) throw notifError;

      const privPayload: Record<string, unknown> = {
        user_id: userId,
        profile_visibility: privacySettings.profile_visibility,
        show_email: privacySettings.show_email,
        show_phone: privacySettings.show_phone,
        push_notifications: notificationSettings.push_enabled,
        email_notifications: notificationSettings.email_enabled,
        sms_notifications: false,
        newsletter: notificationSettings.newsletter_enabled,
      };
      if (isAdmin || isGestor) {
        privPayload.notify_new_users = adminNotifyNewUsers;
        privPayload.notify_new_reports = adminNotifyNewReports;
      }
      const { error: privError } = await supabase
        .from('user_preferences')
        .upsert(privPayload, { onConflict: 'user_id' });

      if (privError) throw privError;

      toast.success("Preferências atualizadas com sucesso!");
    } catch (error: unknown) {
      console.error("Error saving preferences:", error);
      toast.error(error.message || "Erro ao salvar preferências");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setNotificationSettings(prev => ({
      ...prev,
      categories_enabled: prev.categories_enabled.includes(category)
        ? prev.categories_enabled.filter(c => c !== category)
        : [...prev.categories_enabled, category]
    }));
  };

  return (
    <div className="space-y-4">
      {/* Card: Notificações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Notificações
          </CardTitle>
          <CardDescription>
            Escolha como deseja receber atualizações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="email-notif" className="text-sm font-medium">
                  E-mail
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receber por e-mail
                </p>
              </div>
            </div>
            <Switch
              id="email-notif"
              checked={notificationSettings.email_enabled}
              onCheckedChange={(checked) =>
                setNotificationSettings(prev => ({ ...prev, email_enabled: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="push-notif" className="text-sm font-medium">
                  Push
                </Label>
                <p className="text-xs text-muted-foreground">
                  {pushSupported
                    ? "Notificações no navegador (permita quando solicitado)"
                    : "Push não suportado neste navegador"}
                </p>
              </div>
            </div>
            <Switch
              id="push-notif"
              checked={notificationSettings.push_enabled}
              disabled={!pushSupported}
              onCheckedChange={(checked) => {
                if (!checked || !pushSupported) {
                  setNotificationSettings((prev) => ({ ...prev, push_enabled: checked }));
                  return;
                }
                // Pedir permissão no mesmo momento do clique para o navegador exibir o diálogo
                Notification.requestPermission().then(async (permission) => {
                  setNotificationSettings((prev) => ({ ...prev, push_enabled: checked }));
                  if (permission === "granted") {
                    const ok = await subscribe(userId);
                    if (ok) toast.success("Notificações push ativadas");
                    else toast.info("Permita notificações no navegador ou tente novamente.");
                  } else {
                    toast.info(
                      permission === "denied"
                        ? "Notificações bloqueadas. Para ativar: ícone de cadeado na barra de endereço → Configurações do site → Notificações → Permitir."
                        : "Permita notificações no navegador ou tente novamente."
                    );
                  }
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="newsletter" className="text-sm font-medium">
                  Newsletter
                </Label>
                <p className="text-xs text-muted-foreground">
                  Resumo semanal
                </p>
              </div>
            </div>
            <Switch
              id="newsletter"
              checked={notificationSettings.newsletter_enabled}
              onCheckedChange={(checked) =>
                setNotificationSettings(prev => ({ ...prev, newsletter_enabled: checked }))
              }
            />
          </div>

          {/* Categorias */}
          <div className="pt-3 border-t space-y-3">
            <div>
              <Label className="text-sm font-medium">Categorias</Label>
              <p className="text-xs text-muted-foreground">
                Tipos de notificação que deseja receber
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NOTIFICATION_CATEGORIES.map((category) => (
                <div key={category.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${category.value}`}
                    checked={notificationSettings.categories_enabled.includes(category.value)}
                    onCheckedChange={() => toggleCategory(category.value)}
                  />
                  <Label 
                    htmlFor={`cat-${category.value}`}
                    className="text-xs font-normal cursor-pointer"
                  >
                    {category.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card: Notificações para administradores (apenas admin/gestor) */}
      {(isAdmin || isGestor) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notificações para administradores
            </CardTitle>
            <CardDescription>
              Escolha se deseja receber alertas de novas ações na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="admin-notify-new-users" className="text-sm font-medium">
                    Novos usuários cadastrados
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receber notificação quando um cidadão se cadastrar
                  </p>
                </div>
              </div>
              <Switch
                id="admin-notify-new-users"
                checked={adminNotifyNewUsers}
                onCheckedChange={setAdminNotifyNewUsers}
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <FileWarning className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="admin-notify-new-reports" className="text-sm font-medium">
                    Novos relatos (urbano e transporte)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receber notificação quando um cidadão abrir um relato
                  </p>
                </div>
              </div>
              <Switch
                id="admin-notify-new-reports"
                checked={adminNotifyNewReports}
                onCheckedChange={setAdminNotifyNewReports}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card: Lembretes de audiências */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Lembretes de audiências
          </CardTitle>
          <CardDescription>
            Receba lembretes no celular ou e-mail das audiências em que você se inscrever
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ative as notificações acima (Push e/ou E-mail) e, na página de Audiências públicas, use &quot;Receber lembretes&quot; nas audiências de seu interesse. Você receberá confirmação e lembretes antes do evento.
          </p>
          <Button variant="outline" className="w-full gap-2" asChild>
            <Link to="/audiencias">
              Ver audiências e me inscrever para lembretes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Card: Privacidade */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Privacidade
          </CardTitle>
          <CardDescription>
            Controle a visibilidade do seu perfil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visibility" className="text-sm font-medium">
              Visibilidade do Perfil
            </Label>
            <Select
              value={privacySettings.profile_visibility}
              onValueChange={(value: 'public' | 'private' | 'friends') =>
                setPrivacySettings(prev => ({ ...prev, profile_visibility: value }))
              }
            >
              <SelectTrigger id="visibility" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Público
                  </div>
                </SelectItem>
                <SelectItem value="friends">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Amigos
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Privado
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="show-email" className="text-sm font-medium">
                  Mostrar E-mail
                </Label>
                <p className="text-xs text-muted-foreground">
                  Exibir no perfil público
                </p>
              </div>
            </div>
            <Switch
              id="show-email"
              checked={privacySettings.show_email}
              onCheckedChange={(checked) =>
                setPrivacySettings(prev => ({ ...prev, show_email: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="show-phone" className="text-sm font-medium">
                  Mostrar Telefone
                </Label>
                <p className="text-xs text-muted-foreground">
                  Exibir no perfil público
                </p>
              </div>
            </div>
            <Switch
              id="show-phone"
              checked={privacySettings.show_phone}
              onCheckedChange={(checked) =>
                setPrivacySettings(prev => ({ ...prev, show_phone: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={loading}
        className="w-full h-11"
      >
        {loading ? "Salvando..." : "Salvar Preferências"}
      </Button>
    </div>
  );
};

export default PreferencesForm;
