/**
 * Serviço server-to-server para inscrição em Audiências Públicas (CMSP) via Ninja Forms.
 * Não expõe token/nonce no frontend.
 */

const CMSP_AUDIENCIA_BASE = "https://www.saopaulo.sp.leg.br/audienciaspublicas/audiencia";
const CMSP_AJAX_URL = "https://www.saopaulo.sp.leg.br/audienciaspublicas/wp-admin/admin-ajax.php";
const NINJA_FORM_ID = 2;

/** Campos do formulário Ninja (form_id=2) na CMSP */
const FIELD_NAMES = {
  nome: 7,
  email: 9,
  telefone: 10,
  apCode: 19,
  lgpd: 94,
} as const;

export interface NinjaInscricaoInput {
  nome: string;
  email: string;
  telefone: string;
  apCode: string;
  security: string;
  /** URL da página da audiência (Referer). */
  referer?: string;
  /** form_id do Ninja Forms (extraído da página se não informado). */
  formId?: number;
}

export interface NinjaSubmitSuccess {
  ok: true;
  sub_id: string;
  message: string;
}

export interface NinjaSubmitError {
  ok: false;
  errors: string[];
}

export type NinjaSubmitResult = NinjaSubmitSuccess | NinjaSubmitError;

/**
 * Extrai o token de nonce do HTML da página da audiência (Ninja Forms).
 * CMSP usa nfFrontEnd.ajaxNonce; outras instalações podem usar "security" ou wpnonce.
 */
export function extractNinjaSecurity(html: string): string | null {
  if (!html || typeof html !== "string") return null;

  const patterns: RegExp[] = [
    // CMSP: var nfFrontEnd = {..., "ajaxNonce":"5056748f6d",...}
    /["']ajaxNonce["']\s*:\s*["']([^"']+)["']/i,
    // "security":"abc123" ou 'security':'abc123'
    /["']security["']\s*:\s*["']([^"']+)["']/i,
    // name="security" value="..."
    /name=["']security["'][^>]*value=["']([^"']+)["']/i,
    /value=["']([^"']+)["'][^>]*name=["']security["']/i,
    // nf_ajax ou nfFrontEnd com security
    /nf(?:FrontEnd|_ajax)[^"']*["']security["']\s*:\s*["']([^"']+)["']/i,
    // wpnonce / _wpnonce
    /(?:wpnonce|_wpnonce)["']?\s*[=:]\s*["']([a-f0-9a-zA-Z]{8,})["']/i,
    // security = "..." (valor alfanumérico)
    /security["']?\s*[=:]\s*["']([a-f0-9a-zA-Z]{8,})["']/i,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    const value = m?.[1]?.trim();
    if (value && value.length >= 8) return value;
  }
  return null;
}

/**
 * Extrai o form_id do formulário de inscrição (Ninja Forms) no HTML da página.
 * Procura form.id='X' no bloco que contém "Inscrições" ou "Event Registration".
 */
export function extractNinjaFormId(html: string): number | null {
  if (!html || typeof html !== "string") return null;
  const m = html.match(/form\.id\s*=\s*['"](\d+)['"]/);
  if (m && m[1]) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 9999) return n;
  }
  return null;
}

/**
 * Monta o formData no formato esperado pelo Ninja Forms (JSON string).
 */
function buildFormDataPayload(input: NinjaInscricaoInput): string {
  const formId = input.formId ?? NINJA_FORM_ID;
  const fields: Record<string, unknown> = {
    [String(FIELD_NAMES.nome)]: input.nome.trim(),
    [String(FIELD_NAMES.email)]: input.email.trim(),
    [String(FIELD_NAMES.telefone)]: input.telefone.trim(),
    [String(FIELD_NAMES.apCode)]: input.apCode.trim(),
    [String(FIELD_NAMES.lgpd)]: 1,
  };
  const formData = {
    form_id: formId,
    fields,
  };
  return JSON.stringify(formData);
}

/**
 * Converte mensagens de erro do Ninja Forms para texto amigável.
 */
function mapNinjaErrors(errors: unknown): string[] {
  if (Array.isArray(errors)) {
    return errors
      .filter((e): e is string => typeof e === "string")
      .map((msg) => {
        const lower = msg.toLowerCase();
        if (lower.includes("duplicad") || lower.includes("already") || lower.includes("já inscrit"))
          return "Você já está inscrito nesta audiência.";
        if (lower.includes("formulário não existe") || lower.includes("form does not exist") || lower.includes("form not found"))
          return "O formulário da Câmara está temporariamente indisponível. Tente inscrever-se diretamente no site da Câmara (link na audiência) ou mais tarde.";
        if (lower.includes("email")) return "E-mail inválido ou já utilizado.";
        if (lower.includes("telefone") || lower.includes("phone")) return "Telefone inválido.";
        if (lower.includes("nome")) return "Nome inválido.";
        if (lower.includes("lgpd") || lower.includes("consent")) return "É necessário concordar com o uso dos dados (LGPD).";
        return msg;
      });
  }
  if (errors && typeof errors === "object" && "message" in errors && typeof (errors as { message: unknown }).message === "string") {
    return [(errors as { message: string }).message];
  }
  return ["Não foi possível concluir a inscrição. Tente novamente."];
}

/**
 * Remove tags HTML e normaliza espaços.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Envia o formulário para o admin-ajax.php (Ninja Forms).
 * Referer deve ser a página da audiência; Content-Type: application/x-www-form-urlencoded.
 */
export async function submitNinjaForm(input: NinjaInscricaoInput): Promise<NinjaSubmitResult> {
  const referer = input.referer ?? `${CMSP_AUDIENCIA_BASE}/audiencia/`;
  const formDataStr = buildFormDataPayload(input);

  const body = new URLSearchParams({
    action: "nf_ajax_submit",
    security: input.security,
    formData: formDataStr,
  }).toString();

  const res = await fetch(CMSP_AJAX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: referer,
      "User-Agent": "CamaraNaMao/1.0 (Integracao CMSP)",
    },
    body,
  });

  if (!res.ok) {
    return {
      ok: false,
      errors: [`Erro de integração com o site da Câmara (${res.status}). Tente novamente mais tarde.`],
    };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return {
      ok: false,
      errors: ["Resposta inválida do servidor da Câmara. Tente novamente."],
    };
  }

  const obj = data as Record<string, unknown>;
  const dataObj = obj?.data as Record<string, unknown> | undefined;
  const actions = (obj?.actions ?? dataObj?.actions) as Record<string, unknown> | undefined;
  const save = actions?.save as Record<string, unknown> | undefined;
  const errors = obj?.errors as unknown;
  const dataErrors = obj?.data?.errors as unknown;

  if (errors !== undefined && errors !== null) {
    return { ok: false, errors: mapNinjaErrors(errors) };
  }
  if (dataErrors !== undefined && dataErrors !== null) {
    return { ok: false, errors: mapNinjaErrors(dataErrors) };
  }

  const subId = save?.sub_id;
  const successMessage = (actions?.success_message as string) ?? "";

  if (subId != null && String(subId).trim() !== "") {
    return {
      ok: true,
      sub_id: String(subId),
      message: stripHtml(successMessage) || "Inscrição realizada com sucesso.",
    };
  }

  return {
    ok: false,
    errors: mapNinjaErrors(obj?.errors ?? ["Resposta sem confirmação de inscrição."]),
  };
}

/**
 * Busca a página da audiência e extrai o nonce; em seguida submete o formulário.
 */
export async function fetchPageAndSubmit(
  slug: string,
  input: Omit<NinjaInscricaoInput, "security">
): Promise<NinjaSubmitResult> {
  const pageUrl = `${CMSP_AUDIENCIA_BASE}/${encodeURIComponent(slug)}/`;
  const pageRes = await fetch(pageUrl, {
    method: "GET",
    headers: {
      "User-Agent": "CamaraNaMao/1.0 (Integracao CMSP)",
      Accept: "text/html",
    },
  });

  if (!pageRes.ok) {
    return {
      ok: false,
      errors: [`Não foi possível acessar a página da audiência (${pageRes.status}). Verifique o link e tente novamente.`],
    };
  }

  const html = await pageRes.text();
  const security = extractNinjaSecurity(html);
  const formId = extractNinjaFormId(html) ?? NINJA_FORM_ID;

  if (!security) {
    return {
      ok: false,
      errors: ["Não foi possível carregar o formulário de inscrição. Tente novamente mais tarde."],
    };
  }

  return submitNinjaForm({ ...input, security, referer: pageUrl, formId });
}
