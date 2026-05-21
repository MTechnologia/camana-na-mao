import { useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw, Upload } from 'lucide-react';
import { PlatformSectionHeading } from '@/components/admin/platform/PlatformSectionHeading';
import { SettingsLayout } from '@/components/admin/settings/SettingsLayout';
import { useConfigEnvironment } from '@/contexts/ConfigEnvironmentContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AiVersionStatus } from '@/types/systemConfig';

const statusVariant: Record<AiVersionStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  draft: 'secondary',
  archived: 'outline',
};

const statusLabel: Record<AiVersionStatus, string> = {
  active: 'Ativa',
  draft: 'Rascunho',
  archived: 'Arquivada',
};

export function AiConfigPage() {
  const { config, environmentLabel } = useConfigEnvironment();
  const [policy, setPolicy] = useState(config.rollbackPolicy);
  const active = config.aiVersions.find((v) => v.status === 'active');

  return (
    <SettingsLayout
      title="IA — versionamento e templates"
      actions={
        <Button
          type="button"
          size="sm"
          className="gap-2"
          onClick={() =>
            toast.success('Nova versão (rascunho)', {
              description: `Ambiente: ${environmentLabel}. Somente admin.`,
            })
          }
        >
          Nova versão
        </Button>
      }
    >
      <section className="space-y-3">
        <PlatformSectionHeading title="Configuração de IA" />
      <Tabs defaultValue="versions" className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm p-4 md:p-5">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 bg-muted/50 p-1">
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
                {config.aiVersions.map((v) => (
                  <tr key={v.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{v.version}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.templateName}</td>
                    <td className="px-4 py-3">{v.modelId}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {v.accuracyPct != null ? `${v.accuracyPct}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[v.status]}>{statusLabel[v.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {v.status === 'draft' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() =>
                            toast.success('Publicado', {
                              description: `${v.version} em ${environmentLabel}. Monitorando acurácia por ${policy.observationHours}h.`,
                            })
                          }
                        >
                          <Upload className="h-3.5 w-3.5" aria-hidden />
                          Publicar
                        </Button>
                      ) : v.status === 'archived' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => toast.message('Reverter', { description: v.version })}
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                          Reativar
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Em produção</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {active ? (
            <Card>
              <CardContent className="space-y-2 p-4">
                <p className="text-sm font-medium">Versão ativa — preview do template</p>
                <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
                  {active.body}
                </pre>
                <p className="text-xs text-muted-foreground">
                  Variáveis: {active.variables.map((k) => `{{${k}}}`).join(', ')}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="templates" className="grid gap-4 lg:grid-cols-2">
          {config.promptTemplates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="font-medium">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground">{tpl.description}</p>
                </div>
                <pre className="max-h-32 overflow-auto rounded-md bg-muted p-3 text-xs">{tpl.body}</pre>
                <ul className="space-y-1 text-xs">
                  {tpl.variables.map((v) => (
                    <li key={v.key} className="flex justify-between gap-2">
                      <code className="rounded bg-muted px-1">{`{{${v.key}}}`}</code>
                      <span className="text-muted-foreground">
                        {v.label}
                        {v.required ? ' *' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toast.message('Editar template', { description: tpl.id })}
                >
                  Editar template
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rollback">
          <Card>
            <CardContent className="space-y-4 p-4">
              <p className="text-sm text-muted-foreground">
                Se a acurácia cair mais que o limite após publicação, o backend reverte
                automaticamente para a versão anterior em{' '}
                <strong>{environmentLabel}</strong>.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={policy.enabled}
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
                onClick={() =>
                  toast.success('Política salva', {
                    description: `Rollback se queda &gt; ${policy.maxAccuracyDropPct}% em ${policy.observationHours}h.`,
                  })
                }
              >
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
                defaultValue=""
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  toast.message('Sandbox', {
                    description: 'Resposta de teste — não afeta cidadãos.',
                  })
                }
              >
                Enviar teste
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </section>
    </SettingsLayout>
  );
}
