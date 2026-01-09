import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DemographicFilters {
  gender?: string;
  race?: string;
  socialClass?: string;
  ageGroup?: string;
  startDate?: string;
  endDate?: string;
  reportType?: 'urban' | 'transport';
}

interface DemographicsDistribution {
  gender: Record<string, number>;
  race: Record<string, number>;
  social_class: Record<string, number>;
  age_group: Record<string, number>;
}

export interface ReportsWithDemographicsResult {
  total: number;
  critical_count: number;
  pending_count: number;
  resolved_count: number;
  urban_count: number;
  transport_count: number;
  demographics: DemographicsDistribution;
  category_distribution: { category: string; count: number }[] | null;
  neighborhood_distribution: { neighborhood: string; count: number }[] | null;
  status_distribution: { status: string; count: number }[] | null;
}

/**
 * Hook que usa a função segura do banco de dados para acessar
 * dados demográficos com validação de role (admin/gestor).
 * Bypassa RLS de forma controlada via SECURITY DEFINER.
 */
export const useReportsWithDemographics = (filters: DemographicFilters = {}) => {
  const [data, setData] = useState<ReportsWithDemographicsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serializar filters para comparação estável
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);

      try {
        // Mapear ageGroup do frontend para o formato do banco
        const ageGroupMap: Record<string, string> = {
          '< 18': 'under_18',
          '18-24': '18_24',
          '25-34': '25_34',
          '35-44': '35_44',
          '45-54': '45_54',
          '55-64': '55_64',
          '65+': '65_plus',
          'Não informado': 'not_informed',
        };

        const mappedAgeGroup = filters.ageGroup 
          ? ageGroupMap[filters.ageGroup] || filters.ageGroup
          : null;

        // Mapear gender "Não informado" para o valor especial
        const mappedGender = filters.gender === 'Não informado' 
          ? 'not_informed' 
          : filters.gender || null;

        // Mapear race "Não informado" para o valor especial
        const mappedRace = filters.race === 'Não informado' 
          ? 'not_informed' 
          : filters.race || null;

        // Mapear socialClass "Não informado" para o valor especial
        const mappedSocialClass = filters.socialClass === 'Não informado' 
          ? 'not_informed' 
          : filters.socialClass || null;

        // Converter datas para ISO (TIMESTAMPTZ compatível)
        const startDateISO = filters.startDate ? new Date(filters.startDate).toISOString() : null;
        const endDateISO = filters.endDate ? new Date(filters.endDate).toISOString() : null;

        const { data: result, error: rpcError } = await supabase.rpc('get_reports_with_demographics', {
          p_gender: mappedGender,
          p_race: mappedRace,
          p_social_class: mappedSocialClass,
          p_age_group: mappedAgeGroup,
          p_report_type: filters.reportType || null,
          p_start_date: startDateISO,
          p_end_date: endDateISO,
        });

        if (rpcError) {
          console.error('RPC error:', rpcError);
          // Se for erro de permissão, mostrar mensagem amigável
          if (rpcError.message?.includes('Acesso negado')) {
            setError('Você não tem permissão para acessar dados demográficos.');
          } else if (rpcError.message?.includes('Não autenticado')) {
            setError('Sessão expirada. Por favor, faça login novamente.');
          } else {
            setError('Erro ao carregar dados demográficos.');
          }
          setData(null);
        } else if (isMounted) {
          setData(result as unknown as ReportsWithDemographicsResult);
        }
      } catch (err) {
        console.error('Error fetching demographics:', err);
        if (isMounted) {
          setError('Erro inesperado ao carregar dados.');
          setData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, [filtersKey]);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const ageGroupMap: Record<string, string> = {
        '< 18': 'under_18',
        '18-24': '18_24',
        '25-34': '25_34',
        '35-44': '35_44',
        '45-54': '45_54',
        '55-64': '55_64',
        '65+': '65_plus',
        'Não informado': 'not_informed',
      };

      const mappedAgeGroup = filters.ageGroup 
        ? ageGroupMap[filters.ageGroup] || filters.ageGroup
        : null;

      const mappedGender = filters.gender === 'Não informado' 
        ? 'not_informed' 
        : filters.gender || null;

      const mappedRace = filters.race === 'Não informado' 
        ? 'not_informed' 
        : filters.race || null;

      const mappedSocialClass = filters.socialClass === 'Não informado' 
        ? 'not_informed' 
        : filters.socialClass || null;

      // Converter datas para ISO (TIMESTAMPTZ compatível)
      const startDateISO = filters.startDate ? new Date(filters.startDate).toISOString() : null;
      const endDateISO = filters.endDate ? new Date(filters.endDate).toISOString() : null;

      const { data: result, error: rpcError } = await supabase.rpc('get_reports_with_demographics', {
        p_gender: mappedGender,
        p_race: mappedRace,
        p_social_class: mappedSocialClass,
        p_age_group: mappedAgeGroup,
        p_report_type: filters.reportType || null,
        p_start_date: startDateISO,
        p_end_date: endDateISO,
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        setError('Erro ao atualizar dados.');
      } else {
        setData(result as unknown as ReportsWithDemographicsResult);
      }
    } catch (err) {
      console.error('Error refreshing demographics:', err);
      setError('Erro inesperado ao atualizar.');
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, refresh };
};
