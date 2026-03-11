/**
 * Serviço server-to-server para inscrição em Audiências Públicas (CMSP) via Ninja Forms.
 * Não expõe token/nonce no frontend.
 */

const CMSP_AUDIENCIA_BASE = "https://www.saopaulo.sp.leg.br/audienciaspublicas/audiencia";
const CMSP_AJAX_URL = "https://www.saopaulo.sp.leg.br/audienciaspublicas/wp-admin/admin-ajax.php";
const NINJA_FORM_ID = 2;

/** Campos do formulário Ninja (form_id=2) na CMSP – usados quando a página não expõe outros IDs ou em fallback */
const FIELD_NAMES_FORM_2 = {
  nome: 7,
  email: 9,
  telefone: 10,
  apCode: 19,
  lgpd: 94,
} as const;

/** Conjuntos de field IDs conhecidos por form_id (CMSP pode ter form 1 com mesmos IDs ou diferentes) */
const FIELD_IDS_BY_FORM: Record<number, Record<string, number>> = {
  1: { nome: 7, email: 9, telefone: 10, apCode: 19, lgpd: 94 },
  2: { nome: 7, email: 9, telefone: 10, apCode: 19, lgpd: 94 },
};

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
  /** IDs dos campos por nome (se não informado, usa FIELD_IDS_BY_FORM[formId] ou form 2). */
  fieldIds?: Record<string, number>;
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
 * Ninja Forms pode expor formID/form_id no nfFrontEnd ou em form.id, data-form-id, etc.
 */
export function extractNinjaFormId(html: string): number | null {
  if (!html || typeof html !== "string") return null;
  const patterns: Array<{ re: RegExp; group: number }> = [
    { re: /["']formID["']\s*:\s*["']?(\d+)["']?/i, group: 1 },
    { re: /["']form_id["']\s*:\s*(\d+)/i, group: 1 },
    { re: /form\.id\s*=\s*['"]?(\d+)['"]?/i, group: 1 },
    { re: /data-form-id=["'](\d+)["']/i, group: 1 },
    { re: /nf-form-(\d+)(?:_\d+)?/i, group: 1 },
    { re: /ninja_form[^\]]*id=(\d+)/i, group: 1 },
  ];
  for (const { re, group } of patterns) {
    const m = html.match(re);
    const val = m?.[group];
    if (val) {
      const n = parseInt(val, 10);
      if (n >= 1 && n <= 9999) return n;
    }
  }
  return null;
}

/**
 * Monta o formData no formato esperado pelo Ninja Forms (JSON string).
 * Usa fieldIds do input, ou FIELD_IDS_BY_FORM[formId], ou fallback form 2.
 */
function buildFormDataPayload(input: NinjaInscricaoInput): string {
  const formId = input.formId ?? NINJA_FORM_ID;
  const ids = input.fieldIds ?? FIELD_IDS_BY_FORM[formId] ?? FIELD_NAMES_FORM_2;
  const fields: Record<string, unknown> = {
    [String(ids.nome)]: input.nome.trim(),
    [String(ids.email)]: input.email.trim(),
    [String(ids.telefone)]: input.telefone.trim(),
    [String(ids.apCode)]: input.apCode.trim(),
    [String(ids.lgpd)]: 1,
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
      Origin: "https://www.saopaulo.sp.leg.br",
      "User-Agent": "Mozilla/5.0 (compatible; CamaraNaMao/1.0; Integracao CMSP)",
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
    console.warn("[inscricao-ninja] CMSP respondeu com errors (raw):", JSON.stringify(errors));
    return { ok: false, errors: mapNinjaErrors(errors) };
  }
  if (dataErrors !== undefined && dataErrors !== null) {
    console.warn("[inscricao-ninja] CMSP respondeu com data.errors (raw):", JSON.stringify(dataErrors));
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

  // CMSP remove/desativa o formulário quando as inscrições encerram; detectar na página e evitar POST que retorna "Formulário não existe".
  const inscricoesEncerradas =
    /inscri[çc][oõ]es\s+encerradas?/i.test(html) ||
    /inscri[çc][oõ]es\s+para\s+(?:participa[çc][aã]o|manifesta[çc][aã]o)[^.]*foram\s+encerradas/i.test(html);
  if (inscricoesEncerradas) {
    return {
      ok: false,
      errors: ["As inscrições para esta audiência já foram encerradas. Você pode comparecer presencialmente ou enviar manifestação por escrito pelo site da Câmara (link na audiência)."],
    };
  }

  const security = extractNinjaSecurity(html);
  const extractedFormId = extractNinjaFormId(html);
  const formId = extractedFormId ?? NINJA_FORM_ID;

  console.warn(
    "[inscricao-ninja] fetchPageAndSubmit:",
    "slug=" + slug,
    "form_id=" + formId,
    "form_id_from_page=" + (extractedFormId ?? "null (usando fallback " + NINJA_FORM_ID + ")"),
    "nonce_length=" + (security?.length ?? 0)
  );

  if (!security) {
    return {
      ok: false,
      errors: ["Não foi possível carregar o formulário de inscrição. Tente novamente mais tarde."],
    };
  }

  let result = await submitNinjaForm({ ...input, security, referer: pageUrl, formId });

  // Fallback: CMSP às vezes devolve "Formulário não existe" para form_id extraído da página (ex.: 1).
  // Tenta reenviar com form_id=2 e campos padrão (form 2), que é o formulário de inscrição histórico.
  // Nota: result.errors já passou por mapNinjaErrors, então pode vir a mensagem mapeada ("temporariamente indisponível") em vez do texto bruto.
  const formNotExist =
    !result.ok &&
    result.errors.some(
      (e) =>
        /formulário não existe|form does not exist|form not found/i.test(e) ||
        /formulário da Câmara está temporariamente indisponível/i.test(e)
    );
  if (formNotExist && formId === 1) {
    console.warn("[inscricao-ninja] Formulário não existe com form_id=1; tentando fallback form_id=2");
    result = await submitNinjaForm({
      ...input,
      security,
      referer: pageUrl,
      formId: NINJA_FORM_ID,
      fieldIds: FIELD_IDS_BY_FORM[2],
    });
  }

  return result;
}
