import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache configuration
let memoryCache: Vereador[] | null = null;
let memoryCacheTimestamp = 0;
const MEMORY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
  /** Comissões e cargos (área de atuação), fonte: ws2.asmx/VereadoresCMSP */
  areasDeAtuacao?: string[];
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

/** Normaliza nome para matching entre JSON e XML (maiúsculas, sem acentos, espaços colapsados). */
function normalizeNomeForMatch(nome: string): string {
  return (nome ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[.\-,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const VEREADORES_CMSP_XML_URL = 'https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/VereadoresCMSP';

/** Busca XML VereadoresCMSP e retorna mapa nome normalizado -> áreas (comissões/cargos). */
async function fetchAreasDeAtuacaoFromXml(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  try {
    const res = await fetch(VEREADORES_CMSP_XML_URL, {
      headers: { 'Accept': 'application/xml', 'User-Agent': 'CamaraNaMao/1.0' },
    });
    if (!res.ok) return map;
    const xml = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const vereadorNodes = doc.getElementsByTagName('Vereador');
    for (let i = 0; i < vereadorNodes.length; i++) {
      const v = vereadorNodes[i];
      const nomeEl = v.getElementsByTagName('Nome')[0];
      const nomeVereador = nomeEl?.textContent?.trim();
      if (!nomeVereador) continue;
      const areas: string[] = [];
      const cargosEl = v.getElementsByTagName('Cargos')[0];
      if (cargosEl) {
        const cargos = cargosEl.getElementsByTagName('Cargo');
        for (let j = 0; j < cargos.length; j++) {
          const enteEl = cargos[j].getElementsByTagName('Ente')[0];
          const nomeEnte = enteEl?.getElementsByTagName('Nome')[0]?.textContent?.trim();
          if (nomeEnte && !areas.includes(nomeEnte)) areas.push(nomeEnte);
        }
      }
      const key = normalizeNomeForMatch(nomeVereador);
      if (key && areas.length > 0) {
        map.set(key, areas);
        const semPrefixos = key.replace(/^(DR|VER|VEREADOR)\s+/, '').trim();
        if (semPrefixos && semPrefixos !== key) map.set(semPrefixos, areas);
      }
    }
    console.log(`[fetch-vereadores] Areas de atuacao loaded for ${map.size} vereadores from XML`);
  } catch (e) {
    console.warn('[fetch-vereadores] VereadoresCMSP XML failed:', (e as Error).message);
  }
  return map;
}

// Transform API data to internal format
function transformVereador(v: VereadorAPI, areasDeAtuacao?: string[]): Vereador {
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
    region: undefined,
    areasDeAtuacao: areasDeAtuacao?.length ? areasDeAtuacao : undefined,
  };
}

// Fetch from SP Legis API (JSON) + áreas de atuação from VereadoresCMSP (XML)
async function fetchFromAPI(): Promise<Vereador[]> {
  console.log('[fetch-vereadores] Fetching from SP Legis API...');
  const [areasMap, response] = await Promise.all([
    fetchAreasDeAtuacaoFromXml(),
    fetch('https://saopaulo.sp.leg.br/vereadores-json/', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'CamaraNaMao/1.0' },
    }),
  ]);

  if (!response.ok) {
    throw new Error(`API responded with status ${response.status}`);
  }

  const data: VereadorAPI[] = await response.json();

  const activeVereadores = data
    .filter(v => v.Ativo === 'on' && v.Vereador?.trim())
    .map(v => {
      const name = v.Vereador.trim();
      const key = normalizeNomeForMatch(name);
      const areas = areasMap.get(key) ?? areasMap.get(key.replace(/^(DR|VER|VEREADOR)\s+/, '').trim());
      return transformVereador(v, areas);
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  console.log(`[fetch-vereadores] Found ${activeVereadores.length} active council members`);
  return activeVereadores;
}

// Update the database cache
async function updateDatabaseCache(supabase: any, vereadores: Vereador[]): Promise<void> {
  console.log('[fetch-vereadores] Updating database cache...');
  
  try {
    // Upsert all vereadores to the cache table
    const records = vereadores.map(v => ({
      id: v.id,
      name: v.name,
      party: v.party,
      photo: v.photo,
      phone: v.phone,
      email: v.email,
      initials: v.initials,
      sala: v.sala,
      andar: v.andar,
      gv: v.gv,
      is_leader: v.isLeader,
      is_government_leader: v.isGovernmentLeader,
      is_substitute: v.isSubstitute,
      is_on_leave: v.isOnLeave,
      region: v.region,
      areas_de_atuacao: v.areasDeAtuacao ?? [],
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('council_members_cache')
      .upsert(records, { onConflict: 'id' });

    if (error) {
      console.error('[fetch-vereadores] Error updating cache:', error);
    } else {
      console.log(`[fetch-vereadores] Cache updated with ${records.length} records`);
    }
  } catch (err) {
    console.error('[fetch-vereadores] Error in updateDatabaseCache:', err);
  }
}

// Fetch from database cache
async function fetchFromDatabaseCache(supabase: any): Promise<Vereador[]> {
  console.log('[fetch-vereadores] Fetching from database cache...');
  
  const { data, error } = await supabase
    .from('council_members_cache')
    .select('*')
    .order('name');

  if (error) {
    console.error('[fetch-vereadores] Error fetching from cache:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('[fetch-vereadores] Database cache is empty');
    return [];
  }

  // Transform database format back to Vereador format
  const vereadores: Vereador[] = data.map((row: any) => ({
    id: row.id,
    name: row.name,
    party: row.party,
    photo: row.photo,
    phone: row.phone,
    email: row.email,
    initials: row.initials,
    sala: row.sala,
    andar: row.andar,
    gv: row.gv,
    isLeader: row.is_leader,
    isGovernmentLeader: row.is_government_leader,
    isSubstitute: row.is_substitute,
    isOnLeave: row.is_on_leave,
    region: row.region,
    areasDeAtuacao: Array.isArray(row.areas_de_atuacao) ? row.areas_de_atuacao : undefined,
  }));

  console.log(`[fetch-vereadores] Retrieved ${vereadores.length} records from cache`);
  return vereadores;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const now = Date.now();
    
    // Check memory cache first
    if (memoryCache && (now - memoryCacheTimestamp) < MEMORY_CACHE_TTL) {
      console.log('[fetch-vereadores] Returning memory cached data');
      return new Response(
        JSON.stringify({
          vereadores: memoryCache,
          cached: true,
          source: 'memory',
          count: memoryCache.length,
          cachedAt: new Date(memoryCacheTimestamp).toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Try to fetch fresh data from API
    const vereadores = await fetchFromAPI();
    
    // Update memory cache
    memoryCache = vereadores;
    memoryCacheTimestamp = now;
    
    // Update database cache in background (don't await to not block response)
    updateDatabaseCache(supabase, vereadores);

    return new Response(
      JSON.stringify({
        vereadores,
        cached: false,
        source: 'api',
        count: vereadores.length,
        fetchedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (apiError) {
    const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
    console.error('[fetch-vereadores] API Error:', errorMessage);
    
    // Return memory cache if available (even if stale)
    if (memoryCache) {
      console.log('[fetch-vereadores] Returning stale memory cache due to API error');
      return new Response(
        JSON.stringify({
          vereadores: memoryCache,
          cached: true,
          stale: true,
          source: 'memory',
          count: memoryCache.length,
          error: errorMessage
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Try database cache as fallback
    try {
      const cachedVereadores = await fetchFromDatabaseCache(supabase);
      
      if (cachedVereadores.length > 0) {
        // Update memory cache with database data
        memoryCache = cachedVereadores;
        memoryCacheTimestamp = Date.now();
        
        return new Response(
          JSON.stringify({
            vereadores: cachedVereadores,
            cached: true,
            stale: true,
            source: 'database',
            count: cachedVereadores.length,
            error: errorMessage
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    } catch (cacheError) {
      console.error('[fetch-vereadores] Cache fallback error:', cacheError);
    }

    // No data available at all
    return new Response(
      JSON.stringify({
        error: 'Erro ao buscar vereadores',
        details: errorMessage,
        vereadores: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
