import type { CustomPanel } from '@/types/customPanel';

const PANELS_KEY = 'cmsp-custom-panels-v1';
const ACTIVE_PANEL_KEY = 'cmsp-active-panel-id';

export function loadPanels(): CustomPanel[] {
  try {
    const raw = localStorage.getItem(PANELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomPanel[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePanels(panels: CustomPanel[]): void {
  localStorage.setItem(PANELS_KEY, JSON.stringify(panels));
}

export function loadActivePanelId(): string | null {
  return localStorage.getItem(ACTIVE_PANEL_KEY);
}

export function saveActivePanelId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_PANEL_KEY, id);
  else localStorage.removeItem(ACTIVE_PANEL_KEY);
}

export function createPanelId(): string {
  return `panel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createWidgetId(): string {
  return `widget-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
