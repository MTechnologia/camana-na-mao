import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Centralized Vereador interface - single source of truth
export interface Vereador {
  id: string;
  name: string;
  party: string;
  photo: string;
  phone: string;
  email: string;
  initials: string;
  sala?: string;
  andar?: string;
  gv?: string;
  isLeader?: boolean;
  isGovernmentLeader?: boolean;
  isSubstitute?: boolean;
  isOnLeave?: boolean;
  region?: string;
  /** Comissões e cargos (área de atuação), fonte: ws2.asmx/VereadoresCMSP */
  areasDeAtuacao?: string[];
}

async function fetchVereadores(): Promise<Vereador[]> {
  const { data, error } = await supabase.functions.invoke('fetch-vereadores');
  
  if (error) {
    console.error('[useVereadores] Edge function error:', error);
    throw error;
  }

  if (!data?.vereadores || !Array.isArray(data.vereadores)) {
    console.error('[useVereadores] Invalid response format:', data);
    throw new Error('Formato de resposta inválido');
  }

  return data.vereadores;
}

export function useVereadores() {
  return useQuery({
    queryKey: ['vereadores'],
    queryFn: fetchVereadores,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 2,
    retryDelay: 1000,
  });
}

export function useVereador(id: string | undefined) {
  const { data: vereadores, isLoading, error } = useVereadores();
  
  const vereador = id ? vereadores?.find(v => v.id === id) : undefined;
  
  return {
    vereador,
    isLoading,
    error
  };
}
