/**
 * Envia a inscrição para o formulário oficial da CMSP (Ninja Forms) quando a audiência
 * tem slug e ap_code configurados. A API exige usuário autenticado.
 */
import { supabase, supabaseUrl } from "@/integrations/supabase/client";

export interface SubmitInscricaoToCmspParams {
  nome: string;
  email: string;
  telefone: string;
  apCode: string;
  slug: string;
}

export interface SubmitInscricaoToCmspResult {
  ok: boolean;
  error?: string;
}

export async function submitInscricaoToCmsp(
  params: SubmitInscricaoToCmspParams
): Promise<SubmitInscricaoToCmspResult> {
  const { nome, email, telefone, apCode, slug } = params;
  if (!slug?.trim() || !apCode?.trim()) {
    console.info("[submitInscricaoToCmsp] Não chamado: slug ou ap_code ausente");
    return { ok: false, error: "slug ou ap_code ausente" };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.info("[submitInscricaoToCmsp] Não chamado: usuário não autenticado");
    return { ok: false, error: "not_authenticated" };
  }

  const baseUrl = (supabaseUrl || "").replace(/\/$/, "");
  if (!baseUrl) {
    console.warn("[submitInscricaoToCmsp] supabaseUrl ausente (CAMARA_URL / VITE_SUPABASE_URL)");
    return { ok: false, error: "supabase_url_ausente" };
  }

  const url = `${baseUrl}/functions/v1/api-router/audiencias/inscricao`;
  console.info("[submitInscricaoToCmsp] Chamando API CMSP:", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        apCode: apCode.trim(),
        slug: slug.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data?.errors) ? data.errors.join(", ") : data?.message ?? res.statusText;
      console.warn("[submitInscricaoToCmsp] API respondeu com erro:", res.status, msg);
      return { ok: false, error: msg };
    }
    console.info("[submitInscricaoToCmsp] API CMSP ok");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[submitInscricaoToCmsp] Falha na requisição:", message);
    return { ok: false, error: message };
  }
}
