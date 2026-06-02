import { AdminLayout } from "@/layouts/AdminLayout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Eye, Type, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Skeleton } from "@/components/ui/skeleton";

type FontSize = "small" | "medium" | "large";

const AccessibilitySettings = () => {
  const { getSetting, updateSetting, loading } = useSystemSettings();
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [readingMode, setReadingMode] = useState(false);
  const [textSpacing, setTextSpacing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setFontSize(getSetting("accessibility.fontSize", "medium"));
      setReadingMode(getSetting("accessibility.readingMode", false));
      setTextSpacing(getSetting("accessibility.textSpacing", false));
    }
  }, [loading, getSetting]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await updateSetting("accessibility.fontSize", fontSize);
      await updateSetting("accessibility.readingMode", readingMode);
      await updateSetting("accessibility.textSpacing", textSpacing);
      toast.success("Configurações salvas com sucesso");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações de Acessibilidade</h1>
          <p className="text-muted-foreground">
            Configure opções globais de acessibilidade do sistema
          </p>
        </div>

        {loading ? (
          <Card className="p-6">
            <Skeleton className="h-32" />
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Type className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Tamanho de Fonte</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Tamanho Padrão</Label>
                <Select value={fontSize} onValueChange={(value: FontSize) => setFontSize(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequeno (14px)</SelectItem>
                    <SelectItem value="medium">Médio (16px)</SelectItem>
                    <SelectItem value="large">Grande (18px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="text-spacing">Espaçamento Aumentado</Label>
                  <p className="text-xs text-muted-foreground">Melhora a legibilidade</p>
                </div>
                <Switch id="text-spacing" checked={textSpacing} onCheckedChange={setTextSpacing} />
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <Card className="p-6">
            <Skeleton className="h-24" />
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Modo de Leitura</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="reading-mode">Alto Contraste</Label>
                <p className="text-xs text-muted-foreground">Cores de alto contraste</p>
              </div>
              <Switch id="reading-mode" checked={readingMode} onCheckedChange={setReadingMode} />
            </div>
          </Card>
        )}

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={isSaving || loading} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AccessibilitySettings;
