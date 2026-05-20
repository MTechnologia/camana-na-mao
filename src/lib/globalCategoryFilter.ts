import {
  WIDGET_THEMES_BY_ID,
  type WidgetThemeId,
} from '@/lib/widgetThemes';

/** Valores do select em `GlobalFiltersBar` → tema de widget com listas de categorias reais. */
const FILTER_VALUE_TO_THEME: Record<string, WidgetThemeId> = {
  mobilidade: 'transporte',
  saude: 'saude',
  cultura: 'cultura_lazer',
  urbanismo: 'infraestrutura',
  seguranca: 'seguranca',
};

export type GlobalCategoryFilterSlice = {
  isAll: boolean;
  urbanCategories: string[];
  transportSubcategories: string[];
  publicServiceTypes: string[];
};

export function resolveGlobalCategoryFilter(category: string | undefined): GlobalCategoryFilterSlice {
  if (!category || category === 'all') {
    return {
      isAll: true,
      urbanCategories: [],
      transportSubcategories: [],
      publicServiceTypes: [],
    };
  }

  const themeId = FILTER_VALUE_TO_THEME[category];
  if (themeId) {
    const theme = WIDGET_THEMES_BY_ID[themeId];
    return {
      isAll: false,
      urbanCategories: [...theme.urbanCategories],
      transportSubcategories: [...theme.transportSubcategories],
      publicServiceTypes: [...theme.publicServiceTypes],
    };
  }

  return {
    isAll: false,
    urbanCategories: [category],
    transportSubcategories: [category],
    publicServiceTypes: [category],
  };
}

/** Valores aceitos em `urban_reports.category`, `transport_reports.*` e `public_services.service_type`. */
export function categoryDbValuesForRpc(slice: GlobalCategoryFilterSlice): string[] {
  return [
    ...new Set([
      ...slice.urbanCategories,
      ...slice.transportSubcategories,
      ...slice.publicServiceTypes,
    ]),
  ];
}

export function hasCategoryFilterTargets(slice: GlobalCategoryFilterSlice): boolean {
  return (
    slice.urbanCategories.length > 0 ||
    slice.transportSubcategories.length > 0 ||
    slice.publicServiceTypes.length > 0
  );
}
