import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache configuration
let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface VereadorAPI {
  Vereador: string;
  Partido: string;
  Foto: string;
  Ramal: string;
  email: string;
  Sala: string;
  Andar: string;
  GV: string;
  Ativo: string;
  LiderPartido: string;
  LiderGoverno: string;
  Suplente: string;
  Licenciado: string;
}

interface Vereador {
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
  isLeader: boolean;
  isGovernmentLeader: boolean;
  isSubstitute: boolean;
  isOnLeave: boolean;
  region?: string;
}

// Generate a stable ID from the name
function generateId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Generate initials from the name
function generateInitials(name: string): string {
  const parts = name.split(' ').filter(p => p.length > 0);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Transform API data to internal format
function transformVereador(v: VereadorAPI): Vereador {
  const name = v.Vereador.trim();
  
  return {
    id: generateId(name),
    name: name,
    party: v.Partido?.trim() || 'Sem partido',
    photo: v.Foto || '',
    phone: v.Ramal ? `(11) 3396-${v.Ramal}` : '(11) 3396-4000',
    email: v.email?.trim() || '',
    initials: generateInitials(name),
    sala: v.Sala?.trim() || undefined,
    andar: v.Andar?.trim() || undefined,
    gv: v.GV?.trim() || undefined,
    isLeader: v.LiderPartido === 'on',
    isGovernmentLeader: v.LiderGoverno === 'on',
    isSubstitute: v.Suplente === 'on',
    isOnLeave: v.Licenciado === 'on',
    region: undefined // API doesn't provide region, could be enriched later
  };
}

async function fetchFromAPI(): Promise<Vereador[]> {
  console.log('[fetch-vereadores] Fetching from SP Legis API...');
  
  const response = await fetch('https://saopaulo.sp.leg.br/vereadores-json/', {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CamaraNaMao/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`API responded with status ${response.status}`);
  }

  const data: VereadorAPI[] = await response.json();
  
  // Filter only active council members and transform
  const activeVereadores = data
    .filter(v => v.Ativo === 'on' && v.Vereador?.trim())
    .map(transformVereador)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  console.log(`[fetch-vereadores] Found ${activeVereadores.length} active council members`);
  
  return activeVereadores;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();
    
    // Check cache
    if (cachedData && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('[fetch-vereadores] Returning cached data');
      return new Response(
        JSON.stringify({
          vereadores: cachedData,
          cached: true,
          count: cachedData.length,
          cachedAt: new Date(cacheTimestamp).toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Fetch fresh data
    const vereadores = await fetchFromAPI();
    
    // Update cache
    cachedData = vereadores;
    cacheTimestamp = now;

    return new Response(
      JSON.stringify({
        vereadores,
        cached: false,
        count: vereadores.length,
        fetchedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[fetch-vereadores] Error:', errorMessage);
    
    // Return cached data if available, even if stale
    if (cachedData) {
      console.log('[fetch-vereadores] Returning stale cache due to error');
      return new Response(
        JSON.stringify({
          vereadores: cachedData,
          cached: true,
          stale: true,
          count: cachedData.length,
          error: errorMessage
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Erro ao buscar vereadores',
        details: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
