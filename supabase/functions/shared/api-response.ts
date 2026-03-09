export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    field?: string; // Para erros de validação
    timestamp?: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    cached?: boolean;
    timestamp?: string;
    version?: string;
    requestId?: string;
  };
}

export function successResponse<T>(
  data: T,
  options?: {
    pagination?: ApiResponse<T>['pagination'];
    meta?: ApiResponse<T>['meta'];
    status?: number;
    headers?: Record<string, string>;
  }
): Response {
  const requestId = crypto.randomUUID();
  const response: ApiResponse<T> = {
    success: true,
    data,
    pagination: options?.pagination,
    meta: {
      ...options?.meta,
      timestamp: new Date().toISOString(),
      version: '1.0',
      requestId,
    },
  };

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'X-Request-ID': requestId,
    'X-API-Version': '1.0',
    ...options?.headers,
  };

  // Adicionar headers de cache se aplicável
  if (options?.meta?.cached) {
    responseHeaders['X-Cache'] = 'HIT';
    responseHeaders['Cache-Control'] = 'public, max-age=300';
  } else {
    responseHeaders['X-Cache'] = 'MISS';
  }

  return new Response(
    JSON.stringify(response),
    {
      status: options?.status || 200,
      headers: responseHeaders,
    }
  );
}

export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  options?: {
    details?: unknown;
    field?: string;
    headers?: Record<string, string>;
  }
): Response {
  const requestId = crypto.randomUUID();
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      details: options?.details,
      field: options?.field,
      timestamp: new Date().toISOString(),
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      requestId,
    },
  };

  // Mapear códigos de erro para status HTTP apropriados
  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMIT_EXCEEDED: 429,
    INTERNAL_ERROR: 500,
    EXTERNAL_API_ERROR: 502,
    SERVICE_UNAVAILABLE: 503,
  };

  const httpStatus = statusMap[code] || status;

  return new Response(
    JSON.stringify(response),
    {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'X-Request-ID': requestId,
        'X-API-Version': '1.0',
        ...options?.headers,
      },
    }
  );
}

// Helper para respostas de validação com múltiplos erros
export function validationErrorResponse(
  errors: Array<{ field: string; message: string; code?: string }>
): Response {
  return errorResponse(
    'VALIDATION_ERROR',
    'Erros de validação encontrados',
    400,
    {
      details: { errors },
    }
  );
}
