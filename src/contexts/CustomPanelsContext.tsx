import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createPanelId,
  createWidgetId,
  loadActivePanelId,
  loadPanels,
  saveActivePanelId,
  savePanels,
} from '@/lib/customPanelStorage';
import { buildPanelFromTemplate } from '@/lib/panelTemplates';
import type { CustomPanel, PanelTemplateId } from '@/types/customPanel';

type CustomPanelsContextValue = {
  panels: CustomPanel[];
  activePanelId: string | null;
  activePanel: CustomPanel | null;
  setActivePanelId: (id: string | null) => void;
  createPanel: (input: {
    name: string;
    description?: string;
    templateId?: PanelTemplateId;
  }) => CustomPanel;
  updatePanel: (panel: CustomPanel) => void;
  deletePanel: (id: string) => void;
  duplicatePanel: (id: string) => CustomPanel | null;
  getPanelById: (id: string) => CustomPanel | undefined;
};

const CustomPanelsContext = createContext<CustomPanelsContextValue | null>(null);

function seedDefaultPanels(existing: CustomPanel[]): CustomPanel[] {
  if (existing.length > 0) return existing;
  const executive = buildPanelFromTemplate(
    'executive',
    'Visão executiva',
    'KPIs e gráficos com drill para acompanhamento diário.',
  );
  const sentiment = buildPanelFromTemplate(
    'sentiment_ops',
    'Sentimento e padrões',
    'Polaridade e temas recorrentes por região.',
  );
  return [executive, sentiment];
}

export function CustomPanelsProvider({ children }: { children: ReactNode }) {
  const [panels, setPanels] = useState<CustomPanel[]>(() => seedDefaultPanels(loadPanels()));
  const [activePanelId, setActivePanelIdState] = useState<string | null>(() => loadActivePanelId());

  useEffect(() => {
    savePanels(panels);
  }, [panels]);

  useEffect(() => {
    if (panels.length === 0) {
      setActivePanelIdState(null);
      saveActivePanelId(null);
      return;
    }
    if (!activePanelId || !panels.some((p) => p.id === activePanelId)) {
      const next = panels[0]!.id;
      setActivePanelIdState(next);
      saveActivePanelId(next);
    }
  }, [panels, activePanelId]);

  const setActivePanelId = useCallback((id: string | null) => {
    setActivePanelIdState(id);
    saveActivePanelId(id);
  }, []);

  const activePanel = useMemo(
    () => panels.find((p) => p.id === activePanelId) ?? null,
    [panels, activePanelId],
  );

  const getPanelById = useCallback((id: string) => panels.find((p) => p.id === id), [panels]);

  const createPanel = useCallback(
    (input: { name: string; description?: string; templateId?: PanelTemplateId }) => {
      const panel = buildPanelFromTemplate(
        input.templateId ?? 'blank',
        input.name,
        input.description,
      );
      setPanels((prev) => [...prev, panel]);
      setActivePanelId(panel.id);
      return panel;
    },
    [setActivePanelId],
  );

  const updatePanel = useCallback((panel: CustomPanel) => {
    const updated = { ...panel, updatedAt: new Date().toISOString() };
    setPanels((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const deletePanel = useCallback(
    (id: string) => {
      setPanels((prev) => prev.filter((p) => p.id !== id));
      if (activePanelId === id) setActivePanelId(null);
    },
    [activePanelId, setActivePanelId],
  );

  const duplicatePanel = useCallback(
    (id: string) => {
      const source = panels.find((p) => p.id === id);
      if (!source) return null;
      const copy: CustomPanel = {
        ...source,
        id: createPanelId(),
        name: `${source.name} (cópia)`,
        widgets: source.widgets.map((w, i) => ({ ...w, id: createWidgetId(), order: i })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPanels((prev) => [...prev, copy]);
      setActivePanelId(copy.id);
      return copy;
    },
    [panels, setActivePanelId],
  );

  const value = useMemo(
    () => ({
      panels,
      activePanelId,
      activePanel,
      setActivePanelId,
      createPanel,
      updatePanel,
      deletePanel,
      duplicatePanel,
      getPanelById,
    }),
    [
      panels,
      activePanelId,
      activePanel,
      setActivePanelId,
      createPanel,
      updatePanel,
      deletePanel,
      duplicatePanel,
      getPanelById,
    ],
  );

  return <CustomPanelsContext.Provider value={value}>{children}</CustomPanelsContext.Provider>;
}

export function useCustomPanels() {
  const ctx = useContext(CustomPanelsContext);
  if (!ctx) throw new Error('useCustomPanels deve ser usado dentro de CustomPanelsProvider');
  return ctx;
}
