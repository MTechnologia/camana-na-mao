export type AnalyticsMetric = 'volume' | 'response_time' | 'sentiment' | 'patterns';

export type DrillGrain = 'overview' | 'region' | 'street';

export type DrillCrumb = {
  id: string;
  grain: DrillGrain;
  label: string;
};

export type ChartBarPoint = {
  id: string;
  label: string;
  value: number;
  filterKey: 'region' | 'district' | 'street' | 'category';
  filterValue: string;
};

export type DrillKpis = {
  volume: number;
  responseHours: number;
  sentimentPct: number;
  patterns: number;
};

/** Origem do registro no drill-through (HU-3.6). */
export type DrillReportSource = 'urban' | 'transport' | 'evaluation';

export type DrillReportRow = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  source: DrillReportSource;
};

export type TimeSeriesPoint = {
  label: string;
  volume: number;
  resolved: number;
};

export type SentimentSlice = {
  id: string;
  label: string;
  value: number;
};

/** Polaridade (positivo / neutro / negativo) para um território no recorte. */
export type RegionSentimentBreakdown = {
  id: string;
  label: string;
  slices: SentimentSlice[];
};

export type PatternRankRow = {
  id: string;
  label: string;
  count: number;
  trendPct: number;
  /** Texto de apoio no tooltip (ex.: relatos na categoria no recorte). */
  description?: string;
};

/** Padrão recorrente predominante em uma zona territorial. */
export type RegionPatternSummary = {
  regionId: string;
  regionLabel: string;
  primaryPattern: string;
  count: number;
  trendPct: number;
  /** Outros temas frequentes na mesma zona */
  secondary: { label: string; count: number }[];
};

export type CorrelationPoint = {
  id: string;
  label: string;
  volume: number;
  responseHours: number;
  sentimentPct: number;
};

export type TerritoryIntensity = {
  id: string;
  label: string;
  volume: number;
  intensity: number;
};
