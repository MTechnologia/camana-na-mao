import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * HU-3.4 — Drill-across (cruzamento de tipo de problema × perfil demográfico).
 *
 * Constrói uma matriz `categoria × valor demográfico` onde cada célula é a
 * contagem de relatos que cruzam aquele tipo de problema com aquele perfil.
 *
 * Reusa a RPC `get_reports_with_demographics` chamando-a uma vez para cada
 * categoria (urban/transport/evaluation). Cada resposta traz o agregado por
 * eixo demográfico daquela categoria — o que casa exatamente com o formato
 * de matriz cruzada.
 */

export type DemoAxis = "gender" | "race" | "social_class" | "age_group";
export type ReportCategory = "Urbano" | "Transporte" | "Avaliação";

export interface CrossCell {
  category: ReportCategory;
  demoValue: string;
  /** Label canônico (já traduzido se aplicável). */
  demoLabel: string;
  count: number;
}

export interface CrossMatrix {
  axis: DemoAxis;
  categories: ReportCategory[];
  /** Valores demográficos presentes (colunas), ordenados. */
  demoValues: Array<{ value: string; label: string }>;
  /** key: `${category}|${value}` → count */
  cells: Record<string, number>;
  maxCount: number;
  total: number;
  /** Total por categoria (linha) */
  rowTotals: Record<ReportCategory, number>;
  /** Total por demo value (coluna) */
  colTotals: Record<string, number>;
}

const EMPTY_MATRIX: CrossMatrix = {
  axis: "gender",
  categories: ["Urbano", "Transporte", "Avaliação"],
  demoValues: [],
  cells: {},
  maxCount: 0,
  total: 0,
  rowTotals: { Urbano: 0, Transporte: 0, Avaliação: 0 },
  colTotals: {},
};

// Tradução pt-BR dos valores brutos do banco
const GENDER_LABELS: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  nao_binario: "Não-binário",
  outro: "Outro",
  prefer_not_to_say: "Prefere não dizer",
  not_informed: "Não informado",
};

const RACE_LABELS: Record<string, string> = {
  branca: "Branca",
  preta: "Preta",
  parda: "Parda",
  amarela: "Amarela",
  indigena: "Indígena",
  prefer_not_to_say: "Prefere não dizer",
  not_informed: "Não informado",
};

const SOCIAL_CLASS_LABELS: Record<string, string> = {
  A: "Classe A",
  B: "Classe B",
  AB: "Classe AB",
  C: "Classe C",
  D: "Classe D",
  E: "Classe E",
  not_informed: "Não informado",
};

const AGE_GROUP_LABELS: Record<string, string> = {
  "under_18": "Menos de 18",
  "18_24": "18-24",
  "25_34": "25-34",
  "35_44": "35-44",
  "45_54": "45-54",
  "55_64": "55-64",
  "65_plus": "65 ou mais",
  not_informed: "Não informado",
};

function labelFor(axis: DemoAxis, value: string): string {
  if (axis === "gender") return GENDER_LABELS[value] || value;
  if (axis === "race") return RACE_LABELS[value] || value;
  if (axis === "social_class") return SOCIAL_CLASS_LABELS[value] || value;
  if (axis === "age_group") return AGE_GROUP_LABELS[value] || value;
  return value;
}

const REPORT_TYPES: Array<{ category: ReportCategory; rpcType: "urban" | "transport" | "evaluation" }> = [
  { category: "Urbano", rpcType: "urban" },
  { category: "Transporte", rpcType: "transport" },
  { category: "Avaliação", rpcType: "evaluation" },
];

interface RpcResponse {
  total?: number;
  demographics?: {
    gender?: Record<string, number>;
    race?: Record<string, number>;
    social_class?: Record<string, number>;
    age_group?: Record<string, number>;
  };
}

export interface UseDemographicCrossAnalyticsResult {
  matrix: CrossMatrix;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDemographicCrossAnalytics(
  axis: DemoAxis,
  options: { startDate?: string | null; endDate?: string | null } = {},
): UseDemographicCrossAnalyticsResult {
  const [matrix, setMatrix] = useState<CrossMatrix>(EMPTY_MATRIX);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startDateISO = options.startDate
    ? new Date(options.startDate).toISOString()
    : null;
  const endDateISO = options.endDate ? new Date(options.endDate).toISOString() : null;

  const fetchMatrix = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const responses = await Promise.all(
        REPORT_TYPES.map(async ({ category, rpcType }) => {
          const { data, error: rpcError } = await supabase.rpc(
            "get_reports_with_demographics",
            {
              p_gender: null,
              p_race: null,
              p_social_class: null,
              p_age_group: null,
              p_report_type: rpcType,
              p_start_date: startDateISO,
              p_end_date: endDateISO,
            },
          );
          if (rpcError) throw rpcError;
          const rpc = (data ?? {}) as RpcResponse;
          return { category, demoMap: rpc.demographics?.[axis] ?? {}, total: rpc.total ?? 0 };
        }),
      );

      const cells: Record<string, number> = {};
      const colTotals: Record<string, number> = {};
      const rowTotals: Record<ReportCategory, number> = {
        Urbano: 0,
        Transporte: 0,
        Avaliação: 0,
      };
      const valuesSet = new Map<string, string>(); // value → label
      let maxCount = 0;
      let total = 0;

      responses.forEach(({ category, demoMap, total: rowTotal }) => {
        rowTotals[category] = rowTotal;
        total += rowTotal;
        Object.entries(demoMap).forEach(([rawValue, count]) => {
          const c = count as number;
          if (c <= 0) return;
          const key = `${category}|${rawValue}`;
          cells[key] = (cells[key] || 0) + c;
          colTotals[rawValue] = (colTotals[rawValue] || 0) + c;
          valuesSet.set(rawValue, labelFor(axis, rawValue));
          if (cells[key] > maxCount) maxCount = cells[key];
        });
      });

      // Ordenar valores demográficos por total descendente
      const demoValues = Array.from(valuesSet.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => (colTotals[b.value] || 0) - (colTotals[a.value] || 0));

      setMatrix({
        axis,
        categories: REPORT_TYPES.map((r) => r.category),
        demoValues,
        cells,
        maxCount,
        total,
        rowTotals,
        colTotals,
      });
    } catch (err) {
      console.error("[useDemographicCrossAnalytics] fetch error", err);
      setError("Não foi possível carregar os cruzamentos demográficos.");
      setMatrix(EMPTY_MATRIX);
    } finally {
      setIsLoading(false);
    }
  }, [axis, startDateISO, endDateISO]);

  useEffect(() => {
    void fetchMatrix();
  }, [fetchMatrix]);

  return useMemo(
    () => ({ matrix, isLoading, error, refresh: fetchMatrix }),
    [matrix, isLoading, error, fetchMatrix],
  );
}

// Helpers exportados para teste
export const __test__ = { labelFor, REPORT_TYPES };
