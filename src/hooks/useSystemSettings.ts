import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: unknown;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export const useSystemSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Map<string, unknown>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from("system_settings").select("*");

      if (error) throw error;

      const settingsMap = new Map();
      data?.forEach((setting: SystemSetting) => {
        settingsMap.set(setting.setting_key, setting.setting_value);
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error("Error fetching system settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSetting = (key: string, defaultValue?: unknown) => {
    return settings.get(key) ?? defaultValue;
  };

  const updateSetting = async (key: string, value: unknown) => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase.from("system_settings").upsert(
        {
          setting_key: key,
          setting_value: value,
          updated_by: user.id,
        },
        {
          onConflict: "setting_key",
        },
      );

      if (error) throw error;

      setSettings(new Map(settings.set(key, value)));
      toast.success("Configuração atualizada");
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Erro ao atualizar configuração");
      throw error;
    }
  };

  const deleteSetting = async (key: string) => {
    try {
      const { error } = await supabase.from("system_settings").delete().eq("setting_key", key);

      if (error) throw error;

      const newSettings = new Map(settings);
      newSettings.delete(key);
      setSettings(newSettings);

      toast.success("Configuração removida");
    } catch (error) {
      console.error("Error deleting setting:", error);
      toast.error("Erro ao remover configuração");
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();

    // Subscribe para atualizações em tempo real
    const channel = supabase
      .channel("system_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_settings" },
        fetchSettings,
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return {
    settings,
    loading,
    getSetting,
    updateSetting,
    deleteSetting,
    refetch: fetchSettings,
  };
};
