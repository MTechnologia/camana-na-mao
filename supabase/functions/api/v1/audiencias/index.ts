import { getUserFromRequest } from "../../../shared/auth.ts";
import { fetchPageAndSubmit } from "./inscricao-ninja.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface InscricaoBody {
  nome: string;
  email: string;
  telefone: string;
  apCode: string;
  slug: string;
}

function validateInscricaoBody(body: unknown): { ok: true; data: InscricaoBody } | { ok: false; errors: string[] } {
  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["Corpo da requisição inválido."] };
  }
  const b = body as Record<string, unknown>;
  const errors: string[] = [];
  const nome = typeof b.nome === "string" ? b.nome.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const telefone = typeof b.telefone === "string" ? b.telefone.trim() : "";
  const apCode = typeof b.apCode === "string" ? b.apCode.trim() : "";
  const slug = typeof b.slug === "string" ? b.slug.trim() : "";

  if (!nome) errors.push("Nome é obrigatório.");
  if (!email) errors.push("E-mail é obrigatório.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("E-mail inválido.");
  if (!telefone) errors.push("Telefone é obrigatório.");
  if (telefone && telefone.replace(/\D/g, "").length < 10) errors.push("Telefone deve ter DDD e número.");
  if (!apCode) errors.push("Código da audiência (apCode) é obrigatório.");
  if (!slug) errors.push("Slug da audiência é obrigatório.");

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: { nome, email, telefone, apCode, slug } };
}

/**
 * POST /api/v1/audiencias/inscricao
 * Body: { nome, email, telefone, apCode, slug }
 * Response: { ok, sub_id?, message? } | { ok: false, errors: string[] }
 */
function jsonResponse(
  data: { ok: boolean; sub_id?: string; message?: string; errors?: string[] },
  status: number
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export async function postAudienciaInscricao(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, errors: ["Método não permitido."] }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, errors: ["Corpo da requisição inválido (JSON)."] }, 400);
  }

  const validation = validateInscricaoBody(body);
  if (!validation.ok) {
    return jsonResponse({ ok: false, errors: validation.errors }, 400);
  }

  const auth = await getUserFromRequest(req);
  if (!auth?.user) {
    return jsonResponse({ ok: false, errors: ["É necessário estar logado para se inscrever."] }, 401);
  }

  const { nome, email, telefone, apCode, slug } = validation.data;

  try {
    const result = await fetchPageAndSubmit(slug, { nome, email, telefone, apCode });

    if (result.ok) {
      return jsonResponse(
        { ok: true, sub_id: result.sub_id, message: result.message },
        200
      );
    }

    return jsonResponse({ ok: false, errors: result.errors }, 400);
  } catch (err) {
    console.error("[audiencias/inscricao]", err);
    return jsonResponse(
      {
        ok: false,
        errors: ["Erro interno ao processar inscrição. Tente novamente mais tarde."],
      },
      500
    );
  }
}
