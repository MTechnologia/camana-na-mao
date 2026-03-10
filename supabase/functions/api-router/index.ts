import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { errorResponse } from "../shared/api-response.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface Route {
  method: string;
  path: string;
  handler: (req: Request, params: Record<string, string>) => Promise<Response>;
}

const routes: Route[] = [];

// Registrar rotas
function registerRoute(method: string, path: string, handler: Route['handler']) {
  routes.push({ method, path, handler });
}

// Importar e registrar rotas dos endpoints
async function registerRoutes() {
  try {
    // Vereadores
    const { getVereadores, getVereadorById } = await import('../api/v1/vereadores/index.ts');
    
    if (!getVereadores || !getVereadorById) {
      console.error('[api-router] Erro ao importar handlers de vereadores');
      return;
    }
    
    registerRoute('GET', 'vereadores', getVereadores);
    registerRoute('GET', 'vereadores/:id', getVereadorById);

    // Audiências – inscrição Ninja Forms (CMSP)
    const { postAudienciaInscricao } = await import('../api/v1/audiencias/index.ts');
    if (postAudienciaInscricao) {
      registerRoute('POST', 'audiencias/inscricao', postAudienciaInscricao);
    }
  } catch (error) {
    console.error('[api-router] Erro ao registrar rotas:', error);
  }
}

// Router principal
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Registrar rotas na primeira requisição
  if (routes.length === 0) {
    await registerRoutes();
  }

  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;
  
  // Extrair o caminho do recurso a partir do pathname
  // IMPORTANTE: O Supabase remove o prefixo /functions/v1/ antes de passar o pathname
  // Então /functions/v1/api-router/vereadores chega como /api-router/vereadores
  // 
  // Suporta múltiplos formatos:
  // 1. /api-router/{recurso} (formato RESTful direto)
  // 2. /api-router/api/v1/{recurso} (formato com prefixo)
  
  let resourcePath: string | null = null;
  
  // Formato 1: /api-router/{recurso} (formato RESTful direto)
  // Exemplo: /api-router/vereadores -> vereadores
  // Exemplo: /api-router/vereadores/joao-silva -> vereadores/joao-silva
  const routerPathMatch = pathname.match(/^\/api-router\/(.+)$/);
  if (routerPathMatch) {
    let extracted = routerPathMatch[1];
    // Se o caminho começa com "api/v1/", remover esse prefixo
    // Exemplo: api/v1/vereadores -> vereadores
    if (extracted.startsWith('api/v1/')) {
      extracted = extracted.substring(7); // Remove "api/v1/"
    } else if (extracted.startsWith('api/v')) {
      // Também aceita api/v2/, api/v3/, etc.
      extracted = extracted.replace(/^api\/v\d+\//, '');
    }
    resourcePath = extracted;
  }
  
  // Formato 2: /api/v1/{recurso} (compatibilidade direta - se alguém acessar diretamente)
  // Exemplo: /api/v1/vereadores -> vereadores
  const directPathMatch = pathname.match(/^\/api\/v\d+\/(.+)$/);
  if (directPathMatch && !resourcePath) {
    resourcePath = directPathMatch[1];
  }
  
  // Se encontrou um caminho de recurso, fazer o roteamento
  if (resourcePath) {
    // Encontrar rota correspondente
    for (const route of routes) {
      const match = matchRoute(route.path, resourcePath);
      
      if (match && route.method === method) {
        try {
          return await route.handler(req, match.params);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Internal Server Error';
          console.error(`[api-router] Error in ${method} /${resourcePath}:`, error);
          return errorResponse(
            'INTERNAL_ERROR',
            message,
            500
          );
        }
      }
    }
    
    // Rota não encontrada
    return errorResponse(
      'NOT_FOUND',
      `Rota não encontrada: ${method} /${resourcePath}`,
      404
    );
  }
  
  // Health check - quando acessado sem caminho de recurso
  // O pathname chega como /api-router (sem /functions/v1/)
  if (pathname === '/api-router' || pathname === '/api-router/') {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'API Router está funcionando',
        version: '1.0',
        baseUrl: 'https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router',
        endpoints: {
          vereadores: '/functions/v1/api-router/vereadores',
          vereadorById: '/functions/v1/api-router/vereadores/:id',
          audienciasInscricao: 'POST /functions/v1/api-router/audiencias/inscricao',
        },
        supportedFormats: [
          '/functions/v1/api-router/{recurso}',
          '/functions/v1/api-router/api/v1/{recurso}',
        ],
        examples: {
          list: [
            'https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores',
            'https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/api/v1/vereadores',
          ],
          detail: [
            'https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores/joao-silva',
            'https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/api/v1/vereadores/joao-silva',
          ],
          withFilters: 'https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores?page=1&limit=10&search=Silva',
        },
        note: 'Ambos os formatos são aceitos: /functions/v1/api-router/{recurso} ou /functions/v1/api-router/api/v1/{recurso}',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  
  // Caminho inválido
  return errorResponse(
    'INVALID_PATH',
    `Caminho da API inválido. Use /functions/v1/api-router/{recurso} ou /functions/v1/api-router/api/v1/{recurso}. Exemplo: /functions/v1/api-router/vereadores. Pathname recebido: ${pathname}`,
    400,
    {
      details: {
        validFormats: [
          '/functions/v1/api-router/vereadores',
          '/functions/v1/api-router/api/v1/vereadores',
          '/functions/v1/api-router/vereadores/:id',
        ],
        examples: [
          'https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores',
          'https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/api/v1/vereadores',
        ],
        note: 'O Supabase remove o prefixo /functions/v1/ antes de passar o pathname para a função. O pathname recebido foi: ' + pathname,
      },
    }
  );
});

// Helper para matching de rotas
function matchRoute(pattern: string, path: string): { params: Record<string, string> } | null {
  // Converte padrão como "vereadores/:id" para regex e extrai parâmetros
  // Exemplo: "vereadores/:id" -> "^vereadores/(?<id>[^/]+)$"
  // Exemplo: "vereadores" -> "^vereadores$"
  const regexPattern = pattern
    .replace(/:(\w+)/g, '(?<$1>[^/]+)')
    .replace(/\//g, '\\/');
  const regex = new RegExp(`^${regexPattern}$`);
  const match = path.match(regex);
  
  if (match) {
    // Se há match, retornar params (pode ser vazio se não há parâmetros)
    return { params: match.groups || {} };
  }
  return null;
}
