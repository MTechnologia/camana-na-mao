import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { successResponse, errorResponse } from '../../../shared/api-response.ts';
import { checkRateLimit, getRateLimitConfig, getRateLimitHeaders } from '../../../shared/rate-limit.ts';
import { getCached, setCached } from '../../../shared/cache.ts';
import { validateQueryParams, VereadorQuerySchema } from '../../../shared/validation.ts';
import { getUserFromRequest, getClientIP } from '../../../shared/auth.ts';

const CACHE_TTL = 10 * 60; // 10 minutos
const EXTERNAL_API_URL = 'https://saopaulo.sp.leg.br/vereadores-json/';

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
    region: undefined
  };
}

async function fetchVereadoresFromAPI(): Promise<Vereador[]> {
  console.log('[vereadores] Fetching from external API...');
  
  const response = await fetch(EXTERNAL_API_URL, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CamaraNaMao/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`External API error: ${response.status}`);
  }

  const data: VereadorAPI[] = await response.json();
  
  // Filter only active council members and transform
  const activeVereadores = data
    .filter(v => v.Ativo === 'on' && v.Vereador?.trim())
    .map(transformVereador)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  console.log(`[vereadores] Found ${activeVereadores.length} active council members`);
  
  return activeVereadores;
}

async function getVereadoresFromCacheOrAPI(): Promise<Vereador[]> {
  const cacheKey = 'vereadores:all';
  
  // Tentar buscar do cache
  const cached = await getCached<Vereador[]>(cacheKey, CACHE_TTL);
  if (cached) {
    console.log('[vereadores] Cache hit');
    return cached;
  }

  console.log('[vereadores] Cache miss, fetching from API');
  // Buscar da API externa
  const vereadores = await fetchVereadoresFromAPI();
  
  // Salvar no cache (não bloqueante)
  setCached(cacheKey, vereadores, CACHE_TTL).catch(err => {
    console.error('[vereadores] Failed to cache:', err);
  });

  return vereadores;
}

// GET /api/v1/vereadores
export async function getVereadores(req: Request): Promise<Response> {
  const url = new URL(req.url);

  try {
    // Validar query params
    const validation = await validateQueryParams(VereadorQuerySchema, url);
    if (!validation.success) {
      return validation.response;
    }
    const { page, limit, sort, order, partido, search, ativo } = validation.data;

    // Rate limiting
    const authInfo = await getUserFromRequest(req);
    const userRole = authInfo?.role || null;
    const identifier = authInfo?.user?.id || getClientIP(req);
    
    const rateLimitConfig = getRateLimitConfig(userRole, url.pathname);
    const rateLimit = await checkRateLimit(identifier, rateLimitConfig, req);
    
    if (!rateLimit.allowed) {
      return errorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Limite de requisições excedido',
        429,
        { resetAt: rateLimit.resetAt },
        { headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Buscar dados
    const allVereadores = await getVereadoresFromCacheOrAPI();
    
    // Aplicar filtros
    let filtered = allVereadores;
    if (partido) {
      filtered = filtered.filter(v => v.party.toLowerCase().includes(partido.toLowerCase()));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(searchLower) ||
        v.party.toLowerCase().includes(searchLower)
      );
    }
    if (ativo !== undefined) {
      // Todos os vereadores retornados estão ativos (já filtrado na API)
      // Ajustar conforme necessário
    }

    // Ordenar
    if (sort === 'name') {
      filtered.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name, 'pt-BR');
        return order === 'asc' ? comparison : -comparison;
      });
    }

    // Paginar
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return successResponse(paginated, {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      meta: {
        cached: true,
      },
      headers: getRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    console.error('[vereadores] Error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'Erro ao buscar vereadores',
      500
    );
  }
}

// GET /api/v1/vereadores/:id
export async function getVereadorById(
  req: Request,
  params: { id: string }
): Promise<Response> {
  try {
    // Rate limiting
    const url = new URL(req.url);
    const authInfo = await getUserFromRequest(req);
    const userRole = authInfo?.role || null;
    const identifier = authInfo?.user?.id || getClientIP(req);
    
    const rateLimitConfig = getRateLimitConfig(userRole, url.pathname);
    const rateLimit = await checkRateLimit(identifier, rateLimitConfig, req);
    
    if (!rateLimit.allowed) {
      return errorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Limite de requisições excedido',
        429,
        { resetAt: rateLimit.resetAt },
        { headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Buscar do cache ou API
    const allVereadores = await getVereadoresFromCacheOrAPI();
    const vereador = allVereadores.find(v => v.id === params.id);
    
    if (!vereador) {
      return errorResponse('NOT_FOUND', 'Vereador não encontrado', 404);
    }
    
    return successResponse(vereador, {
      meta: {
        cached: true,
      },
      headers: getRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    console.error('[vereadores] Error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'Erro ao buscar vereador',
      500
    );
  }
}

// Este arquivo exporta apenas os handlers para uso pelo api-router
// NÃO é uma Edge Function separada - não deve ter serve() aqui
// Os handlers são importados e registrados no api-router/index.ts
