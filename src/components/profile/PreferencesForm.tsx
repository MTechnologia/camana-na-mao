import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Lock, Eye, MessageSquare } from "lucide-react";
import { NOTIFICATION_CATEGORIES } from "@/constants/notificationTypes";

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

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      // Load notification settings
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

      // Load privacy settings from user_preferences
      const { data: privData, error: privError } = await supabase
        .from('user_preferences')
        .select('profile_visibility, show_email, show_phone')
        .eq('user_id', userId)
        .maybeSingle();

      if (privError && privError.code !== 'PGRST116') throw privError;

      if (privData) {
        setPrivacySettings({
          profile_visibility: privData.profile_visibility as 'public' | 'private' | 'friends',
          show_email: privData.show_email,
          show_phone: privData.show_phone,
        });
      }
    } catch (error: any) {
      console.error("Error loading preferences:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save notification settings
      const { error: notifError } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          push_enabled: notificationSettings.push_enabled,
          email_enabled: notificationSettings.email_enabled,
          sms_enabled: notificationSettings.sms_enabled,
          newsletter_enabled: notificationSettings.newsletter_enabled,
          categories_enabled: notificationSettings.categories_enabled,
          quiet_hours_start: notificationSettings.quiet_hours_start,
          quiet_hours_end: notificationSettings.quiet_hours_end,
        }, {
          onConflict: 'user_id'
        });

      if (notifError) throw notifError;

      // Save privacy settings
      const { error: privError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          profile_visibility: privacySettings.profile_visibility,
          show_email: privacySettings.show_email,
          show_phone: privacySettings.show_phone,
          // Keep existing notification fields synced
          push_notifications: notificationSettings.push_enabled,
          email_notifications: notificationSettings.email_enabled,
          sms_notifications: notificationSettings.sms_enabled,
          newsletter: notificationSettings.newsletter_enabled,
        }, {
          onConflict: 'user_id'
        });

      if (privError) throw privError;

      toast.success("Preferências atualizadas com sucesso!");
    } catch (error: any) {
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
    <div className="space-y-6">
      {/* Notificações */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Notificações</h3>
        </div>

        <div className="space-y-4 pl-7">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="email-notif" className="text-base">
                E-mail
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações por e-mail
              </p>
            </div>
            <Switch
              id="email-notif"
              checked={notificationSettings.email_enabled}
              onCheckedChange={(checked) =>
                setNotificationSettings(prev => ({ ...prev, email_enabled: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="push-notif" className="text-base">
                Push
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações push no navegador
              </p>
            </div>
            <Switch
              id="push-notif"
              checked={notificationSettings.push_enabled}
              onCheckedChange={(checked) =>
                setNotificationSettings(prev => ({ ...prev, push_enabled: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="sms-notif" className="text-base">
                SMS
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações por SMS
              </p>
            </div>
            <Switch
              id="sms-notif"
              checked={notificationSettings.sms_enabled}
              onCheckedChange={(checked) =>
                setNotificationSettings(prev => ({ ...prev, sms_enabled: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="newsletter" className="text-base">
                Newsletter
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber newsletter e atualizações
              </p>
            </div>
            <Switch
              id="newsletter"
              checked={notificationSettings.newsletter_enabled}
              onCheckedChange={(checked) =>
                setNotificationSettings(prev => ({ ...prev, newsletter_enabled: checked }))
              }
            />
          </div>

          {/* Categorias de Notificação */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-base">Categorias de interesse</Label>
            <p className="text-sm text-muted-foreground">
              Selecione quais tipos de notificação deseja receber
            </p>
            <div className="grid grid-cols-2 gap-3">
              {NOTIFICATION_CATEGORIES.map((category) => (
                <div key={category.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${category.value}`}
                    checked={notificationSettings.categories_enabled.includes(category.value)}
                    onCheckedChange={() => toggleCategory(category.value)}
                  />
                  <Label 
                    htmlFor={`cat-${category.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {category.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Privacidade */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Privacidade</h3>
        </div>

        <div className="space-y-4 pl-7">
          <div className="space-y-2">
            <Label htmlFor="visibility" className="text-base">
              Visibilidade do Perfil
            </Label>
            <Select
              value={privacySettings.profile_visibility}
              onValueChange={(value: 'public' | 'private' | 'friends') =>
                setPrivacySettings(prev => ({ ...prev, profile_visibility: value }))
              }
            >
              <SelectTrigger id="visibility" className="h-12">
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
            <p className="text-sm text-muted-foreground">
              Controle quem pode ver seu perfil
            </p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="show-email" className="text-base">
                Mostrar E-mail
              </Label>
              <p className="text-sm text-muted-foreground">
                Exibir e-mail publicamente no perfil
              </p>
            </div>
            <Switch
              id="show-email"
              checked={privacySettings.show_email}
              onCheckedChange={(checked) =>
                setPrivacySettings(prev => ({ ...prev, show_email: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="show-phone" className="text-base">
                Mostrar Telefone
              </Label>
              <p className="text-sm text-muted-foreground">
                Exibir telefone publicamente no perfil
              </p>
            </div>
            <Switch
              id="show-phone"
              checked={privacySettings.show_phone}
              onCheckedChange={(checked) =>
                setPrivacySettings(prev => ({ ...prev, show_phone: checked }))
              }
            />
          </div>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={loading}
        className="w-full h-12 bg-foreground text-background hover:bg-foreground/90"
      >
        {loading ? "Salvando..." : "Salvar Preferências"}
      </Button>
    </div>
  );
};

export default PreferencesForm;
