import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useDashboardPresets, type DashboardPreset } from "@/hooks/useDashboardPresets";
import { useWidgetTheme } from "@/hooks/useWidgetTheme";
import { getTheme } from "@/lib/widgetThemes";

/**
 * HU-6.2 — Modal "Salvar configuração atual".
 *
 * Captura o tema atualmente ativo (via WidgetThemeContext) e o salva como
 * preset nomeado. Validação:
 *  - Nome obrigatório (trim > 0, <= 80 chars).
 *  - Nome não pode duplicar outro preset do mesmo usuário (DB também valida
 *    via UNIQUE, mas pegamos no client pra UX).
 */

interface SavePresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SavePresetDialog({ open, onOpenChange }: SavePresetDialogProps) {
  const { theme: currentTheme, widgetConfig } = useWidgetTheme();
  const { presets, create } = useDashboardPresets();

  const [name, setName] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reset quando abre.
  useEffect(() => {
    if (open) {
      setName("");
      setMakeDefault(false);
      setBusy(false);
    }
  }, [open]);

  const themeMeta = useMemo(() => getTheme(currentTheme), [currentTheme]);

  const nameTrimmed = name.trim();
  const nameError = useMemo<string | null>(() => {
    if (!nameTrimmed) return null; // mostra erro só após tentar salvar
    if (nameTrimmed.length > 80) return "Use até 80 caracteres.";
    const dup = presets.find(
      (p) => p.name.localeCompare(nameTrimmed, "pt-BR", { sensitivity: "base" }) === 0,
    );
    if (dup) return "Já existe uma configuração com este nome.";
    return null;
  }, [nameTrimmed, presets]);

  const canSubmit = nameTrimmed.length > 0 && !nameError && !busy;

  const handleSave = async () => {
    if (!canSubmit) return;
    setBusy(true);
    const created = await create({
      name: nameTrimmed,
      theme: currentTheme,
      config: widgetConfig,
      isDefault: makeDefault,
    });
    setBusy(false);
    if (created) {
      toast.success(`Configuração "${created.name}" salva.`);
      onOpenChange(false);
    } else {
      toast.error("Não foi possível salvar a configuração.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar configuração atual</DialogTitle>
          <DialogDescription>
            Captura o tema selecionado para você reaplicar depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="preset-name">Nome da configuração</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ex.: "Saúde — atendimento prioritário"'
              maxLength={80}
              autoFocus
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) {
                  e.preventDefault();
                  void handleSave();
                }
              }}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <div className="text-muted-foreground text-xs mb-0.5">Tema atual</div>
            <div className="font-medium">{themeMeta.label}</div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="preset-default"
              checked={makeDefault}
              onCheckedChange={(v) => setMakeDefault(v === true)}
              disabled={busy}
            />
            <Label htmlFor="preset-default" className="text-sm cursor-pointer leading-snug">
              Definir como padrão
              <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                Aplica automaticamente esta configuração ao abrir a análise.
              </span>
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSubmit}>
            {busy ? "Salvando..." : "Salvar configuração"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Reexport conveniente para consumidores que recebam DashboardPreset.
export type { DashboardPreset };
