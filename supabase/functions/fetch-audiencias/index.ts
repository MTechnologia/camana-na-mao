import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPLEGIS_BASE = "https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx";
const SPLEGIS_WS_BASE = "https://splegisws.saopaulo.sp.leg.br/ws";

// Resposta possível da API SPLEGIS (nomes podem variar - PascalCase comum em .NET)
interface SplegisAudienciaItem {
  Chave?: string;
  chave?: string;
  Titulo?: string;
  titulo?: string;
  Descricao?: string;
  descricao?: string;
  Data?: string;
  data?: string;
  Hora?: string;
  hora?: string;
  Horario?: string;
  horario?: string;
  HorarioInicio?: string;
  horarioInicio?: string;
  DataHora?: string;
  dataHora?: string;
  Local?: string;
  local?: string;
  Tema?: string;
  tema?: string;
  Status?: string;
  status?: string;
  Comissao?: string;
  comissao?: string;
  Comite?: string;
  comite?: string;
  Orgao?: string;
  orgao?: string;
  ComissaoResponsavel?: string;
  comissaoResponsavel?: string;
  NomeComissao?: string;
  nomeComissao?: string;
  OrgaoResponsavel?: string;
  orgaoResponsavel?: string;
  VagasDisponiveis?: number;
  vagasDisponiveis?: number;
  InscricoesAbertas?: boolean;
  inscricoesAbertas?: boolean;
  /** Campos que a API V2 pode usar para descrição longa (não envia Descricao) */
  Colabore?: string;
  colabore?: string;
  Contato?: string;
  contato?: string;
  Objetivo?: string;
  objetivo?: string;
  Texto?: string;
  texto?: string;
  Observacao?: string;
  observacao?: string;
  Tipo?: string;
  tipo?: string;
  Numero?: number | string;
  numero?: number | string;
  Ano?: number | string;
  ano?: number | string;
  /** Listagem V2 pode trazer Projetos[] com Ementa (ex.: PL 1461/2025) — usar como descrição. */
  Projetos?: Array<{ Ementa?: string; ementa?: string; Tipo?: number; Sigla?: string; Numero?: number; Ano?: number; [key: string]: unknown }>;
  projetos?: Array<{ Ementa?: string; ementa?: string; Tipo?: number; Sigla?: string; Numero?: number; Ano?: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

/** Resposta do ProjetoResumoJSON (ementa e promoventes) - igual ao site oficial. */
interface ProjetoResumoResponse {
  Ementa?: string;
  ementa?: string;
  Promoventes?: string;
  promoventes?: string;
  [key: string]: unknown;
}

function getStr(item: SplegisAudienciaItem, ...keys: string[]): string {
  for (const k of keys) {
    const v = item[k];
    if (v != null && typeof v === "string") return v.trim();
  }
  return "";
}

/** Extrai texto de descrição de Comissoes apenas se houver campo Descricao/Texto. A API envia array com Chave,Nome,Sigla,Tipo (dados da comissão), não o texto do PL/audiência. */
function getDescricaoFromComissoes(item: SplegisAudienciaItem): string | null {
  const raw = item["Comissoes"] ?? item["comissoes"];
  if (raw == null) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t.length > 30 ? t : null;
  }
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (first && typeof first === "object") {
      const desc = (first as Record<string, unknown>)["Descricao"] ?? (first as Record<string, unknown>)["descricao"] ?? (first as Record<string, unknown>)["Texto"] ?? (first as Record<string, unknown>)["texto"];
      if (typeof desc === "string" && desc.trim().length > 20) return desc.trim();
    }
    // Não usar JSON da comissão (Chave, Nome, Sigla, Tipo) como descrição
  }
  return null;
}

function getNum(item: SplegisAudienciaItem, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = item[k];
    if (v != null && typeof v === "number" && !Number.isNaN(v)) return v;
    if (v != null && typeof v === "string") {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function getBool(item: SplegisAudienciaItem, ...keys: string[]): boolean | null {
  for (const k of keys) {
    const v = item[k];
    if (v === true || v === "true" || v === "1") return true;
    if (v === false || v === "false" || v === "0") return false;
  }
  return null;
}

/** Extrai o trecho "Observação: ..." (ou "Observacao:" / "Obs:") de um texto. Para até "Mais informações" ou fim. */
function extrairObservacao(texto: string | null | undefined): string | null {
  if (!texto || typeof texto !== "string") return null;
  const t = texto.trim();
  // "Observação: ..." ou "Observacao: ..." ou "Obs.: ..."
  let match = t.match(/\b(?:Observa[cç][aã]o|Obs\.?)\s*:\s*([\s\S]+?)(?=\s*Mais\s+informa[cç][oõ]es\s*:|$)/i);
  if (match) {
    const extracted = match[1].trim();
    if (extracted.length > 5) return extracted;
  }
  // "Como participar" / texto instrucional do site (ex.: "As audiências públicas são abertas... Ao se inscrever você receberá...")
  match = t.match(/(?:Como\s+participar|Participa[cç][aã]o)\s*[:\-]?\s*([\s\S]+?)(?=\s*Mais\s+informa[cç][oõ]es\s*:|Fonte\s*:|$)/i);
  if (match) {
    const extracted = match[1].trim();
    if (extracted.length > 20) return extracted;
  }
  if (/Ao\s+se\s+inscrever\s+voc[eê]\s+receber[aá]|inscrever.*receber[aá]|link\s+de\s+acesso|lembrete\s+do\s+evento|materiais\s+de\s+apoio/i.test(t) && t.length > 30 && t.length < 800) {
    return t;
  }
  // Se o texto todo parece uma única observação (ex.: "As inscrições ... se encerram/encerrarão ... às 10h do dia 16/12/2025")
  if (t.length > 20 && t.length < 500 && /inscri[cç][oõ]es?|encerra(?:m|r[aã]o)|prazo|(\d{1,2}h)\s+do\s+dia\s+\d{2}\/\d{2}/i.test(t)) {
    return t;
  }
  return null;
}

/** Observação padrão do site oficial: inscrições virtuais encerram às 19h do dia anterior. dataNorm em YYYY-MM-DD. */
function observacaoPadraoSiteOficial(dataNorm: string): string {
  const d = new Date(dataNorm + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() - 1);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  const diaAnterior = `${day}/${month}/${year}`;
  return `As inscrições para participação na audiência de forma virtual se encerram às 19h do dia ${diaAnterior}.`;
}

/** Normaliza data para YYYY-MM-DD. Aceita DD/MM/YYYY, DD-MM-YYYY ou YYYY-MM-DD. */
function normalizeDate(s: string): string {
  if (!s || typeof s !== "string") return "";
  const trimmed = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normaliza hora para HH:MM:SS (24h). Aceita 12h AM/PM (ex.: "1:00 PM", "10:30 PM"). */
function normalizeTime(s: string): string {
  if (!s || typeof s !== "string") return "";
  const trimmed = s.trim();
  // Data/hora ISO (extrair só o tempo)
  const isoMatch = trimmed.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/i);
  if (isoMatch) {
    const h = isoMatch[1].padStart(2, "0");
    const m = isoMatch[2];
    const sec = isoMatch[3] || "00";
    return `${h}:${m}:${sec}`;
  }
  // HH:MM ou HH:MM:SS com opcional AM/PM (ex.: "1:00 PM", "10:30 PM", "10:30 AM")
  let match = trimmed.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const sec = (match[3] || "00").padStart(2, "0");
    const ampm = (match[4] || "").toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}:${sec}`;
  }
  // HHhMM ou HHh
  match = trimmed.match(/(\d{1,2})h(\d{2})?/i);
  if (match) {
    const h = match[1].padStart(2, "0");
    const m = (match[2] ?? "00").padStart(2, "0");
    return `${h}:${m}:00`;
  }
  return "";
}

/** Gera chave estável para upsert quando a API não envia Chave (evita duplicatas). */
function syntheticKey(titulo: string, data: string, hora: string, local: string): string {
  const slug = (s: string, max: number) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max)
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-") || "x";
  return `syn:${data}:${hora}:${slug(titulo, 80)}:${slug(local, 40)}`;
}

/**
 * Chama AudienciasPublicasV2JSON no ws2.asmx.
 * DataInicial e DataFinal em YYYY-MM-DD (a API rejeita DD/MM/YYYY nos parâmetros).
 */
async function fetchAudienciasFromSplegis(
  dataInicial: string,
  dataFinal: string
): Promise<SplegisAudienciaItem[]> {
  const params = new URLSearchParams({
    DataInicial: dataInicial,
    DataFinal: dataFinal,
  });
  const url = `${SPLEGIS_BASE}/AudienciasPublicasV2JSON?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "CamaraNaMao/1.0",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SPLEGIS API error ${res.status}: ${text.slice(0, 500)}`);
  }

  const contentType = res.headers.get("content-type") || "";
  let raw: unknown;
  if (contentType.includes("application/json")) {
    raw = await res.json();
  } else {
    const text = await res.text();
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error(`SPLEGIS returned non-JSON: ${text.slice(0, 300)}`);
    }
  }

  if (Array.isArray(raw)) return raw as SplegisAudienciaItem[];
  if (raw && typeof raw === "object" && Array.isArray((raw as any).d)) {
    return (raw as { d: SplegisAudienciaItem[] }).d;
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as any).Audiencias)) {
    return (raw as { Audiencias: SplegisAudienciaItem[] }).Audiencias;
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as any).audiencias)) {
    return (raw as { audiencias: SplegisAudienciaItem[] }).audiencias;
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as any).result)) {
    return (raw as { result: SplegisAudienciaItem[] }).result;
  }
  return [];
}

/** Audiência pública por chave (detalhe) - pode trazer descrição/tema que a listagem não envia. */
async function fetchAudienciaPorChave(chave: number | string): Promise<SplegisAudienciaItem | null> {
  const params = new URLSearchParams({ chave: String(chave) });
  const url = `${SPLEGIS_BASE}/AudienciaPublicaPorChaveV2JSON?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "CamaraNaMao/1.0" },
    });
    if (!res.ok) return null;
    const raw = await res.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as SplegisAudienciaItem;
    if (Array.isArray(raw) && raw.length > 0) return raw[0] as SplegisAudienciaItem;
    const d = (raw as { d?: SplegisAudienciaItem })?.d;
    if (d && typeof d === "object") return d as SplegisAudienciaItem;
    return null;
  } catch {
    return null;
  }
}

const MAX_ENRICH_BY_CHAVE = 40;

/** Extrai referência a projeto (Tipo, Ano, Número) do item ou de texto (ex.: "PL 1461/2025", "Projeto de Lei 1461/2025"). */
function parseProjetoRef(item: SplegisAudienciaItem): { tipo: string; ano: number; numero: number } | null {
  const ano = getNum(item, "Ano", "ano") ?? (typeof item["Ano"] === "string" ? parseInt(item["Ano"], 10) : null);
  const numero = getNum(item, "Numero", "numero");
  const tipo = getStr(item, "Tipo", "tipo");
  if (tipo && numero != null && ano != null && !Number.isNaN(ano)) {
    return { tipo: tipo.toUpperCase().trim(), ano, numero };
  }
  const dataStr = getStr(item, "Data", "data");
  const anoFromData = dataStr ? parseInt(dataStr.slice(0, 4), 10) : new Date().getFullYear();
  const textParts = [
    getStr(item, "Tema", "tema"),
    getStr(item, "Colabore", "colabore"),
    getStr(item, "Descricao", "descricao"),
    getStr(item, "Titulo", "titulo"),
    getStr(item, "Objetivo", "objetivo"),
    getStr(item, "Texto", "texto"),
  ];
  for (const key of Object.keys(item)) {
    if (/descricao|tema|colabore|texto|objetivo|ementa|titulo|resumo/i.test(key)) {
      const v = item[key];
      if (typeof v === "string" && v.length > 10) textParts.push(v);
    }
  }
  const text = textParts.filter(Boolean).join(" ");

  const patterns: { regex: RegExp; tipo: string; hasAno: boolean }[] = [
    { regex: /\b(PL|PDL|PR|PLO|PEC|PLC|PREF)\s*(\d+)\s*\/\s*(\d{4})\b/i, tipo: "", hasAno: true },
    { regex: /Projeto\s+de\s+Lei\s+(\d+)\s*\/\s*(\d{4})\b/i, tipo: "PL", hasAno: true },
    { regex: /Projeto\s+de\s+Lei\s+(\d+)\b/i, tipo: "PL", hasAno: false },
    { regex: /\bPL\s+(\d+)\s*\/\s*(\d{4})\b/i, tipo: "PL", hasAno: true },
    { regex: /\bPL\s+(\d+)\b/i, tipo: "PL", hasAno: false },
    { regex: /Lei\s+(\d+)\s*\/\s*(\d{4})\b/i, tipo: "PL", hasAno: true },
  ];

  for (const { regex, tipo: tipoFromPattern, hasAno } of patterns) {
    const match = text.match(regex);
    if (!match) continue;
    let t: string;
    let num: string;
    let an: number;
    if (tipoFromPattern) {
      t = tipoFromPattern;
      num = match[1];
      an = hasAno && match[2] ? parseInt(match[2], 10) : anoFromData;
    } else {
      t = match[1].toUpperCase();
      num = match[2];
      an = parseInt(match[3], 10);
    }
    const n = parseInt(num, 10);
    if (Number.isNaN(n)) continue;
    if (Number.isNaN(an) || an < 1990 || an > 2100) an = anoFromData;
    return { tipo: t, ano: an, numero: n };
  }
  if (/\b(?:projeto|lei|PL)\b/i.test(text)) {
    const simple = text.match(/\b(\d+)\s*\/\s*(\d{4})\b/);
    if (simple) {
      const n = parseInt(simple[1], 10);
      const a = parseInt(simple[2], 10);
      if (!Number.isNaN(n) && !Number.isNaN(a) && a >= 1990 && a <= 2100) return { tipo: "PL", ano: a, numero: n };
    }
  }
  return null;
}

/** Resumo do projeto (ementa e promoventes) - mesmo conteúdo do site oficial / DetailsDetalhado. */
async function fetchProjetoResumo(ano: number, tipo: string, numero: number): Promise<ProjetoResumoResponse | null> {
  const params = new URLSearchParams({
    ano: String(ano),
    tipo: tipo.trim(),
    numero: String(numero),
  });
  const url = `${SPLEGIS_WS_BASE}/ws2.asmx/ProjetoResumoJSON?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "CamaraNaMao/1.0" },
    });
    if (!res.ok) return null;
    const raw = await res.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as ProjetoResumoResponse;
    const d = (raw as { d?: ProjetoResumoResponse })?.d;
    if (d && typeof d === "object") return d;
    return null;
  } catch {
    return null;
  }
}

const MAX_PROJETO_RESUMO = 80;

function mapToDbRow(item: SplegisAudienciaItem): Record<string, unknown> {
  const titulo = getStr(item, "Titulo", "titulo") || "Audiência pública";
  const dataStr = getStr(item, "Data", "data");
  const data = normalizeDate(dataStr);
  // Horário: tentar Hora, Horario, HorarioInicio e DataHora (ISO); site oficial pode usar fonte com horário correto
  const horaRaw =
    getStr(item, "Hora", "hora", "Horario", "horario", "HorarioInicio", "horarioInicio") ||
    getStr(item, "DataHora", "dataHora");
  const hora = normalizeTime(horaRaw);
  const local = getStr(item, "Local", "local") || "A definir";
  const tema = getStr(item, "Tema", "tema") || "Geral";
  const status = getStr(item, "Status", "status") || "agendada";
  const chaveApi =
    getStr(item, "Chave", "chave") ||
    (getNum(item, "Chave", "chave") != null ? String(getNum(item, "Chave", "chave")) : "");
  const comissao =
    getStr(
      item,
      "Comissao",
      "comissao",
      "Comite",
      "comite",
      "Orgao",
      "orgao",
      "ComissaoResponsavel",
      "comissaoResponsavel",
      "NomeComissao",
      "nomeComissao",
      "OrgaoResponsavel",
      "orgaoResponsavel",
    ) || null;
  const dataNorm = data || new Date().toISOString().slice(0, 10);
  const horaNorm = hora ? (hora.length <= 5 ? `${hora}:00` : hora) : null;
  const splegisChave =
    chaveApi || syntheticKey(titulo, dataNorm, horaNorm ?? "00:00:00", local);
  const vagas = getNum(item, "VagasDisponiveis", "vagasDisponiveis");
  const inscricoesAbertas = getBool(item, "InscricoesAbertas", "inscricoesAbertas");

  // Projetos[0]: ementa, referência (PL x/y) e autores para projeto_referencia / projeto_autores
  const projetos = (item["Projetos"] ?? item["projetos"]) as Array<{
    Ementa?: string;
    ementa?: string;
    Sigla?: string;
    Numero?: number;
    Ano?: number;
    Autores?: Array<{ Nome?: string; nome?: string }>;
  }> | undefined;
  const primeiroProjeto = Array.isArray(projetos) && projetos.length > 0 ? projetos[0] : null;
  const ementaProjeto =
    primeiroProjeto ? (primeiroProjeto.Ementa ?? primeiroProjeto.ementa ?? "").trim() : "";
  const sigla = primeiroProjeto ? String(primeiroProjeto.Sigla ?? "").trim() : "";
  const numeroProj = primeiroProjeto && (primeiroProjeto.Numero ?? 0) !== 0 ? Number(primeiroProjeto.Numero) : null;
  const anoProj = primeiroProjeto && (primeiroProjeto.Ano ?? 0) !== 0 ? Number(primeiroProjeto.Ano) : null;
  const projetoRef =
    sigla && numeroProj != null && anoProj != null ? `${sigla} ${numeroProj}/${anoProj}` : null;
  const autoresArr = primeiroProjeto?.Autores ?? (primeiroProjeto as Record<string, unknown>)?.autores;
  const projetoAutores =
    Array.isArray(autoresArr) && autoresArr.length > 0
      ? autoresArr
          .map((a: { Nome?: string; nome?: string }) => (a.Nome ?? a.nome ?? "").trim())
          .filter(Boolean)
          .join(" - ")
      : null;
  const temaStr = getStr(item, "Tema", "tema");
  const temaEhRotuloCurto = !temaStr || temaStr.length < 25 || /^geral$/i.test(temaStr.trim());
  const comissoesDesc = getDescricaoFromComissoes(item);
  let descricao =
    (ementaProjeto.length > 20 ? ementaProjeto : null) ||
    getStr(item, "Descricao", "descricao", "Objetivo", "objetivo") ||
    (temaEhRotuloCurto ? getStr(item, "Colabore", "colabore", "Texto", "texto") || comissoesDesc : null) ||
    getStr(item, "Tema", "tema") ||
    (temaEhRotuloCurto ? comissoesDesc : null) ||
    (temaEhRotuloCurto ? null : getStr(item, "Colabore", "colabore", "Texto", "texto")) ||
    null;
  // Padrão do site oficial quando tema é "Geral" e a API não envia descrição
  if (!descricao?.trim() && (/^geral$/i.test((tema || "").trim()) || !(tema || "").trim())) {
    descricao = "Audiência pública sobre Geral. Participe e contribua com sua opinião.";
  }

  return {
    splegis_chave: splegisChave,
    titulo,
    descricao: descricao || null,
    data: dataNorm,
    hora: horaNorm,
    local,
    tema,
    status,
    comissao,
    observacao:
      getStr(item, "Observacao", "observacao") ||
      extrairObservacao(getStr(item, "Colabore", "colabore")) ||
      extrairObservacao(getStr(item, "FormInscricoes", "formInscricoes")) ||
      (dataNorm >= new Date().toISOString().slice(0, 10) ? observacaoPadraoSiteOficial(dataNorm) : null) ||
      null,
    mais_informacoes: getStr(item, "Contato", "contato") || null,
    vagas_disponiveis: vagas,
    inscricoes_abertas: inscricoesAbertas ?? true,
    link_transmissao: getStr(item, "LinkTeleconferencia", "linkTeleconferencia") || null,
    projeto_referencia: projetoRef || null,
    projeto_autores: projetoAutores || null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const replace = url.searchParams.get("replace") === "1" || url.searchParams.get("replace") === "true";
    // Período padrão: desde 2008 até fim do próximo ano (cobertura completa)
    const now = new Date();
    const defaultStart = "2008-01-01";
    const defaultEnd = `${now.getFullYear() + 1}-12-31`;
    const dataInicial = url.searchParams.get("dataInicial") || defaultStart;
    const dataFinal = url.searchParams.get("dataFinal") || defaultEnd;

    console.log("[fetch-audiencias] Fetching from SPLEGIS...", { dataInicial, dataFinal, replace });

    const items = await fetchAudienciasFromSplegis(dataInicial, dataFinal);
    console.log("[fetch-audiencias] SPLEGIS returned", items.length, "items");

    // Log estrutura do primeiro item para debug (comissão e outros campos)
    if (items.length > 0) {
      const first = items[0] as Record<string, unknown>;
      const keys = Object.keys(first);
      console.log("[fetch-audiencias] First item keys:", keys.join(", "));
      const comissaoLike = keys.filter((k) => /comissao|comite|orgao|comiss/i.test(k));
      if (comissaoLike.length > 0) {
        comissaoLike.forEach((k) => console.log("[fetch-audiencias] Sample", k, "=", first[k]));
      } else {
        console.log("[fetch-audiencias] No comissao/comite/orgao-like key in first item; sample titulo/descricao:", first["Titulo"] ?? first["titulo"], (first["Descricao"] ?? first["descricao"])?.toString().slice(0, 80));
      }
      // Descrição e Observação: amostra Colabore/Contato/FormInscricoes para debug
      const colabore = (first["Colabore"] ?? first["colabore"])?.toString?.();
      const contato = (first["Contato"] ?? first["contato"])?.toString?.();
      const formInscricoes = (first["FormInscricoes"] ?? first["formInscricoes"])?.toString?.();
      if (colabore) {
        console.log("[fetch-audiencias] Colabore (first 500 chars):", colabore.slice(0, 500));
        const obs = extrairObservacao(colabore);
        console.log("[fetch-audiencias] extrairObservacao(Colabore) result:", obs ? obs.slice(0, 80) + "..." : "(null)");
      }
      if (contato) console.log("[fetch-audiencias] Contato sample:", contato.slice(0, 120));
      if (formInscricoes) console.log("[fetch-audiencias] FormInscricoes (first 300):", formInscricoes.slice(0, 300));
      // Para audiências "Geral": onde está a descrição (PL, lei, etc.) na API?
      const comissoes = first["Comissoes"] ?? first["comissoes"];
      const tipo = (first["Tipo"] ?? first["tipo"])?.toString?.();
      const numero = (first["Numero"] ?? first["numero"])?.toString?.();
      console.log("[fetch-audiencias] Comissoes type:", comissoes == null ? "null" : typeof comissoes, Array.isArray(comissoes) ? "length=" + (comissoes as unknown[]).length : "");
      if (comissoes != null) {
        const sample = typeof comissoes === "string" ? comissoes.slice(0, 400) : JSON.stringify(comissoes).slice(0, 400);
        console.log("[fetch-audiencias] Comissoes sample:", sample);
      }
      if (tipo || numero) console.log("[fetch-audiencias] Tipo:", tipo, "Numero:", numero);
    }

    // Chave para casar audiências (mesma data, hora, local, comissão) — usado para propagar detalhe
    function matchKey(it: SplegisAudienciaItem): string {
      const d = normalizeDate(getStr(it, "Data", "data"));
      const hRaw = getStr(it, "Hora", "hora", "Horario", "horario", "HorarioInicio", "horarioInicio");
      const h = hRaw ? (hRaw.length <= 5 ? hRaw + ":00" : hRaw).slice(0, 8) : "";
      const loc = getStr(it, "Local", "local").trim();
      const com = getStr(it, "Comissao", "comissao", "NomeComissao", "nomeComissao").trim();
      return [d, h, loc, com].join("|");
    }

    // Enriquecer por chave: primeiro itens com tema Geral/curto, depois qualquer um com Chave
    const comChave = items
      .map((item) => ({ item, chave: getNum(item, "Chave", "chave") ?? getStr(item, "Chave", "chave") }))
      .filter((x) => x.chave !== null && x.chave !== undefined && String(x.chave).trim() !== "");
    const needEnrich = [...comChave]
      .sort((a, b) => {
        const temaA = getStr(a.item, "Tema", "tema");
        const temaB = getStr(b.item, "Tema", "tema");
        const preferA = !temaA || temaA === "Geral" || temaA.length < 30 ? 1 : 0;
        const preferB = !temaB || temaB === "Geral" || temaB.length < 30 ? 1 : 0;
        return preferB - preferA;
      })
      .slice(0, MAX_ENRICH_BY_CHAVE)
      .map((x) => ({ item: x.item }));
    const detailByChave = new Map<string, SplegisAudienciaItem>();
    const detailByMatchKey = new Map<string, SplegisAudienciaItem>();
    let enriched = 0;
    let firstDetailLogged = false;
    for (const { item } of needEnrich) {
      const chave = getNum(item, "Chave", "chave") ?? getStr(item, "Chave", "chave");
      const detail = await fetchAudienciaPorChave(chave);
      if (detail) {
        if (!firstDetailLogged) {
          const keys = Object.keys(detail as object);
          console.log("[fetch-audiencias] Detail por chave keys:", keys.join(", "));
          const desc = getStr(detail, "Descricao", "descricao");
          const colab = getStr(detail, "Colabore", "colabore");
          const obs = getStr(detail, "Observacao", "observacao");
          console.log("[fetch-audiencias] Detail sample Descricao length:", desc?.length ?? 0, "Colabore length:", colab?.length ?? 0, "Observacao length:", obs?.length ?? 0);
          firstDetailLogged = true;
        }
        detailByChave.set(String(chave), detail);
        detailByMatchKey.set(matchKey(item), detail);
        const desc = getStr(detail, "Descricao", "descricao");
        const temaDetail = getStr(detail, "Tema", "tema");
        const colabore = getStr(detail, "Colabore", "colabore");
        const contato = getStr(detail, "Contato", "contato");
        const observacao = getStr(detail, "Observacao", "observacao");
        const obj = item as Record<string, unknown>;
        if (desc) { obj["Descricao"] = desc; obj["descricao"] = desc; enriched++; }
        if (temaDetail) { obj["Tema"] = temaDetail; obj["tema"] = temaDetail; }
        if (colabore) { obj["Colabore"] = colabore; obj["colabore"] = colabore; }
        if (contato) { obj["Contato"] = contato; obj["contato"] = contato; }
        if (observacao) { obj["Observacao"] = observacao; obj["observacao"] = observacao; }
      }
    }
    if (needEnrich.length > 0) console.log("[fetch-audiencias] Enriched by chave:", enriched, "of", needEnrich.length);

    // Propagar detalhe para itens SEM Chave que tenham mesma data/hora/local/comissão de um item enriquecido (mesma audiência no site)
    let propagated = 0;
    for (const item of items) {
      const chave = getNum(item, "Chave", "chave") ?? getStr(item, "Chave", "chave");
      if (chave !== null && chave !== undefined && String(chave).trim() !== "") continue;
      const key = matchKey(item);
      const detail = detailByMatchKey.get(key);
      if (detail) {
        const obj = item as Record<string, unknown>;
        const desc = getStr(detail, "Descricao", "descricao");
        const temaDetail = getStr(detail, "Tema", "tema");
        const colabore = getStr(detail, "Colabore", "colabore");
        const contato = getStr(detail, "Contato", "contato");
        const observacao = getStr(detail, "Observacao", "observacao");
        if (desc) { obj["Descricao"] = desc; obj["descricao"] = desc; }
        if (temaDetail) { obj["Tema"] = temaDetail; obj["tema"] = temaDetail; }
        if (colabore) { obj["Colabore"] = colabore; obj["colabore"] = colabore; }
        if (contato) { obj["Contato"] = contato; obj["contato"] = contato; }
        if (observacao) { obj["Observacao"] = observacao; obj["observacao"] = observacao; }
        propagated++;
      }
    }
    if (propagated > 0) console.log("[fetch-audiencias] Detail propagated to items without Chave:", propagated);

    // Descrição igual ao site oficial: buscar ementa via ProjetoResumoJSON. Priorizar itens com tema "Geral" ou sem descrição (os que hoje mostram "Geral. Participe...").
    const projetoRefs = items
      .map((item) => ({ item, ref: parseProjetoRef(item) }))
      .filter((x): x is { item: SplegisAudienciaItem; ref: { tipo: string; ano: number; numero: number } } => x.ref != null)
      .sort((a, b) => {
        const temaA = getStr(a.item, "Tema", "tema");
        const temaB = getStr(b.item, "Tema", "tema");
        const descA = getStr(a.item, "Descricao", "descricao");
        const descB = getStr(b.item, "Descricao", "descricao");
        const precisaA = !temaA || temaA === "Geral" || !descA || descA.length < 50 ? 1 : 0;
        const precisaB = !temaB || temaB === "Geral" || !descB || descB.length < 50 ? 1 : 0;
        return precisaB - precisaA;
      })
      .slice(0, MAX_PROJETO_RESUMO);
    let ementasAplicadas = 0;
    const projetoResumoCache = new Map<string, ProjetoResumoResponse | null>();
    for (const { item, ref } of projetoRefs) {
      const cacheKey = `${ref.tipo}-${ref.numero}-${ref.ano}`;
      let resumo = projetoResumoCache.get(cacheKey);
      if (resumo === undefined) {
        resumo = await fetchProjetoResumo(ref.ano, ref.tipo, ref.numero);
        projetoResumoCache.set(cacheKey, resumo);
      }
      if (resumo) {
        const ementa = (resumo.Ementa ?? resumo.ementa ?? "").trim();
        if (ementa.length > 20) {
          const obj = item as Record<string, unknown>;
          obj["Descricao"] = ementa;
          obj["descricao"] = ementa;
          ementasAplicadas++;
        }
      }
    }
    if (projetoRefs.length > 0) console.log("[fetch-audiencias] Descrição from ProjetoResumo (ementa):", ementasAplicadas, "of", projetoRefs.length);

    if (replace) {
      const { error: delError } = await supabase
        .from("audiencias")
        .delete()
        .not("splegis_chave", "is", null);
      if (delError) {
        console.warn("[fetch-audiencias] Delete existing SPLEGIS rows failed:", delError.message);
      }
    }

    const rowsRaw = items.map(mapToDbRow).filter((r) => (r.titulo as string) && (r.data as string));
    const byKey = new Map<string, Record<string, unknown>>();
    for (const r of rowsRaw) {
      const k = String(r.splegis_chave ?? "");
      byKey.set(k, r);
    }
    const rows = [...byKey.values()];

    const chavesUnicas = [...new Set(rows.map((r) => r.splegis_chave).filter(Boolean))] as string[];
    let jaExistiam = 0;
    if (chavesUnicas.length > 0) {
      const { data: existing } = await supabase
        .from("audiencias")
        .select("splegis_chave")
        .in("splegis_chave", chavesUnicas);
      jaExistiam = existing?.length ?? 0;
    }
    const BATCH = 80;
    let processed = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const { error: upsertErr } = await supabase
        .from("audiencias")
        .upsert(chunk, { onConflict: "splegis_chave" });
      if (upsertErr) {
        console.error("[fetch-audiencias] Upsert batch error:", upsertErr);
        throw new Error(`Falha ao gravar lote: ${upsertErr.message}`);
      }
      processed += chunk.length;
    }

    const atualizadas = jaExistiam;
    const inseridas = processed - jaExistiam;
    const result = {
      ok: true,
      source: "splegis",
      totalFromApi: items.length,
      processed,
      inserted: inseridas,
      updated: atualizadas,
      message: `Sincronizadas: ${inseridas} novas, ${atualizadas} atualizadas (${processed} no total, período ${dataInicial} a ${dataFinal}).`,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[fetch-audiencias]", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao sincronizar audiências",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
