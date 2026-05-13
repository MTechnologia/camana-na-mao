/**
 * HU-6.1 — Catálogo de temas de atuação.
 *
 * Cada tema representa uma área setorial pela qual um gestor pode optar
 * personalizar seu dashboard. Ao escolher um tema, os widgets/tabs de
 * `/admin/analytics` se ajustam:
 *   - Tabs prioritárias ficam destacadas no topo.
 *   - Filtros automáticos de categoria (urban) e/ou tipo de equipamento
 *     (public_services) são aplicados, derivando o recorte de cada hook
 *     analytics.
 *
 * Fontes dos valores:
 *   - Urban categories: `src/pages/urban/ManualReportPage.tsx`
 *   - Transport subcategories: `src/lib/reportFieldConfig.ts`
 *   - PublicServiceType: `src/hooks/useNearbyServices.ts`
 */

export type WidgetThemeId =
  | "geral"
  | "saude"
  | "educacao"
  | "seguranca"
  | "transporte"
  | "infraestrutura"
  | "limpeza_ambiente"
  | "cultura_lazer"
  | "assistencia_social";

/** IDs das abas de /admin/analytics — usado para destacar/priorizar por tema. */
export type AnalyticsTabId =
  | "volume"
  | "eficiencia"
  | "diagnostico"
  | "audiencias"
  | "territorial"
  | "drill"
  | "cross"
  | "geral"
  | "sentimento"
  | "demografia"
  | "engajamento"
  | "criticidade";

export interface WidgetTheme {
  id: WidgetThemeId;
  label: string;
  shortLabel: string;
  description: string;
  /** Emoji ou nome de ícone do lucide-react (usar string aqui evita acoplar lib visual). */
  icon: string;
  /** Cor de destaque (token de design, ex.: "blue-500"). */
  accentClass: string;
  /** Categorias do `urban_reports.category` cobertas pelo tema. Vazio = não aplica. */
  urbanCategories: readonly string[];
  /** Subcategorias do `transport_reports.subcategory` cobertas. Vazio = não aplica. */
  transportSubcategories: readonly string[];
  /** Tipos de `public_services.service_type` cobertos. Vazio = não aplica. */
  publicServiceTypes: readonly string[];
  /** Tabs em destaque para o tema (ordem importa — primeira é a "home" do tema). */
  priorityTabs: readonly AnalyticsTabId[];
}

/**
 * Catálogo único, ordenado para exibição no dropdown.
 * "geral" SEMPRE em primeiro lugar como opção neutra (sem filtros automáticos).
 */
export const WIDGET_THEMES: readonly WidgetTheme[] = [
  {
    id: "geral",
    label: "Geral",
    shortLabel: "Geral",
    description: "Visão consolidada sem filtros de tema. Mostra todos os widgets.",
    icon: "LayoutDashboard",
    accentClass: "text-foreground",
    urbanCategories: [],
    transportSubcategories: [],
    publicServiceTypes: [],
    // Todas as tabs com prioridade igual; ordem reflete a navegação atual.
    priorityTabs: [
      "volume",
      "eficiencia",
      "diagnostico",
      "audiencias",
      "territorial",
      "drill",
      "cross",
      "geral",
      "sentimento",
      "demografia",
      "engajamento",
      "criticidade",
    ],
  },
  {
    id: "saude",
    label: "Saúde",
    shortLabel: "Saúde",
    description: "UBS, hospitais e relatos relacionados a saúde pública.",
    icon: "Heart",
    accentClass: "text-red-500",
    urbanCategories: [],
    transportSubcategories: [],
    publicServiceTypes: ["ubs", "hospital"],
    priorityTabs: ["volume", "territorial", "cross", "audiencias", "engajamento"],
  },
  {
    id: "educacao",
    label: "Educação",
    shortLabel: "Educação",
    description: "Escolas, CEUs, creches e bibliotecas.",
    icon: "GraduationCap",
    accentClass: "text-blue-500",
    urbanCategories: [],
    transportSubcategories: [],
    publicServiceTypes: ["school", "ceu", "daycare", "library"],
    priorityTabs: ["volume", "territorial", "cross", "audiencias"],
  },
  {
    id: "seguranca",
    label: "Segurança",
    shortLabel: "Segurança",
    description: "Ocorrências de segurança no transporte, iluminação pública e delegacias.",
    icon: "Shield",
    accentClass: "text-orange-500",
    urbanCategories: ["iluminacao"],
    transportSubcategories: ["seguranca"],
    publicServiceTypes: ["police_station", "fire_station"],
    priorityTabs: ["criticidade", "diagnostico", "volume", "eficiencia"],
  },
  {
    id: "transporte",
    label: "Mobilidade & Transporte",
    shortLabel: "Transporte",
    description: "Relatos de ônibus, metrô, ciclofaixas e mobilidade urbana.",
    icon: "Bus",
    accentClass: "text-purple-500",
    urbanCategories: ["sinalizacao", "via_publica"],
    transportSubcategories: ["atraso", "lotacao", "acessibilidade", "conducao"],
    publicServiceTypes: ["transit_station", "bicycle"],
    priorityTabs: ["volume", "eficiencia", "territorial", "diagnostico"],
  },
  {
    id: "infraestrutura",
    label: "Infraestrutura urbana",
    shortLabel: "Infra",
    description: "Calçadas, asfalto, drenagem, esgoto e iluminação.",
    icon: "Construction",
    accentClass: "text-amber-600",
    urbanCategories: [
      "iluminacao",
      "calcada",
      "via_publica",
      "pavimentacao",
      "sinalizacao",
      "drenagem",
      "esgoto",
    ],
    transportSubcategories: [],
    publicServiceTypes: ["subprefeitura"],
    priorityTabs: ["volume", "eficiencia", "diagnostico", "territorial"],
  },
  {
    id: "limpeza_ambiente",
    label: "Limpeza & Meio Ambiente",
    shortLabel: "Limpeza",
    description: "Coleta de lixo, áreas verdes, poluição e higiene urbana.",
    icon: "Trees",
    accentClass: "text-green-600",
    urbanCategories: ["lixo", "area_verde", "higiene_urbana", "poluicao", "animais"],
    transportSubcategories: ["limpeza"],
    publicServiceTypes: ["park", "recycling_point"],
    priorityTabs: ["volume", "territorial", "eficiencia", "diagnostico"],
  },
  {
    id: "cultura_lazer",
    label: "Cultura & Lazer",
    shortLabel: "Cultura",
    description: "Teatros, museus, parques, centros esportivos e feiras.",
    icon: "Theater",
    accentClass: "text-pink-500",
    urbanCategories: [],
    transportSubcategories: [],
    publicServiceTypes: [
      "theater",
      "museum",
      "sports_center",
      "park",
      "street_market",
      "city_market",
      "market",
    ],
    priorityTabs: ["engajamento", "volume", "audiencias", "territorial"],
  },
  {
    id: "assistencia_social",
    label: "Assistência Social",
    shortLabel: "Social",
    description: "CRAS, centros comunitários e serviços de acolhimento.",
    icon: "HandHeart",
    accentClass: "text-rose-500",
    urbanCategories: [],
    transportSubcategories: [],
    publicServiceTypes: ["social_assistance", "community_center", "cemetery"],
    priorityTabs: ["audiencias", "engajamento", "volume", "demografia"],
  },
] as const;

/** Lookup O(1) por id. */
export const WIDGET_THEMES_BY_ID: Record<WidgetThemeId, WidgetTheme> = WIDGET_THEMES.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<WidgetThemeId, WidgetTheme>,
);

/** Tema padrão (sem filtros). */
export const DEFAULT_THEME_ID: WidgetThemeId = "geral";

export function getTheme(id: WidgetThemeId | string | null | undefined): WidgetTheme {
  if (!id) return WIDGET_THEMES_BY_ID[DEFAULT_THEME_ID];
  return WIDGET_THEMES_BY_ID[id as WidgetThemeId] ?? WIDGET_THEMES_BY_ID[DEFAULT_THEME_ID];
}

/** Tipa o `widget_config` salvo no banco (jsonb). Extensível para HUs futuras. */
export interface WidgetConfig {
  /** Tabs explicitamente ocultadas pelo usuário (override do priorityTabs). */
  hiddenTabs?: AnalyticsTabId[];
  /** Ordem custom das tabs (override do priorityTabs do tema). */
  tabOrder?: AnalyticsTabId[];
  /** Versão do schema do widget_config — incrementar em mudanças breaking. */
  version?: number;
}

export const WIDGET_CONFIG_SCHEMA_VERSION = 1;
