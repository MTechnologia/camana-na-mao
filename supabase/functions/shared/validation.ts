import { z } from 'https://deno.land/x/zod/mod.ts';
import { errorResponse, validationErrorResponse } from './api-response.ts';

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transformar erros do Zod em formato padronizado
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return {
    success: false,
    response: validationErrorResponse(errors),
  };
}

// Schemas reutilizáveis
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).max(1000).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const SortSchema = z.object({
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const VereadorQuerySchema = PaginationSchema.merge(SortSchema).extend({
  partido: z.string().min(2).max(50).optional(),
  search: z.string().min(2).max(100).optional(),
  ativo: z.coerce.boolean().optional(),
});

export const ProjetoQuerySchema = PaginationSchema.merge(SortSchema).extend({
  ano: z.coerce.number().min(2000).max(2100).optional(),
  tipo: z.string().max(10).optional(),
  status: z.string().max(50).optional(),
  autor: z.string().max(100).optional(),
  search: z.string().min(2).max(100).optional(),
});

export const SessaoQuerySchema = PaginationSchema.merge(SortSchema).extend({
  ano: z.coerce.number().min(2000).max(2100).optional(),
  mes: z.coerce.number().min(1).max(12).optional(),
  dataInicial: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataFinal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const NoticiaQuerySchema = PaginationSchema.merge(SortSchema).extend({
  categoria: z.string().max(50).optional(),
  search: z.string().min(2).max(100).optional(),
  dataInicial: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataFinal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Helper para validar query params
export async function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  url: URL
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  const params = Object.fromEntries(url.searchParams.entries());
  return validateRequest(schema, params);
}

// Helper para validar body JSON
export async function validateBody<T>(
  schema: z.ZodSchema<T>,
  req: Request
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  try {
    const body = await req.json();
    return validateRequest(schema, body);
  } catch (err) {
    return {
      success: false,
      response: errorResponse(
        'INVALID_JSON',
        'Corpo da requisição não é um JSON válido',
        400
      ),
    };
  }
}
