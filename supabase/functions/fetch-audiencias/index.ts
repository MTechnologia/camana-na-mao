import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPLEGIS_BASE = "https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx";

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
  Local?: string;
  local?: string;
  Tema?: string;
  tema?: string;
  Status?: string;
  status?: string;
  VagasDisponiveis?: number;
  vagasDisponiveis?: number;
  InscricoesAbertas?: boolean;
  inscricoesAbertas?: boolean;
  [key: string]: unknown;
}

function getStr(item: SplegisAudienciaItem, ...keys: string[]): string {
  for (const k of keys) {
    const v = item[k];
    if (v != null && typeof v === "string") return v.trim();
  }
  return "";
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

/** Normaliza hora para HH:MM ou HH:MM:SS. Retorna "" quando não conseguir extrair horário (evita default 09:00). */
function normalizeTime(s: string): string {
  if (!s || typeof s !== "string") return "";
  const trimmed = s.trim();
  // HH:MM ou HH:MM:SS
  let match = trimmed.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const h = match[1].padStart(2, "0");
    const m = match[2];
    const sec = match[3] || "00";
    return `${h}:${m}:${sec}`;
  }
  // HHhMM ou HHh
  match = trimmed.match(/(\d{1,2})h(\d{2})?/i);
  if (match) {
    const h = match[1].padStart(2, "0");
    const m = (match[2] ?? "00").padStart(2, "0");
    return `${h}:${m}:00`;
  }
  // Data/hora ISO (extrair só o tempo)
  const isoMatch = trimmed.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (isoMatch) {
    const h = isoMatch[1].padStart(2, "0");
    const m = isoMatch[2];
    const sec = isoMatch[3] || "00";
    return `${h}:${m}:${sec}`;
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

function mapToDbRow(item: SplegisAudienciaItem): Record<string, unknown> {
  const titulo = getStr(item, "Titulo", "titulo") || "Audiência pública";
  const data = normalizeDate(getStr(item, "Data", "data"));
  const horaRaw = getStr(item, "Hora", "hora", "Horario", "horario");
  const hora = normalizeTime(horaRaw);
  const local = getStr(item, "Local", "local") || "A definir";
  const tema = getStr(item, "Tema", "tema") || "Geral";
  const status = getStr(item, "Status", "status") || "agendada";
  const chaveApi = getStr(item, "Chave", "chave");
  const dataNorm = data || new Date().toISOString().slice(0, 10);
  const horaNorm = hora ? (hora.length <= 5 ? `${hora}:00` : hora) : null;
  const splegisChave =
    chaveApi || syntheticKey(titulo, dataNorm, horaNorm ?? "00:00:00", local);
  const vagas = getNum(item, "VagasDisponiveis", "vagasDisponiveis");
  const inscricoesAbertas = getBool(item, "InscricoesAbertas", "inscricoesAbertas");

  return {
    splegis_chave: splegisChave,
    titulo,
    descricao: getStr(item, "Descricao", "descricao") || null,
    data: dataNorm,
    hora: horaNorm,
    local,
    tema,
    status,
    vagas_disponiveis: vagas,
    inscricoes_abertas: inscricoesAbertas ?? true,
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
