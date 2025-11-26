import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Lock, Eye, Mail, MessageSquare, Smartphone } from "lucide-react";

interface PreferencesFormProps {
  userId: string;
}

interface Preferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  newsletter: boolean;
  profile_visibility: 'public' | 'private' | 'friends';
  show_email: boolean;
  show_phone: boolean;
}

const PreferencesForm = ({ userId }: PreferencesFormProps) => {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    newsletter: false,
    profile_visibility: 'public',
    show_email: false,
    show_phone: false,
  });

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          email_notifications: data.email_notifications,
          push_notifications: data.push_notifications,
          sms_notifications: data.sms_notifications,
          newsletter: data.newsletter,
          profile_visibility: data.profile_visibility as 'public' | 'private' | 'friends',
          show_email: data.show_email,
          show_phone: data.show_phone,
        });
      }
    } catch (error: any) {
      console.error("Error loading preferences:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success("Preferências atualizadas com sucesso!");
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast.error(error.message || "Erro ao salvar preferências");
    } finally {
      setLoading(false);
    }
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
              checked={preferences.email_notifications}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, email_notifications: checked }))
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
              checked={preferences.push_notifications}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, push_notifications: checked }))
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
              checked={preferences.sms_notifications}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, sms_notifications: checked }))
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
              checked={preferences.newsletter}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, newsletter: checked }))
              }
            />
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
              value={preferences.profile_visibility}
              onValueChange={(value: 'public' | 'private' | 'friends') =>
                setPreferences(prev => ({ ...prev, profile_visibility: value }))
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
              checked={preferences.show_email}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, show_email: checked }))
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
              checked={preferences.show_phone}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, show_phone: checked }))
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
