import type { SupabaseClient } from "@supabase/supabase-js";

export function isCamaraFuncionamentoInternoQuery(contextText: string): boolean {
  const ctx = contextText.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const estruturaOuApresentacao =
    /(estrutura|funcionamento|apresentacao)\s+(da\s+)?camara|conhec(er|a)\s+(a\s+)?camara|como\s+(a\s+)?camara\s+e\s+organizada|como\s+funciona\s+(a\s+)?camara|o\s+que\s+e\s+(a\s+)?camara\s+municipal/.test(ctx);
  const orgaosOuProcesso =
    /mesa\s+diretora|secretaria\s+da\s+mesa|procuradoria|regimento\s+interno|regimento|tramitacao|tramitar|sessao\s+plenaria|sessoes\s+plenarias|processo\s+legislativo|poder\s+legislativo|legislativo\s+municipal|comissoes?\s+(da\s+)?camara|comissoes?\s+permanentes|comissoes?\s+tecnicas|atribuicoes\s+das\s+comissoes/.test(ctx);
  const mentionsChamber = /camara\s+municipal|\bcamara\b|vereador|vereadores|plen|comiss/.test(ctx);
  const funcionamentoInterno = /funcionamento\s+interno/.test(ctx);
  return estruturaOuApresentacao || funcionamentoInterno || (mentionsChamber && orgaosOuProcesso);
}

function sanitizeKbIlikeTerm(term: string): string {
  return term.replace(/%/g, "").replace(/_/g, "").trim();
}

const URBAN_DUVIDA_KB_STOPWORDS = new Set([
  "gostaria", "saber", "como", "feito", "feita", "para", "cidade", "paulo", "sao", "uma", "uns",
  "umas", "dos", "das", "que", "ser", "esta", "este", "sobre", "minha", "quero", "onde", "quando",
  "qual", "quais", "isso", "essa", "esse", "com", "sem", "nos", "nas", "mais", "muito", "bem",
  "pode", "sendo", "tenho", "teria", "fazer", "feito", "tipo", "meu", "minha", "seu", "sua",
  "deve", "seria", "foram", "foram", "isso", "aqui", "ali", "la", "lá", "voce", "você",
]);

function normalizeKbMatchText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** Termos substantivos da pergunta (sem boost genérico da Câmara). */
export function extractUrbanDuvidaSearchTerms(query: string): string[] {
  const normalized = normalizeKbMatchText(query);
  const words = normalized
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  return [...new Set(
    words
      .map(sanitizeKbIlikeTerm)
      .filter((w) => w.length > 3 && !URBAN_DUVIDA_KB_STOPWORDS.has(w)),
  )].slice(0, 6);
}

export function isUrbanDuvidaKbResultRelevant(
  query: string,
  docs: Array<{ title?: unknown; content?: unknown }>,
): boolean {
  const terms = extractUrbanDuvidaSearchTerms(query)
    .sort((a, b) => b.length - a.length);
  const primaryTerms = terms.filter((t) => t.length >= 5).slice(0, 5);
  if (primaryTerms.length === 0) return false;

  const requiredMatches = primaryTerms.length >= 2 ? 2 : 1;

  for (const doc of docs) {
    const text = normalizeKbMatchText(`${doc.title ?? ""} ${doc.content ?? ""}`);
    const hits = primaryTerms.filter((t) => text.includes(t));
    if (hits.length >= requiredMatches) return true;
  }
  return false;
}

export type UrbanDuvidaKbSearchResult = {
  text: string;
  hasRelevantHits: boolean;
};

/** Busca KB focada na pergunta do cidadão (fluxo dúvida urbana), sem boost institucional. */
export async function searchKnowledgeBaseForUrbanDuvida(
  supabase: SupabaseClient,
  query: string,
): Promise<UrbanDuvidaKbSearchResult> {
  const searchTerms = extractUrbanDuvidaSearchTerms(query);
  if (searchTerms.length === 0) {
    return { text: "", hasRelevantHits: false };
  }

  const orClause = searchTerms
    .flatMap((term) => [`content.ilike.%${term}%`, `title.ilike.%${term}%`])
    .join(",");

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("content, content_type, title")
    .or(orClause)
    .limit(6);

  const hitCount = data?.length ?? 0;
  console.log("[searchKnowledgeBaseForUrbanDuvida]", JSON.stringify({
    querySnippet: query.slice(0, 120),
    termCount: searchTerms.length,
    hits: hitCount,
    dbError: !!error,
  }));

  if (error || !data?.length) {
    return { text: "", hasRelevantHits: false };
  }

  if (!isUrbanDuvidaKbResultRelevant(query, data)) {
    console.log("[searchKnowledgeBaseForUrbanDuvida] hits_not_relevant", JSON.stringify({
      querySnippet: query.slice(0, 120),
    }));
    return { text: "", hasRelevantHits: false };
  }

  const SNIPPET_LEN = 600;
  const text = data.map((doc: Record<string, unknown>, i: number) => {
    const source = doc.content_type === "noticia" ? "Notícia"
      : doc.content_type === "audiencia" ? "Audiência"
      : "Info";
    const body = `${doc.content ?? ""}`.trim();
    const showMore = body.length > SNIPPET_LEN;
    const snippet = showMore ? `${body.slice(0, SNIPPET_LEN)}...` : body;
    return `[${i + 1}] ${String(doc.title ?? "") || source}: ${snippet}`;
  }).join("\n\n");

  return { text, hasRelevantHits: true };
}

export async function searchKnowledgeBase(supabase: SupabaseClient, query: string): Promise<string> {
  let searchTerms = query
    .toLowerCase()
    .split(/\s+/)
    .map(sanitizeKbIlikeTerm)
    .filter((t) => t.length > 2)
    .slice(0, 5);

  const zoneamentoBoost = ["zoneamento", "lpuos", "construir", "construído", "imóvel", "imovel", "siszon", "geosampa"];
  const q = query.toLowerCase();
  if (zoneamentoBoost.some((k) => q.includes(k))) {
    const extra = ["zoneamento", "lpuos", "geosampa", "siszon"].map(sanitizeKbIlikeTerm).filter((t) => t.length > 2);
    searchTerms = [...new Set([...searchTerms, ...extra])].slice(0, 6);
  }

  const camaraKbBoost = ["mesa", "plenário", "plenario", "comissões", "comissoes", "regimento", "tramitação", "tramitacao", "legislativo", "câmara", "camara", "vereador", "secretaria", "procuradoria", "estrutura", "funcionamento"];
  if (isCamaraFuncionamentoInternoQuery(query) || camaraKbBoost.some((k) => q.includes(k))) {
    const extra = ["mesa", "plenário", "comissões", "regimento", "tramitação", "vereador", "legislativo", "câmara"]
      .map(sanitizeKbIlikeTerm)
      .filter((t) => t.length > 2);
    searchTerms = [...new Set([...searchTerms, ...extra])].slice(0, 8);
  }

  if (searchTerms.length === 0) {
    return "Posso te ajudar com informações sobre a Câmara Municipal, audiências públicas, vereadores e serviços da cidade. O que você gostaria de saber?";
  }

  const orClause = searchTerms
    .flatMap((term) => [`content.ilike.%${term}%`, `title.ilike.%${term}%`])
    .join(",");

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("content, content_type, title")
    .or(orClause)
    .limit(6);

  const hitCount = data?.length ?? 0;
  console.log("[searchKnowledgeBase]", JSON.stringify({
    querySnippet: query.slice(0, 120),
    termCount: searchTerms.length,
    hits: hitCount,
    dbError: !!error,
  }));

  if (error || !data?.length) {
    console.log("[searchKnowledgeBase] empty_or_error", JSON.stringify({ reason: error ? "db_error" : "no_rows", querySnippet: query.slice(0, 120) }));
    const suggestions = [
      "• Como funciona a Câmara Municipal",
      "• Próximas audiências públicas",
      "• Informações sobre vereadores",
      "• Serviços públicos na cidade",
    ];
    return `Não encontrei informações específicas sobre "${query}", mas posso te ajudar com:\n\n${suggestions.join("\n")}\n\n📌 Ou você pode visitar cmsp.sp.gov.br para mais detalhes.`;
  }

  const SNIPPET_LEN = 600;
  return data.map((doc: Record<string, unknown>, i: number) => {
    const source = doc.content_type === "noticia" ? "Notícia"
      : doc.content_type === "audiencia" ? "Audiência"
      : "Info";
    const text = `${doc.content ?? ""}`.trim();
    const showMore = text.length > SNIPPET_LEN;
    const snippet = showMore ? `${text.slice(0, SNIPPET_LEN)}...` : text;
    return `[${i + 1}] ${String(doc.title ?? "") || source}: ${snippet}`;
  }).join("\n\n");
}

type OccupancyServiceDisplay = {
  name: string;
  address?: string | null;
  district?: string | null;
};

function formatOccupancySummaryFromRpcResult(selected: OccupancyServiceDisplay, occRows: unknown): string {
  const row = Array.isArray(occRows) ? occRows[0] : null;
  const usersCount = Math.max(0, Number((row as { users_count?: unknown })?.users_count || 0));
  const lastPingAt = row && typeof (row as { last_ping_at?: unknown }).last_ping_at === "string"
    ? String((row as { last_ping_at: string }).last_ping_at)
    : null;
  const MIN_SAMPLE = 3;

  let movementLabel = "Movimentação baixa";
  let coverageLabel = "Cobertura baixa";
  if (usersCount >= 20) {
    movementLabel = "Movimentação alta";
    coverageLabel = "Cobertura alta";
  } else if (usersCount >= 8) {
    movementLabel = "Movimentação média";
    coverageLabel = "Cobertura média";
  }

  const header = `📍 **${selected.name}**${selected.district ? ` (${selected.district})` : ""}`;
  const address = selected.address ? `\nEndereço: ${selected.address}` : "";
  const baseLine = "\nFonte: Visitas detectadas no app (sinais de presença agregados).";
  const lastPingLine = lastPingAt ? `\nÚltimo ping: ${new Date(lastPingAt).toLocaleString("pt-BR")}.` : "";
  const transparencyLine = "\nIndicador estimado com base em interações de usuários do app (não é medição oficial da Prefeitura).";

  if (usersCount < MIN_SAMPLE) {
    return `${header}${address}\n\n**Dados insuficientes** para estimar a movimentação agora (base abaixo da amostra mínima).${baseLine}${lastPingLine}${transparencyLine}`;
  }

  return `${header}${address}\n\n${movementLabel} nas últimas 2h.\n${coverageLabel}.\nBase: ${usersCount} pessoa${usersCount === 1 ? "" : "s"} com sinais recentes no app.${baseLine}${lastPingLine}${transparencyLine}`;
}

export async function getServiceOccupancyStatusByServiceId(
  supabase: SupabaseClient,
  serviceId: string,
): Promise<string> {
  const idTrim = String(serviceId || "").trim();
  if (!/^[a-f0-9-]{36}$/i.test(idTrim)) {
    return "Identificador do serviço inválido.";
  }
  const { data: svc, error } = await supabase
    .from("public_services")
    .select("id, name, address, district")
    .eq("id", idTrim)
    .maybeSingle();
  if (error || !svc) {
    return "Não encontrei esse equipamento na base. Tente novamente ou escolha outro na lista.";
  }
  const selected: OccupancyServiceDisplay = {
    name: String(svc.name),
    address: (svc as { address?: string | null }).address ?? null,
    district: (svc as { district?: string | null }).district ?? null,
  };
  const { data: occRows, error: occError } = await supabase.rpc("get_equipment_occupancy_summary_for_service", {
    p_service_id: idTrim,
    p_window_minutes: 120,
  });
  if (occError) {
    console.warn("[getServiceOccupancyStatusByServiceId] occupancy rpc error:", occError.message);
    return `Encontrei **${selected.name}**, mas não consegui consultar a ocupação neste momento.`;
  }
  return formatOccupancySummaryFromRpcResult(selected, occRows);
}

export async function getServiceOccupancyStatusByName(
  supabase: SupabaseClient,
  serviceName: string,
  district?: string,
): Promise<string> {
  const nameTrim = String(serviceName || "").trim();
  const districtTrim = String(district || "").trim();
  if (nameTrim.length < 3) {
    return 'Me diga o nome do equipamento com mais detalhe (ex.: "CEU Butantã" ou "UBS Vila Mariana").';
  }

  const cleanedName = nameTrim
    .replace(/\?/g, " ")
    .replace(/\b(como\s+est[aá]|est[aá]\s+chei[oa]|t[aá]\s+chei[oa]|lota[cç][aã]o|ocupa[cç][aã]o|agora)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lookupTerm = cleanedName.length >= 3 ? cleanedName : nameTrim;

  const inferServiceTypeForPicker = (text: string): string | null => {
    const t = text.toLowerCase();
    if (/\bubs\b|posto de sa[úu]de/.test(t)) return "ubs";
    if (/\bhospital\b/.test(t)) return "hospital";
    if (/\bescola\b|emef|emei|etec/.test(t)) return "school";
    if (/\bceu\b/.test(t)) return "ceu";
    if (/\bbiblioteca\b/.test(t)) return "library";
    if (/centro esportivo|esportivo/.test(t)) return "sports_center";
    return null;
  };
  const inferDistrictForPicker = (text: string): string | null => {
    const t = text
      .replace(/\b(ubs|hospital|escola|ceu|biblioteca|posto de sa[úu]de|centro esportivo)\b/gi, " ")
      .replace(/\b(como|est[aá]|agora|ocup[aã]?[cç][aã]o|lota[cç][aã]o|movimenta[cç][aã]o)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return t.length >= 3 ? t : null;
  };
  const pickerType = inferServiceTypeForPicker(lookupTerm);
  const pickerDistrict = districtTrim || inferDistrictForPicker(lookupTerm) || "";
  const pickerMarker = `[SERVICE_PICKER${pickerDistrict ? `:district=${encodeURIComponent(pickerDistrict)}` : ""}${pickerType ? `:type=${pickerType}` : ""}]`;

  let { data: services, error: serviceError } = await supabase
    .from("public_services")
    .select("id, name")
    .ilike("name", `%${lookupTerm}%`)
    .limit(8);
  if (serviceError) {
    console.warn("[getServiceOccupancyStatusByName] service lookup error (table):", serviceError.message);
    const { data: rpcData, error: rpcError } = await supabase.rpc("search_public_services_fulltext", {
      min_lat: null,
      max_lat: null,
      min_lng: null,
      max_lng: null,
      center_lat: null,
      center_lng: null,
      radius_meters: null,
      search_query: lookupTerm,
      service_types: null,
      result_limit: 8,
    });
    if (rpcError) {
      console.warn("[getServiceOccupancyStatusByName] service lookup error (rpc):", rpcError.message);
      return "Não consegui consultar a ocupação agora. Tente novamente em instantes.";
    }
    services = (Array.isArray(rpcData) ? rpcData : [])
      .map((r: Record<string, unknown>) => ({ id: String(r.id || ""), name: String(r.name || "") }))
      .filter((r) => r.id && r.name);
  }
  if (!services?.length) {
    return `[OCCUPANCY_SERVICE_PICK][FIELD_REQUEST:service_name]Não encontrei exatamente esse equipamento${districtTrim ? ` em ${districtTrim}` : ""}. Selecione na lista abaixo (ou refine por nome/bairro).\n${pickerMarker}`;
  }

  const detailsById = new Map<string, { address?: string | null; district?: string | null }>();
  const ids = services.map((s) => s.id).filter(Boolean);
  if (ids.length > 0) {
    const { data: detailsRows } = await supabase
      .from("public_services")
      .select("id, address, district")
      .in("id", ids);
    for (const row of (detailsRows || [])) {
      detailsById.set(String(row.id), {
        address: (row as { address?: string | null }).address ?? null,
        district: (row as { district?: string | null }).district ?? null,
      });
    }
  }

  const ranked = services
    .map((s) => {
      const d = detailsById.get(String(s.id));
      const scoreNameExact = s.name?.toLowerCase?.() === lookupTerm.toLowerCase() ? 4 : 0;
      const scoreNameIncludes = s.name?.toLowerCase?.().includes(lookupTerm.toLowerCase()) ? 2 : 0;
      const scoreDistrict = districtTrim && d?.district?.toLowerCase?.().includes(districtTrim.toLowerCase()) ? 3 : 0;
      return { ...s, address: d?.address ?? null, district: d?.district ?? null, _score: scoreNameExact + scoreNameIncludes + scoreDistrict };
    })
    .sort((a, b) => b._score - a._score);

  if (ranked.length > 1 && ranked[0]?._score === ranked[1]?._score) {
    return `[OCCUPANCY_SERVICE_PICK][FIELD_REQUEST:service_name]Encontrei mais de um equipamento parecido. Selecione na lista abaixo para eu consultar a ocupação correta.\n${pickerMarker}`;
  }

  const selected = ranked[0];
  const { data: occRows, error: occError } = await supabase.rpc("get_equipment_occupancy_summary_for_service", {
    p_service_id: selected.id,
    p_window_minutes: 120,
  });

  if (occError) {
    console.warn("[getServiceOccupancyStatusByName] occupancy rpc error:", occError.message);
    return `Encontrei **${selected.name}**, mas não consegui consultar a ocupação neste momento.`;
  }

  return formatOccupancySummaryFromRpcResult(selected, occRows);
}

export async function getUltimasNoticias(supabase: SupabaseClient, limit = 5): Promise<string> {
  const { data: rows, error } = await supabase
    .from("news_cache")
    .select("id, title, description, link, pub_date")
    .order("pub_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[getUltimasNoticias] Erro ao ler news_cache:", error.message);
    return "";
  }
  if (!rows?.length) return "";

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return iso?.slice(0, 10) || "";
    }
  };

  const lines = rows.map((r: { id: string; title: string; description: string; link: string; pub_date: string }, i: number) => {
    const title = (r.title || "").trim();
    const desc = (r.description || "").trim().slice(0, 200);
    const date = formatDate(r.pub_date || "");
    return `${i + 1}. **${title}**\n   ${desc}${desc.length >= 200 ? "..." : ""}\n   Data: ${date} | Link: ${r.link || ""}`;
  });
  return "[Últimas notícias da Câmara (use este bloco para listar as 5 últimas no chat)]\n\n" + lines.join("\n\n");
}

export async function suggestCouncilMember(issueType: string, _description: string, _district?: string): Promise<string> {
  const baseUrl = typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_URL") : undefined;
  const anonKey = typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_ANON_KEY") : undefined;

  if (baseUrl && anonKey) {
    try {
      const res = await fetch(`${baseUrl}/functions/v1/fetch-vereadores`, {
        headers: { Authorization: `Bearer ${anonKey}` },
      });
      if (res.ok) {
        const json = await res.json() as { vereadores?: Array<{ name: string; party: string; isSubstitute?: boolean; isOnLeave?: boolean }> };
        const vereadores = json.vereadores ?? [];
        const active = vereadores.filter((v) => !v.isSubstitute && !v.isOnLeave);
        const top = active.slice(0, 5).map((v) => `${v.name} (${v.party})`);
        if (top.length > 0) {
          return `Para questões de ${issueType}, você pode procurar:\n\n${top.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\nDeseja que eu encaminhe sua demanda para algum deles?`;
        }
      }
    } catch (e) {
      console.warn("[suggestCouncilMember] fetch-vereadores failed:", (e as Error).message);
    }
  }

  return "No momento não consegui carregar a lista atualizada de vereadores. Você pode ver a lista completa em [Vereadores](/institucional/vereadores), onde constam apenas os parlamentares em exercício. Posso ajudar com mais alguma coisa?";
}

export async function getCitizenHistory(
  supabase: SupabaseClient,
  userId: string,
  historyType: string = "all",
  statusFilter: string = "all",
  limit: number = 5,
): Promise<string> {
  const results: string[] = [];

  if (historyType === "all" || historyType === "urban_reports") {
    let query = supabase
      .from("urban_reports")
      .select("id, protocol_code, category, subcategory, status, created_at, location_address, street, neighborhood")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (!error && data?.length) {
      results.push("📍 **Relatos Urbanos:**");
      data.forEach((r: Record<string, unknown>, i: number) => {
        const statusEmoji = r.status === "pending" ? "⏳" : r.status === "in_progress" ? "🔄" : r.status === "resolved" ? "✅" : "❌";
        const location = r.street ? `${r.street}, ${r.neighborhood}` : r.location_address || "Local não informado";
        const proto = r.protocol_code ? `**${r.protocol_code}** — ` : "";
        results.push(`${i + 1}. ${proto}${r.subcategory || r.category} - ${location}\n   ${statusEmoji} ${r.status} | ${new Date(String(r.created_at ?? "")).toLocaleDateString("pt-BR")}`);
      });
    }
  }

  if (historyType === "all" || historyType === "transport_reports") {
    let query = supabase
      .from("transport_reports")
      .select("id, report_type, status, created_at, line_code_custom, location")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (!error && data?.length) {
      if (results.length) results.push("");
      results.push("🚌 **Relatos de Transporte:**");
      data.forEach((r: Record<string, unknown>, i: number) => {
        const statusEmoji = r.status === "pending" ? "⏳" : r.status === "in_progress" ? "🔄" : r.status === "resolved" ? "✅" : "❌";
        const proto = r.protocol_code ? `**${r.protocol_code}** — ` : "";
        results.push(`${i + 1}. ${proto}${r.report_type} ${r.line_code_custom ? `- Linha ${r.line_code_custom}` : ""}\n   ${statusEmoji} ${r.status} | ${new Date(String(r.created_at ?? "")).toLocaleDateString("pt-BR")}`);
      });
    }
  }

  if (historyType === "all" || historyType === "ratings") {
    const { data, error } = await supabase
      .from("service_ratings")
      .select("id, rating_stars, rating_text, created_at, service:public_services(name, service_type)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data?.length) {
      if (results.length) results.push("");
      results.push("⭐ **Avaliações de Serviços:**");
      data.forEach((r: Record<string, unknown>, i: number) => {
        const n = Number(r.rating_stars);
        const starCount = Number.isFinite(n) ? Math.max(0, Math.min(5, Math.floor(n))) : 0;
        const stars = "⭐".repeat(starCount);
        const service = r.service as { name?: string } | null | undefined;
        const serviceName = service?.name || "Serviço";
        results.push(`${i + 1}. ${serviceName} - ${stars}\n   ${new Date(String(r.created_at ?? "")).toLocaleDateString("pt-BR")}`);
      });
    }
  }

  if (historyType === "all" || historyType === "audiencias") {
    const { data: inscricoesData, error: errInsc } = await supabase
      .from("audiencia_inscricoes")
      .select("id, status, created_at, audiencia:audiencias(titulo, data, status)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!errInsc && inscricoesData?.length) {
      if (results.length) results.push("");
      results.push("🎫 **Inscrições para lembretes de audiências:**");
      inscricoesData.forEach((r: Record<string, unknown>, i: number) => {
        const audiencia = r.audiencia as { titulo?: string; data?: string; status?: string } | null | undefined;
        const statusEmoji = audiencia?.status === "finished" ? "✅" : "📅";
        results.push(`${i + 1}. ${audiencia?.titulo || "Audiência"}\n   ${statusEmoji} ${audiencia?.data || ""}`);
      });
    }

    const { data: participacoesData, error: errPart } = await supabase
      .from("audiencia_participacoes")
      .select("id, tipo, created_at, audiencia:audiencias(titulo, data, status)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!errPart && participacoesData?.length) {
      if (results.length) results.push("");
      results.push("🎤 **Inscrições para participar (videoconferência/escrito):**");
      participacoesData.forEach((r: Record<string, unknown>, i: number) => {
        const audiencia = r.audiencia as { titulo?: string; data?: string; status?: string } | null | undefined;
        const tipoLabel = r.tipo === "videoconferencia" ? "Videoconferência" : r.tipo === "escrito" ? "Manifestação escrita" : String(r.tipo || "");
        const statusEmoji = audiencia?.status === "finished" ? "✅" : "📅";
        results.push(`${i + 1}. ${audiencia?.titulo || "Audiência"} (${tipoLabel})\n   ${statusEmoji} ${audiencia?.data || ""} | ${new Date(String(r.created_at ?? "")).toLocaleDateString("pt-BR")}`);
      });
    }
  }

  if (historyType === "all" || historyType === "referrals") {
    const { data, error } = await supabase
      .from("council_member_referrals")
      .select("id, council_member_name, council_member_party, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data?.length) {
      if (results.length) results.push("");
      results.push("📨 **Encaminhamentos a Vereadores:**");
      data.forEach((r: Record<string, unknown>, i: number) => {
        const statusEmoji = r.status === "pending" ? "⏳" : r.status === "sent" ? "📤" : r.status === "acknowledged" ? "👀" : "✅";
        results.push(`${i + 1}. ${r.council_member_name} (${r.council_member_party})\n   ${statusEmoji} ${r.status} | ${new Date(String(r.created_at ?? "")).toLocaleDateString("pt-BR")}`);
      });
    }
  }

  if (results.length === 0) {
    return "Você ainda não tem registros no sistema. Posso ajudar a fazer um relato ou avaliação?";
  }

  return results.join("\n");
}
