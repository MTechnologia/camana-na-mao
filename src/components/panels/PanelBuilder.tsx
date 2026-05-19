import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PanelCanvas } from '@/components/panels/PanelCanvas';
import { PanelWidgetPalette } from '@/components/panels/PanelWidgetPalette';
import { WidgetConfigPanel } from '@/components/panels/WidgetConfigPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCustomPanels } from '@/contexts/CustomPanelsContext';
import { createWidgetId } from '@/lib/customPanelStorage';
import { getCatalogEntry } from '@/lib/widgetCatalog';
import { buildPanelFromTemplate, PANEL_TEMPLATE_OPTIONS } from '@/lib/panelTemplates';
import type { CustomPanel, PanelTemplateId, PanelWidget, PanelWidgetType } from '@/types/customPanel';

function sortWidgets(widgets: PanelWidget[]) {
  return [...widgets].sort((a, b) => a.order - b.order);
}

export function PanelBuilder({ initialPanel }: { initialPanel?: CustomPanel }) {
  const navigate = useNavigate();
  const { updatePanel, createPanel, setActivePanelId } = useCustomPanels();

  const [name, setName] = useState(initialPanel?.name ?? '');
  const [description, setDescription] = useState(initialPanel?.description ?? '');
  const [widgets, setWidgets] = useState<PanelWidget[]>(initialPanel?.widgets ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<PanelTemplateId>('blank');

  const selectedWidget = useMemo(
    () => widgets.find((w) => w.id === selectedId) ?? null,
    [widgets, selectedId],
  );

  const sorted = useMemo(() => sortWidgets(widgets), [widgets]);

  const draftPanel: CustomPanel = useMemo(
    () => ({
      id: initialPanel?.id ?? 'draft',
      name: name || 'Novo painel',
      description,
      widgets: sorted,
      createdAt: initialPanel?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [initialPanel, name, description, sorted],
  );

  const addWidget = useCallback((type: PanelWidgetType) => {
    const entry = getCatalogEntry(type);
    const next: PanelWidget = {
      id: createWidgetId(),
      type,
      title: entry.defaultTitle,
      colSpan: entry.defaultColSpan,
      rowSpan: entry.defaultRowSpan,
      order: widgets.length,
      filters: { useGlobalFilters: true, ...entry.defaultFilters },
    };
    setWidgets((prev) => [...prev, next]);
    setSelectedId(next.id);
    toast.success(`Widget "${entry.label}" adicionado`);
  }, [widgets.length]);

  const updateWidget = useCallback((updated: PanelWidget) => {
    setWidgets((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => {
      const next = prev.filter((w) => w.id !== id).map((w, i) => ({ ...w, order: i }));
      return next;
    });
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const moveWidget = useCallback((id: string, direction: -1 | 1) => {
    setWidgets((prev) => {
      const list = sortWidgets(prev);
      const idx = list.findIndex((w) => w.id === id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= list.length) return prev;
      const copy = [...list];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item!);
      return copy.map((w, i) => ({ ...w, order: i }));
    });
  }, []);

  const applyTemplate = () => {
    if (widgets.length > 0 && !window.confirm('Substituir widgets atuais pelo template?')) return;
    const built = buildPanelFromTemplate(templateId, name || 'Novo painel', description);
    setWidgets(built.widgets);
    toast.message('Template aplicado ao canvas.');
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Informe um nome para o painel');
      return;
    }
    if (widgets.length === 0) {
      toast.error('Adicione pelo menos um widget');
      return;
    }

    const payload: CustomPanel = {
      ...draftPanel,
      id: initialPanel?.id ?? draftPanel.id,
      name: name.trim(),
      description: description.trim() || undefined,
      widgets: sorted,
      updatedAt: new Date().toISOString(),
    };

    if (initialPanel) {
      updatePanel({ ...payload, id: initialPanel.id, createdAt: initialPanel.createdAt });
      setActivePanelId(initialPanel.id);
      toast.success('Painel atualizado');
      navigate('/paineis');
    } else {
      const created = createPanel({
        name: payload.name,
        description: payload.description,
        templateId: 'blank',
      });
      updatePanel({
        ...created,
        widgets: sorted,
        description: payload.description,
      });
      toast.success('Painel criado');
      navigate('/paineis');
    }
  };

  const selectedIndex = selectedWidget ? sorted.findIndex((w) => w.id === selectedWidget.id) : -1;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="panel-name">Nome do painel</Label>
          <Input
            id="panel-name"
            placeholder="Ex.: Acompanhamento semanal — Zona Sul"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="panel-template">Template inicial</Label>
          <div className="flex gap-2">
            <select
              id="panel-template"
              className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value as PanelTemplateId)}
              disabled={Boolean(initialPanel)}
            >
              {PANEL_TEMPLATE_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            {!initialPanel ? (
              <Button type="button" variant="outline" size="sm" onClick={applyTemplate}>
                Aplicar
              </Button>
            ) : null}
          </div>
        </div>
        <div className="space-y-2 lg:col-span-3">
          <Label htmlFor="panel-desc">Descrição (opcional)</Label>
          <Input
            id="panel-desc"
            placeholder="Para que serve este painel?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <aside className="xl:col-span-3">
          <div className="sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-border bg-card p-4">
            <PanelWidgetPalette onAdd={addWidget} />
          </div>
        </aside>

        <div className="xl:col-span-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Canvas do painel</p>
            <span className="text-xs text-muted-foreground">{widgets.length} widgets</span>
          </div>
          <PanelCanvas
            panel={draftPanel}
            mode="edit"
            selectedWidgetId={selectedId}
            onSelectWidget={setSelectedId}
            onRemoveWidget={removeWidget}
          />
        </div>

        <aside className="xl:col-span-3">
          <div className="sticky top-4 rounded-xl border border-border bg-card p-4">
            {selectedWidget ? (
              <WidgetConfigPanel
                widget={selectedWidget}
                onChange={updateWidget}
                onMoveUp={() => moveWidget(selectedWidget.id, -1)}
                onMoveDown={() => moveWidget(selectedWidget.id, 1)}
                canMoveUp={selectedIndex > 0}
                canMoveDown={selectedIndex >= 0 && selectedIndex < sorted.length - 1}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecione um widget no canvas para ajustar título, tamanho, métrica e filtros locais.
              </p>
            )}
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" asChild>
          <Link to="/paineis">Cancelar</Link>
        </Button>
        <Button type="button" onClick={handleSave}>
          {initialPanel ? 'Salvar alterações' : 'Criar painel'}
        </Button>
      </div>
    </div>
  );
}
