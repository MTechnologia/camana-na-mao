import { useMemo, useState } from "react";
import { Check, Copy, Edit2, Star, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  useDashboardPresets,
  type DashboardPreset,
} from "@/hooks/useDashboardPresets";
import { getTheme } from "@/lib/widgetThemes";
import { cn } from "@/lib/utils";

/**
 * HU-6.2 — Modal de gerenciamento dos presets.
 *
 * Lista os presets do usuário com ações: renomear inline, marcar como padrão,
 * duplicar, excluir. Confirmação destrutiva via AlertDialog.
 */

interface ManagePresetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagePresetsDialog({ open, onOpenChange }: ManagePresetsDialogProps) {
  const { presets, update, remove, create, setDefault, isLoading } = useDashboardPresets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<DashboardPreset | null>(null);

  const startEdit = (p: DashboardPreset) => {
    setEditingId(p.id);
    setEditName(p.name);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };
  const commitEdit = async (p: DashboardPreset) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }
    if (trimmed === p.name) {
      cancelEdit();
      return;
    }
    // Verifica duplicidade (case-insensitive)
    const dup = presets.find(
      (other) =>
        other.id !== p.id &&
        other.name.localeCompare(trimmed, "pt-BR", { sensitivity: "base" }) === 0,
    );
    if (dup) {
      toast.error("Já existe uma configuração com esse nome.");
      return;
    }
    await update(p.id, { name: trimmed });
    cancelEdit();
    toast.success("Configuração renomeada.");
  };

  const handleDuplicate = async (p: DashboardPreset) => {
    const base = p.name;
    // Gera "Nome (cópia)", "Nome (cópia 2)", etc., único.
    let newName = `${base} (cópia)`;
    let n = 2;
    while (
      presets.find(
        (other) =>
          other.name.localeCompare(newName, "pt-BR", { sensitivity: "base" }) === 0,
      )
    ) {
      newName = `${base} (cópia ${n})`;
      n += 1;
      if (n > 50) break;
    }
    const created = await create({
      name: newName,
      theme: p.theme,
      config: p.config,
      isDefault: false,
    });
    if (created) toast.success(`Duplicada como "${created.name}".`);
  };

  const handleSetDefault = async (p: DashboardPreset) => {
    if (p.isDefault) return;
    await setDefault(p.id);
    toast.success(`"${p.name}" definida como padrão.`);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const name = confirmDelete.name;
    await remove(confirmDelete.id);
    setConfirmDelete(null);
    toast.success(`Configuração "${name}" excluída.`);
  };

  const sortedPresets = useMemo(() => presets, [presets]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar configurações</DialogTitle>
            <DialogDescription>
              Renomeie, duplique, defina como padrão ou exclua suas configurações salvas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {isLoading && presets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : sortedPresets.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma configuração salva ainda. Use "Salvar atual..." no
                dropdown de configurações para criar a primeira.
              </Card>
            ) : (
              sortedPresets.map((p) => {
                const themeMeta = getTheme(p.theme);
                const isEditing = editingId === p.id;
                return (
                  <Card key={p.id} className="p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        {isEditing ? (
                          <Input
                            value={editName}
                            autoFocus
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={() => void commitEdit(p)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void commitEdit(p);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEdit();
                              }
                            }}
                            className="h-8"
                            maxLength={80}
                          />
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{p.name}</span>
                            {p.isDefault && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1">
                                <Star className="h-2.5 w-2.5 fill-current" />
                                Padrão
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Tema: <span className={cn("font-medium", themeMeta.accentClass)}>{themeMeta.label}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-auto">
                        {!isEditing && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => void handleSetDefault(p)}
                              disabled={p.isDefault}
                              title={p.isDefault ? "Já é o padrão" : "Definir como padrão"}
                            >
                              <Star
                                className={cn(
                                  "h-3.5 w-3.5",
                                  p.isDefault && "fill-current text-primary",
                                )}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => startEdit(p)}
                              title="Renomear"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => void handleDuplicate(p)}
                              title="Duplicar"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-destructive hover:text-destructive"
                              onClick={() => setConfirmDelete(p)}
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => void commitEdit(p)}
                            title="Confirmar"
                          >
                            <Check className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir configuração?</AlertDialogTitle>
            <AlertDialogDescription>
              A configuração <strong>"{confirmDelete?.name}"</strong> será removida
              permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
