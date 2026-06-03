import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RotateCcw, Upload } from "lucide-react";
import { SettingsLayout } from "@/components/admin/settings/SettingsLayout";
import { useConfigEnvironment } from "@/contexts/ConfigEnvironmentContext";
import { useAiConfig } from "@/hooks/useAiConfig";
import { useUserRole } from "@/hooks/useUserRole";
import { runAiSandboxTest } from "@/lib/aiConfigApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AiVersionStatus, PromptTemplateDefinition } from "@/types/systemConfig";

const statusVariant: Record<AiVersionStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

const statusLabel: Record<AiVersionStatus, string> = {
  active: "Ativa",
  draft: "Rascunho",
  archived: "Arquivada",
};

export function AiConfigPage() {
  const { config, environment, environmentLabel, aiConfigLoading, aiConfigError, refetchAiConfig } =
    useConfigEnvironment();
  const { canConfigureSystem } = useUserRole();
  const {
    publishVersion,
    isPublishing,
    reactivateVersion,
    isReactivating,
    createDraft,
    isCreatingDraft,
    savePolicy,
    isSavingPolicy,
    updateTemplate,
    isUpdatingTemplate,
  } = useAiConfig(environment);

  const [policy, setPolicy] = useState(config.rollbackPolicy);
  const [sandboxMsg, setSandboxMsg] = useState("");
  const [sandboxReply, setSandboxReply] = useState<string | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplateDefinition | null>(null);

  useEffect(() => {
    setPolicy(config.rollbackPolicy);
  }, [config.rollbackPolicy]);

  const active = config.aiVersions.find((v) => v.status === "active");
  const busy =
    isPublishing || isReactivating || isCreatingDraft || isSavingPolicy || isUpdatingTemplate;

  const handlePublish = async (versionId: string, versionLabel: string) => {
    try {
      await publishVersion(versionId);
      toast.success("Versão publicada", {
        description: `${versionLabel} em ${environmentLabel}. Monitorando acurácia por ${policy.observationHours}h.`,
      });
    } catch (e) {
      toast.error("Falha ao publicar", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    }
  };

  const handleReactivate = async (versionId: string, versionLabel: string) => {
    try {
      await reactivateVersion(versionId);
      toast.success("Versão reativada", { description: `${versionLabel} em ${environmentLabel}.` });
    } catch (e) {
      toast.error("Falha ao reativar", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    }
  };

  const handleNewDraft = async () => {
    try {
      await createDraft();
      toast.success("Rascunho criado", { description: `Ambiente: ${environmentLabel}.` });
    } catch (e) {
      toast.error("Falha ao criar rascunho", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    }
  };

  const handleSavePolicy = async () => {
    try {
      await savePolicy(policy);
      toast.success("Política salva", {
        description: `Rollback se queda > ${policy.maxAccuracyDropPct}% em ${policy.observationHours}h.`,
      });
    } catch (e) {
      toast.error("Falha ao salvar política", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    }
  };

  const handleSandbox = async () => {
    const msg = sandboxMsg.trim();
    if (!msg) {
      toast.message("Digite uma mensagem de teste");
      return;
    }
    setSandboxLoading(true);
    setSandboxReply(null);
    try {
      const reply = await runAiSandboxTest(msg);
      setSandboxReply(reply);
      toast.message("Sandbox", { description: "Resposta de teste — não afeta cidadãos." });
    } catch (e) {
      toast.error("Erro no sandbox", {
        description:
          e instanceof Error ? e.message : "Verifique login e deploy do ai-orchestrator.",
      });
    } finally {
      setSandboxLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      await updateTemplate({
        slug: editingTemplate.id,
        patch: {
          name: editingTemplate.name,
          description: editingTemplate.description,
          body: editingTemplate.body,
          variables: editingTemplate.variables,
        },
      });
      toast.success("Template atualizado");
      setEditingTemplate(null);
      refetchAiConfig();
    } catch (e) {
      toast.error("Falha ao salvar template", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    }
  };

  return (
    <SettingsLayout
      title="IA — versionamento e templates"
      description="Templates com variáveis validadas, publicação por ambiente e rollback automático. A versão ativa alimenta o ai-orchestrator (prompt + modelo)."
      actions={
        <Button
          type="button"
          size="sm"
          className="gap-2"
          disabled={!canConfigureSystem || busy || aiConfigLoading}
          onClick={() => void handleNewDraft()}
        >
          {isCreatingDraft ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Nova versão
        </Button>
      }
    >
      {aiConfigError ? (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Não foi possível carregar a configuração de IA. Verifique permissões de admin e se a
          migration foi aplicada.{" "}
          <button type="button" className="underline" onClick={() => refetchAiConfig()}>
            Tentar novamente
          </button>
        </p>
      ) : null}

      {aiConfigLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Carregando versões e templates…
        </div>
      ) : (
        <Tabs defaultValue="versions">
          <TabsList>
            <TabsTrigger value="versions">Versões</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="rollback">Rollback automático</TabsTrigger>
            <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Versão</th>
                    <th className="px-4 py-3">Template</th>
                    <th className="px-4 py-3">Modelo</th>
                    <th className="px-4 py-3">Acurácia</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {config.aiVersions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                        Nenhuma versão cadastrada neste ambiente.
                      </td>
                    </tr>
                  ) : (
                    config.aiVersions.map((v) => (
                      <tr key={v.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs font-medium">{v.version}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.templateName}</td>
                        <td className="px-4 py-3">{v.modelId}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {v.accuracyPct != null ? `${v.accuracyPct}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant[v.status]}>{statusLabel[v.status]}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {v.status === "draft" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              disabled={!canConfigureSystem || busy}
                              onClick={() => void handlePublish(v.id, v.version)}
                            >
                              <Upload className="h-3.5 w-3.5" aria-hidden />
                              Publicar
                            </Button>
                          ) : v.status === "archived" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              disabled={!canConfigureSystem || busy}
                              onClick={() => void handleReactivate(v.id, v.version)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                              Reativar
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {v.publishedBy ? `Por ${v.publishedBy}` : "Em produção"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {active ? (
              <Card>
                <CardContent className="space-y-2 p-4">
                  <p className="text-xs text-muted-foreground">
                    O modelo <strong className="font-mono">{active.modelId}</strong> da versão ativa
                    é usado pelo chat quando publicada (fallback: secret{" "}
                    <code className="text-xs">AI_CHAT_MODEL</code>
                    ). O bloco institucional abaixo é injetado antes do prompt operacional do
                    assistente.
                  </p>
                  <p className="text-sm font-medium">Versão ativa — preview do template</p>
                  <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
                    {active.body}
                  </pre>
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {active.variables.map((k) => `{{${k}}}`).join(", ")}
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="templates" className="grid gap-4 lg:grid-cols-2">
            {config.promptTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum template cadastrado.</p>
            ) : (
              config.promptTemplates.map((tpl) => (
                <Card key={tpl.id}>
                  <CardContent className="space-y-3 p-4">
                    <div>
                      <p className="font-medium">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground">{tpl.description}</p>
                    </div>
                    <pre className="max-h-32 overflow-auto rounded-md bg-muted p-3 text-xs">
                      {tpl.body}
                    </pre>
                    <ul className="space-y-1 text-xs">
                      {tpl.variables.map((v) => (
                        <li key={v.key} className="flex justify-between gap-2">
                          <code className="rounded bg-muted px-1">{`{{${v.key}}}`}</code>
                          <span className="text-muted-foreground">
                            {v.label}
                            {v.required ? " *" : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canConfigureSystem}
                      onClick={() => setEditingTemplate({ ...tpl })}
                    >
                      Editar template
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="rollback">
            <Card>
              <CardContent className="space-y-4 p-4">
                <p className="text-sm text-muted-foreground">
                  Se a acurácia cair mais que o limite após publicação, o backend reverte
                  automaticamente para a versão anterior em <strong>{environmentLabel}</strong>.
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={policy.enabled}
                    disabled={!canConfigureSystem}
                    onChange={(e) => setPolicy((p) => ({ ...p, enabled: e.target.checked }))}
                    className="rounded border-input"
                  />
                  Rollback automático habilitado
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="max-drop">Queda máxima de acurácia (%)</Label>
                    <Input
                      id="max-drop"
                      type="number"
                      min={1}
                      max={20}
                      disabled={!canConfigureSystem}
                      value={policy.maxAccuracyDropPct}
                      onChange={(e) =>
                        setPolicy((p) => ({
                          ...p,
                          maxAccuracyDropPct: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="obs-hours">Janela de observação (horas)</Label>
                    <Input
                      id="obs-hours"
                      type="number"
                      min={1}
                      max={168}
                      disabled={!canConfigureSystem}
                      value={policy.observationHours}
                      onChange={(e) =>
                        setPolicy((p) => ({
                          ...p,
                          observationHours: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={!canConfigureSystem || isSavingPolicy}
                  onClick={() => void handleSavePolicy()}
                >
                  {isSavingPolicy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  Salvar política
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sandbox">
            <Card>
              <CardContent className="space-y-3 p-4">
                <Label htmlFor="sandbox-msg">Mensagem de teste</Label>
                <textarea
                  id="sandbox-msg"
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Ex.: Relato sobre fila na UBS da Zona Sul..."
                  value={sandboxMsg}
                  onChange={(e) => setSandboxMsg(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={sandboxLoading || !canConfigureSystem}
                  onClick={() => void handleSandbox()}
                >
                  {sandboxLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  Enviar teste
                </Button>
                {sandboxReply ? (
                  <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                    {sandboxReply}
                  </pre>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar template</DialogTitle>
          </DialogHeader>
          {editingTemplate ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name">Nome</Label>
                <Input
                  id="tpl-name"
                  value={editingTemplate.name}
                  onChange={(e) =>
                    setEditingTemplate((t) => (t ? { ...t, name: e.target.value } : t))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-desc">Descrição</Label>
                <Input
                  id="tpl-desc"
                  value={editingTemplate.description}
                  onChange={(e) =>
                    setEditingTemplate((t) => (t ? { ...t, description: e.target.value } : t))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-body">Corpo do prompt</Label>
                <textarea
                  id="tpl-body"
                  className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                  value={editingTemplate.body}
                  onChange={(e) =>
                    setEditingTemplate((t) => (t ? { ...t, body: e.target.value } : t))
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isUpdatingTemplate}
              onClick={() => void handleSaveTemplate()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
