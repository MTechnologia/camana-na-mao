import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { vereadores as localVereadores, Vereador } from '@/data/vereadores';

export interface VereadorAPI {
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
}

// Convert API format to legacy Vereador format for backward compatibility
function toVereador(v: VereadorAPI): Vereador {
  return {
    id: v.id,
    name: v.name,
    party: v.party,
    photo: v.photo,
    phone: v.phone,
    email: v.email,
    initials: v.initials,
    region: v.region
  };
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

  // Convert to legacy format
  return data.vereadores.map(toVereador);
}

export function useVereadores() {
  return useQuery({
    queryKey: ['vereadores'],
    queryFn: fetchVereadores,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 2,
    retryDelay: 1000,
    // Fallback to local data on error
    placeholderData: localVereadores,
  });
}

export function useVereador(id: string | undefined) {
  const { data: vereadores, isLoading, error } = useVereadores();
  
  const vereador = id ? vereadores?.find(v => v.id === id) : undefined;
  
  return {
    vereador,
    isLoading,
    error,
    // Fallback to local data
    fallbackVereador: id ? localVereadores.find(v => v.id === id) : undefined
  };
}
