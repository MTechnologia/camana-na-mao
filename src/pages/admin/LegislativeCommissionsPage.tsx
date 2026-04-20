import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type Commission = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  match_keywords: string[] | null;
  sort_order: number;
  active: boolean;
};

export default function LegislativeCommissionsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { keywords: string; sort: string; active: boolean }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('legislative_commissions')
      .select('id,code,name,description,match_keywords,sort_order,active')
      .order('sort_order', { ascending: true });
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao carregar', description: error.message });
      setRows([]);
    } else {
      const list = (data || []) as Commission[];
      setRows(list);
      const d: Record<string, { keywords: string; sort: string; active: boolean }> = {};
      for (const r of list) {
        d[r.id] = {
          keywords: (r.match_keywords || []).join(', '),
          sort: String(r.sort_order),
          active: r.active,
        };
      }
      setDrafts(d);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRow = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    setSavingId(id);
    const keywords = d.keywords
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const sortOrder = parseInt(d.sort, 10);
    const { error } = await supabase
      .from('legislative_commissions')
      .update({
        match_keywords: keywords,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        active: d.active,
      })
      .eq('id', id);
    setSavingId(null);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
      return;
    }
    toast({ title: 'Salvo', description: 'Comissão atualizada.' });
    await load();
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Comissões legislativas</CardTitle>
            <CardDescription>
              Gestão operacional das palavras-chave, ordem e ativação usadas para alinhar vereadores à comissão escolhida no wizard de encaminhamento.
              O cadastro-base das comissões continua vindo da migration. Separe termos por vírgula (ex.: saúde, ubs, hospital).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma comissão encontrada. Aplique a migration HU-8.</p>
            ) : (
              <div className="space-y-8">
                {rows.map((r) => {
                  const draft = drafts[r.id] ?? {
                    keywords: '',
                    sort: '0',
                    active: true,
                  };
                  return (
                    <div key={r.id} className="border-b border-border pb-6 last:border-0 last:pb-0 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{r.name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{r.code}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${r.id}`} className="text-xs text-muted-foreground">
                            Ativa
                          </Label>
                          <Switch
                            id={`active-${r.id}`}
                            checked={draft.active}
                            onCheckedChange={(v) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [r.id]: { ...draft, active: v },
                              }))
                            }
                          />
                        </div>
                      </div>
                      {r.description ? (
                        <p className="text-sm text-muted-foreground">{r.description}</p>
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Palavras-chave</Label>
                          <Textarea
                            rows={2}
                            value={draft.keywords}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [r.id]: { ...draft, keywords: e.target.value },
                              }))
                            }
                            placeholder="saúde, ubs, hospital"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Ordem</Label>
                          <Input
                            type="number"
                            value={draft.sort}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [r.id]: { ...draft, sort: e.target.value },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingId === r.id}
                        onClick={() => void saveRow(r.id)}
                      >
                        {savingId === r.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando…
                          </>
                        ) : (
                          'Salvar alterações'
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
