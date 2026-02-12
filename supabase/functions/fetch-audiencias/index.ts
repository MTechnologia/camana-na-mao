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

/** Normaliza data para YYYY-MM-DD */
function normalizeDate(s: string): string {
  if (!s || typeof s !== "string") return "";
  const trimmed = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normaliza hora para HH:MM ou HH:MM:SS */
function normalizeTime(s: string): string {
  if (!s || typeof s !== "string") return "09:00";
  const trimmed = s.trim();
  const match = trimmed.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const h = match[1].padStart(2, "0");
    const m = match[2];
    const sec = match[3] || "00";
    return `${h}:${m}:${sec}`;
  }
  return "09:00:00";
}

/**
 * Chama AudienciasPublicasV2JSON ou AudienciasPublicasJSON no ws2.asmx.
 * Parâmetros comuns: DataInicial, DataFinal (formato YYYY-MM-DD ou DD/MM/YYYY).
 */
async function fetchAudienciasFromSplegis(
  dataInicial: string,
  dataFinal: string
): Promise<SplegisAudienciaItem[]> {
  const url = `${SPLEGIS_BASE}/AudienciasPublicasV2JSON`;
  const body = JSON.stringify({
    DataInicial: dataInicial,
    DataFinal: dataFinal,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
      "User-Agent": "CamaraNaMao/1.0",
    },
    body,
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
  const hora = normalizeTime(getStr(item, "Hora", "hora"));
  const local = getStr(item, "Local", "local") || "A definir";
  const tema = getStr(item, "Tema", "tema") || "Geral";
  const status = getStr(item, "Status", "status") || "agendada";
  const chave = getStr(item, "Chave", "chave");
  const vagas = getNum(item, "VagasDisponiveis", "vagasDisponiveis");
  const inscricoesAbertas = getBool(item, "InscricoesAbertas", "inscricoesAbertas");

  return {
    splegis_chave: chave || null,
    titulo,
    descricao: getStr(item, "Descricao", "descricao") || null,
    data: data || new Date().toISOString().slice(0, 10),
    hora: hora.length <= 5 ? `${hora}:00` : hora,
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
    const dataInicial = url.searchParams.get("dataInicial") || "2020-01-01";
    const dataFinal = url.searchParams.get("dataFinal") || "2030-12-31";

    console.log("[fetch-audiencias] Fetching from SPLEGIS...", { dataInicial, dataFinal, replace });

    const items = await fetchAudienciasFromSplegis(dataInicial, dataFinal);
    console.log("[fetch-audiencias] SPLEGIS returned", items.length, "items");

    if (replace) {
      const { error: delError } = await supabase
        .from("audiencias")
        .delete()
        .not("splegis_chave", "is", null);
      if (delError) {
        console.warn("[fetch-audiencias] Delete existing SPLEGIS rows failed (column may not exist yet):", delError.message);
      }
    }

    const rows = items.map(mapToDbRow).filter((r) => (r.titulo as string) && (r.data as string));
    let inserted = 0;
    let updated = 0;

    for (const row of rows) {
      const splegisChave = row.splegis_chave as string | null;
      if (splegisChave) {
        const { data: existing } = await supabase
          .from("audiencias")
          .select("id")
          .eq("splegis_chave", splegisChave)
          .maybeSingle();

        const payload = { ...row };
        delete (payload as any).splegis_chave;
        if (existing?.id) {
          const { error: upErr } = await supabase
            .from("audiencias")
            .update(payload)
            .eq("id", existing.id);
          if (!upErr) updated++;
        } else {
          const { error: insErr } = await supabase
            .from("audiencias")
            .insert({ ...payload, splegis_chave: splegisChave });
          if (!insErr) inserted++;
        }
      } else {
        const payload = { ...row };
        delete (payload as any).splegis_chave;
        const { error: insErr } = await supabase.from("audiencias").insert(payload);
        if (!insErr) inserted++;
      }
    }

    const result = {
      ok: true,
      source: "splegis",
      totalFromApi: items.length,
      inserted,
      updated,
      message: `Sincronizadas: ${inserted} inseridas, ${updated} atualizadas.`,
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
