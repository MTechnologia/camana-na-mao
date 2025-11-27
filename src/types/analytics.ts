export type DrillType = 'down' | 'up' | 'across' | 'through';

export interface DrillLevel {
  label: string;
  value: string;
  dimension: string;
}

export interface DrillOperation {
  type: DrillType;
  fromDimension: string;
  toDimension?: string;
  filters: Record<string, any>;
  timestamp: Date;
}

export type AnalyticsView = 'overview' | 'detailed' | 'raw';

export interface AnalyticsState {
  currentView: AnalyticsView;
  dimensions: string[];
  metrics: string[];
  drillPath: DrillLevel[];
  comparisons: string[];
  filters: Record<string, any>;
}

export interface DrillDataPoint {
  label: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface ComparisonData {
  dimension: string;
  datasets: {
    label: string;
    data: DrillDataPoint[];
  }[];
}

export interface RawDataRow {
  id: string;
  [key: string]: any;
}
