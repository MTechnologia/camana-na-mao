import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  DrillLevel, 
  DrillOperation, 
  AnalyticsState, 
  DrillDataPoint,
  ComparisonData,
  RawDataRow 
} from '@/types/analytics';

const INITIAL_STATE: AnalyticsState = {
  currentView: 'overview',
  dimensions: [],
  metrics: [],
  drillPath: [],
  comparisons: [],
  filters: {},
};

export const useAnalyticsDrill = () => {
  const [state, setState] = useState<AnalyticsState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(false);

  const drillDown = useCallback(async (dimension: string, value: string, label: string) => {
    const newLevel: DrillLevel = { dimension, value, label };
    const newFilters = { ...state.filters, [dimension]: value };

    setState(prev => ({
      ...prev,
      drillPath: [...prev.drillPath, newLevel],
      filters: newFilters,
      currentView: 'detailed',
    }));

    return newFilters;
  }, [state.filters]);

  const drillUp = useCallback(() => {
    if (state.drillPath.length === 0) return;

    const newPath = state.drillPath.slice(0, -1);
    const lastRemoved = state.drillPath[state.drillPath.length - 1];
    const newFilters = { ...state.filters };
    delete newFilters[lastRemoved.dimension];

    setState(prev => ({
      ...prev,
      drillPath: newPath,
      filters: newFilters,
      currentView: newPath.length === 0 ? 'overview' : 'detailed',
    }));
  }, [state.drillPath, state.filters]);

  const drillAcross = useCallback(async (newDimension: string) => {
    setState(prev => ({
      ...prev,
      comparisons: [...prev.comparisons, newDimension],
    }));
  }, []);

  const drillThrough = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentView: 'raw',
    }));
  }, []);

  const navigateToLevel = useCallback((index: number) => {
    if (index < 0 || index >= state.drillPath.length) return;

    const newPath = state.drillPath.slice(0, index + 1);
    const newFilters: Record<string, any> = {};
    newPath.forEach(level => {
      newFilters[level.dimension] = level.value;
    });

    setState(prev => ({
      ...prev,
      drillPath: newPath,
      filters: newFilters,
      currentView: newPath.length === 0 ? 'overview' : 'detailed',
    }));
  }, [state.drillPath]);

  const resetDrill = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const fetchDetailedData = useCallback(async (
    table: string,
    groupBy: string,
    metric: string = 'count'
  ): Promise<DrillDataPoint[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any).from(table).select('*');
      if (error) throw error;

      // Filter data based on current filters
      const filteredData = (data || []).filter((row: any) => {
        return Object.entries(state.filters).every(([key, value]) => row[key] === value);
      });

      // Group data by dimension
      const grouped: Record<string, number> = {};
      filteredData.forEach((row: any) => {
        const key = row[groupBy] || 'Sem categoria';
        grouped[key] = (grouped[key] || 0) + 1;
      });

      return Object.entries(grouped).map(([label, value]) => ({
        label,
        value: value as number,
      }));
    } catch (error) {
      console.error('Erro ao buscar dados detalhados:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [state.filters]);

  const fetchComparisonData = useCallback(async (
    table: string,
    dimension1: string,
    dimension2: string
  ): Promise<ComparisonData> => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any).from(table).select('*');
      if (error) throw error;

      // Filter data based on current filters (excluding dimensions being compared)
      const filteredData = (data || []).filter((row: any) => {
        return Object.entries(state.filters).every(([key, value]) => {
          if (key === dimension1 || key === dimension2) return true;
          return row[key] === value;
        });
      });

      const grouped: Record<string, Record<string, number>> = {};
      
      filteredData.forEach((row: any) => {
        const key1 = row[dimension1] || 'Sem categoria';
        const key2 = row[dimension2] || 'Sem categoria';
        
        if (!grouped[key1]) grouped[key1] = {};
        grouped[key1][key2] = (grouped[key1][key2] || 0) + 1;
      });

      const labels = [...new Set(Object.values(grouped).flatMap(obj => Object.keys(obj)))];
      
      return {
        dimension: dimension2,
        datasets: Object.entries(grouped).map(([label, values]) => ({
          label,
          data: labels.map(l => ({
            label: l,
            value: values[l] || 0,
          })),
        })),
      };
    } catch (error) {
      console.error('Erro ao buscar dados de comparação:', error);
      return { dimension: dimension2, datasets: [] };
    } finally {
      setIsLoading(false);
    }
  }, [state.filters]);

  const fetchRawData = useCallback(async (
    table: string,
    limit: number = 100
  ): Promise<RawDataRow[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any).from(table).select('*').limit(limit);
      if (error) throw error;

      // Filter data based on current filters
      const filteredData = (data || []).filter((row: any) => {
        return Object.entries(state.filters).every(([key, value]) => row[key] === value);
      });

      return filteredData as RawDataRow[];
    } catch (error) {
      console.error('Erro ao buscar dados brutos:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [state.filters]);

  return {
    state,
    isLoading,
    drillDown,
    drillUp,
    drillAcross,
    drillThrough,
    navigateToLevel,
    resetDrill,
    fetchDetailedData,
    fetchComparisonData,
    fetchRawData,
  };
};
