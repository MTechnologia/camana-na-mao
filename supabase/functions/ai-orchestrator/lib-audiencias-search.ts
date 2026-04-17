import { type SupabaseClient } from "@supabase/supabase-js";

function audienciasTemaFilter<B>(base: B, tema: string): B {
  const t = tema.trim().replace(/%/g, "");
  if (!t) return base;
  return (base as B & { or: (filters: string) => B }).or(`tema.ilike.%${t}%,titulo.ilike.%${t}%`);
}

const ZONAS_KEYWORDS: { zona: string; keywords: string[] }[] = [
  { zona: "Zona Norte", keywords: ["tucuruvi", "jaçanã", "santana", "vila maria", "vila guilherme", "casa verde", "limão", "brasilândia", "freguesia do ó", "perus", "pirituba", "vila leopoldina"] },
  { zona: "Zona Sul", keywords: ["ipiranga", "jabaquara", "santo amaro", "cidade ademar", "socorro", "cursino", "saúde", "vila mariana", "campo belo"] },
  { zona: "Zona Leste", keywords: ["mooca", "tatuapé", "vila carmosina", "vila formosa", "penha", "cangaíba", "são mateus", "itaquera", "guaianases", "vila prudente"] },
  { zona: "Zona Oeste", keywords: ["lapa", "pinheiros", "butantã", "jaguaré", "rio pequeno", "raposo tavares", "vila sônia", "morumbi", "barra funda"] },
  { zona: "Centro", keywords: ["sé", "república", "bela vista", "bom retiro", "cambuci", "consolação", "liberdade", "santa cecília", "prestes maia", "auditório", "câmara municipal", "centro", "vila buarque", "aclimação", "higienópolis"] },
];

export function localParaZona(local: string | null | undefined): string {
  const text = (local || "").toLowerCase().trim();
  if (!text) return "Centro";
  for (const { zona, keywords } of ZONAS_KEYWORDS) {
    if (keywords.some((keyword) => text.includes(keyword))) return zona;
  }
  return "Centro";
}

function filterByRegiao<T extends { local?: string | null }>(rows: T[], regiao: string): T[] {
  if (!regiao?.trim()) return rows;
  const r = regiao.trim();
  return rows.filter((row) => localParaZona(row.local) === r);
}

const AUDIENCIA_STATUS_AGENDADA = ["agendada", "scheduled"];

export function formatAudienciaStatus(status: string) {
  if (status && AUDIENCIA_STATUS_AGENDADA.includes(String(status).toLowerCase())) return "📅 Agendada";
  if (status === "ongoing" || status === "em andamento") return "🔴 Em andamento";
  return "✅ Encerrada";
}

function truncateDescricaoForContext(descricao: string | null | undefined, maxLen: number = 380): string {
  if (!descricao || !descricao.trim()) return "";
  const oneLine = descricao.trim().replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen)}…`;
}

function formatDatePtBr(iso: string | null | undefined): string {
  if (!iso) return "";
  const value = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatConvidadosBlock(convidados: string | null | undefined): string {
  if (!convidados || !convidados.trim()) return "";
  let text = convidados.replace(/\s+/g, " ").trim();
  text = text.replace(/^Foram\s+convidados?\s+para\s+a\s+Audi[eê]ncia\s+P[úu]blica:\s*/i, "");
  const segmentos = text.split(/\s*;\s*/).map((segmento) => segmento.trim()).filter(Boolean);
  if (!segmentos.length) return "";
  const br = "  \n";
  const EN_DASH = "\u2013";
  const linhas = segmentos.map((segmento) => {
    const idx = segmento.indexOf(" - ");
    if (idx >= 0) {
      const nome = segmento.slice(0, idx).trim();
      const cargo = segmento.slice(idx + 3).trim();
      return `   - ${nome}${br}   ${EN_DASH} ${cargo}`;
    }
    return `   - ${segmento}`;
  });
  return `\n\n   **Foram convidados para a Audiência Pública:**${br}${linhas.join(br)}`;
}

function formatDocumentosLine(_a: { projeto_referencia?: string | null; link_transmissao?: string | null; mais_informacoes?: string | null }): string {
  return "";
}

function formatAudienciaLine(
  audiencia: { titulo: string; tema: string; comissao?: string | null; data: string; hora?: string | null; local?: string | null; status?: string },
  index: number,
  statusText: string,
  inscricao: string,
  ctxBlock: string,
  docsBlock: string,
): string {
  const br = "  \n";
  const nomeDaAudiencia = (audiencia.comissao && audiencia.comissao.trim())
    ? audiencia.comissao.trim()
    : (audiencia.tema && audiencia.tema.trim())
    ? audiencia.tema.trim()
    : (audiencia.titulo && audiencia.titulo.trim())
    ? audiencia.titulo.trim()
    : "Audiência";
  const dataLabel = formatDatePtBr(audiencia.data || "");
  const dataHora = `📅 ${dataLabel}${audiencia.hora ? ` às ${audiencia.hora.slice(0, 5)}` : ""}`;
  const localLine = audiencia.local ? `${br}   **Local:** ${audiencia.local}` : "";
  const inscricaoTrim = inscricao.trim();
  const statusInscricao = inscricaoTrim ? `${br}   ${statusText}${br}   ${inscricaoTrim}` : `${br}   ${statusText}`;
  return `${index + 1}. **Audiência pública:** ${nomeDaAudiencia}\n\n   ${audiencia.tema}\n\n   ${dataHora}${localLine}${statusInscricao}${ctxBlock}${docsBlock}`;
}

export async function searchAudiencias(
  supabase: SupabaseClient,
  tema?: string,
  status?: string,
  inscricoesAbertas?: boolean,
  dataInicio?: string,
  dataFim?: string,
  regiao?: string,
): Promise<string> {
  const temaNorm = tema?.trim();
  const today = new Date().toISOString().split("T")[0];
  const dataMin = dataInicio?.trim() || today;
  let dataMax = dataFim?.trim() || null;
  if (dataMin && !dataMax && /^\d{4}-\d{2}-\d{2}$/.test(dataMin)) {
    dataMax = `${dataMin.slice(0, 4)}-12-31`;
  }
  const regiaoNorm = regiao?.trim() || null;
  const limitBase = regiaoNorm ? 20 : 5;
  const hasExplicitDateRange = !!(dataInicio?.trim() || dataFim?.trim());

  const applyDateFilters = <Q extends { gte: (column: string, value: string) => Q; lte: (column: string, value: string) => Q }>(q: Q): Q => {
    let out = q.gte("data", dataMin);
    if (dataMax) out = out.lte("data", dataMax);
    return out;
  };

  if (hasExplicitDateRange) {
    let rangeQ = supabase
      .from("audiencias")
      .select("titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, convidados, projeto_referencia, link_transmissao, mais_informacoes")
      .gte("data", dataMin)
      .order("data", { ascending: false })
      .limit(regiaoNorm ? 40 : 15);
    if (dataMax) rangeQ = rangeQ.lte("data", dataMax);
    if (temaNorm) rangeQ = audienciasTemaFilter(rangeQ, temaNorm);
    const { data: rawRange } = await rangeQ;
    const inRange = filterByRegiao(rawRange || [], regiaoNorm).slice(0, 10);
    if (inRange?.length) {
      const formatted = inRange.map((audiencia: Record<string, unknown>, index: number) => {
        const statusText = formatAudienciaStatus(String(audiencia.status ?? ""));
        const inscricao = audiencia.inscricoes_abertas ? " 🎫 Inscrições abertas" : "";
        const ctx = truncateDescricaoForContext(String(audiencia.descricao ?? ""));
        const convidadosBlock = formatConvidadosBlock((audiencia as { convidados?: string | null }).convidados);
        const ctxBlock = ctx
          ? `\n\n   **Explicação simplificada do que será discutido:**\n\n   ${ctx}${convidadosBlock}`
          : convidadosBlock;
        const row = audiencia as Parameters<typeof formatAudienciaLine>[0] & Parameters<typeof formatDocumentosLine>[0];
        const docsBlock = formatDocumentosLine(row);
        return formatAudienciaLine(row, index, statusText, inscricao, ctxBlock, docsBlock);
      }).join("\n\n");
      const periodo = dataMax ? `de ${formatDatePtBr(dataMin)} a ${formatDatePtBr(dataMax)}` : `a partir de ${formatDatePtBr(dataMin)}`;
      const intro = temaNorm
        ? `Audiências sobre **${temaNorm}** no período (${periodo}):\n\n`
        : `Audiências no período (${periodo}) — agendadas e realizadas:\n\n`;
      return `${intro}${formatted}\n\nQuer saber mais sobre alguma ou inscrever-se?`;
    }
    if (temaNorm) {
      const currentYear = new Date().getFullYear();
      const yearBeforeLastStart = `${currentYear - 2}-01-01`;
      const startOfCurrentYear = `${currentYear}-01-01`;
      const histQ = supabase
        .from("audiencias")
        .select("titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, projeto_referencia, link_transmissao, mais_informacoes")
        .gte("data", yearBeforeLastStart)
        .lt("data", startOfCurrentYear)
        .order("data", { ascending: false })
        .limit(regiaoNorm ? 20 : 10);
      const histWithTema = audienciasTemaFilter(histQ, temaNorm);
      const { data: rawUltimas } = await histWithTema;
      const ultimas5 = filterByRegiao(rawUltimas || [], regiaoNorm).slice(0, 5);
      const temaLabel = temaNorm.charAt(0).toUpperCase() + temaNorm.slice(1).toLowerCase();
      let message = `Este ano ainda não foram realizadas audiências públicas com este tema (**${temaLabel}**).\n\n`;
      if (ultimas5?.length) {
        const formatted = ultimas5.map((audiencia: Record<string, unknown>, index: number) => {
          const statusText = formatAudienciaStatus(String(audiencia.status ?? ""));
          const ctx = truncateDescricaoForContext(String(audiencia.descricao ?? ""));
          const convidadosBlock = formatConvidadosBlock((audiencia as { convidados?: string | null }).convidados);
          const ctxBlock = ctx
            ? `\n\n   **Explicação simplificada do que foi discutido:**\n\n   ${ctx}${convidadosBlock}`
            : convidadosBlock;
          const row = audiencia as Parameters<typeof formatAudienciaLine>[0] & Parameters<typeof formatDocumentosLine>[0];
          const docsBlock = formatDocumentosLine(row);
          return formatAudienciaLine(row, index, statusText, "", ctxBlock, docsBlock);
        }).join("\n\n");
        message += `Segue abaixo as últimas audiências realizadas para este tema:\n\n${formatted}`;
      } else {
        message += "Não há audiências realizadas no histórico para este tema.";
      }
      message += "\n\nQuer buscar outras audiências ou outro tema?";
      return message;
    }
  }

  if (!temaNorm) {
    let query = supabase
      .from("audiencias")
      .select("titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, convidados, projeto_referencia, link_transmissao, mais_informacoes")
      .in("status", AUDIENCIA_STATUS_AGENDADA)
      .order("data", { ascending: true })
      .limit(limitBase);
    query = applyDateFilters(query);
    const { data: rawProximas } = await query;
    const proximas = filterByRegiao(rawProximas || [], regiaoNorm).slice(0, 5);

    if (proximas?.length) {
      const formatted = proximas.map((audiencia: Record<string, unknown>, index: number) => {
        const statusText = formatAudienciaStatus(String(audiencia.status ?? ""));
        const inscricao = audiencia.inscricoes_abertas ? " 🎫 Inscrições abertas" : "";
        const ctx = truncateDescricaoForContext(String(audiencia.descricao ?? ""));
        const convidadosBlock = formatConvidadosBlock((audiencia as { convidados?: string | null }).convidados);
        const ctxBlock = ctx
          ? `\n\n   **Explicação simplificada do que será discutido:**\n\n   ${ctx}${convidadosBlock}`
          : convidadosBlock;
        const row = audiencia as Parameters<typeof formatAudienciaLine>[0] & Parameters<typeof formatDocumentosLine>[0];
        const docsBlock = formatDocumentosLine(row);
        return formatAudienciaLine(row, index, statusText, inscricao, ctxBlock, docsBlock);
      }).join("\n\n---\n\n");
      const filtros = [
        regiaoNorm && `região ${regiaoNorm}`,
        dataInicio && (dataFim ? `de ${formatDatePtBr(dataMin)} a ${formatDatePtBr(dataMax!)}` : `a partir de ${formatDatePtBr(dataMin)}`),
      ].filter(Boolean);
      const intro = filtros.length ? `Próximas audiências (${filtros.join(", ")}):\n\n` : "Próximas audiências públicas agendadas:\n\n";
      return `${intro}${formatted}\n\nQuer saber mais sobre alguma ou inscrever-se?`;
    }

    const { data: ultimas } = await supabase
      .from("audiencias")
      .select("titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, convidados, projeto_referencia, link_transmissao, mais_informacoes")
      .lte("data", today)
      .order("data", { ascending: false })
      .limit(1);
    const ultima = filterByRegiao(ultimas || [], regiaoNorm)[0] as Record<string, unknown> | undefined;
    if (ultima) {
      const statusText = formatAudienciaStatus(String(ultima.status ?? ""));
      const ctx = truncateDescricaoForContext(String(ultima.descricao ?? ""));
      const convidadosBlock = formatConvidadosBlock((ultima as { convidados?: string | null }).convidados);
      const ctxBlock = ctx ? `\n\n   **Resumo do que foi discutido:**\n\n   ${ctx}${convidadosBlock}` : convidadosBlock;
      const row = ultima as Parameters<typeof formatAudienciaLine>[0] & Parameters<typeof formatDocumentosLine>[0];
      const docsBlock = formatDocumentosLine(row);
      const line = formatAudienciaLine(row, 0, statusText, "", ctxBlock, docsBlock);
      return `Não há audiências públicas futuras agendadas no momento.\n\nA última audiência pública foi:\n\n${line}\n\nPosso buscar outras audiências por tema, período ou região, se você quiser.`;
    }
  }

  let query = supabase
    .from("audiencias")
    .select("titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, convidados, projeto_referencia, link_transmissao, mais_informacoes")
    .in("status", AUDIENCIA_STATUS_AGENDADA)
    .order("data", { ascending: true })
    .limit(limitBase);
  query = applyDateFilters(query);
  if (temaNorm) query = audienciasTemaFilter(query, temaNorm);
  if (status) query = query.eq("status", status);
  if (inscricoesAbertas) query = query.eq("inscricoes_abertas", true);

  const { data: rawData, error } = await query;
  const data = filterByRegiao(rawData || [], regiaoNorm).slice(0, 5);

  if (!error && data?.length) {
    return data.map((audiencia: Record<string, unknown>, index: number) => {
      const statusText = formatAudienciaStatus(String(audiencia.status ?? ""));
      const inscricao = audiencia.inscricoes_abertas ? ` 🎫 Inscrições abertas (${audiencia.vagas_disponiveis || "?"} vagas)` : "";
      const ctx = truncateDescricaoForContext(String(audiencia.descricao ?? ""));
      const convidadosBlock = formatConvidadosBlock((audiencia as { convidados?: string | null }).convidados);
      const ctxBlock = ctx
        ? `\n\n   **Explicação simplificada do que será discutido:**\n\n   ${ctx}${convidadosBlock}`
        : convidadosBlock;
      const row = audiencia as Parameters<typeof formatAudienciaLine>[0] & Parameters<typeof formatDocumentosLine>[0];
      const docsBlock = formatDocumentosLine(row);
      return formatAudienciaLine(row, index, statusText, inscricao, ctxBlock, docsBlock);
    }).join("\n\n");
  }

  if (temaNorm) {
    let histQuery = supabase
      .from("audiencias")
      .select("titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, projeto_referencia, link_transmissao, mais_informacoes")
      .order("data", { ascending: false })
      .limit(regiaoNorm ? 30 : 10);
    if (dataMin) histQuery = histQuery.gte("data", dataMin);
    if (dataMax) histQuery = histQuery.lte("data", dataMax);
    histQuery = audienciasTemaFilter(histQuery, temaNorm);
    const { data: rawHist } = await histQuery;
    const historico = filterByRegiao(rawHist || [], regiaoNorm).slice(0, 10);
    if (historico?.length) {
      const formatted = historico.map((audiencia: Record<string, unknown>, index: number) => {
        const statusText = formatAudienciaStatus(String(audiencia.status ?? ""));
        const inscricao = audiencia.inscricoes_abertas ? " 🎫 Inscrições abertas" : "";
        const ctx = truncateDescricaoForContext(String(audiencia.descricao ?? ""));
        const convidadosBlock = formatConvidadosBlock((audiencia as { convidados?: string | null }).convidados);
        const ctxBlock = ctx
          ? `\n\n   **Explicação simplificada do que será discutido:**\n\n   ${ctx}${convidadosBlock}`
          : convidadosBlock;
        const row = audiencia as Parameters<typeof formatAudienciaLine>[0] & Parameters<typeof formatDocumentosLine>[0];
        const docsBlock = formatDocumentosLine(row);
        return formatAudienciaLine(row, index, statusText, inscricao, ctxBlock, docsBlock);
      }).join("\n\n");
      return `Audiências sobre **${temaNorm}** (histórico e agendadas):\n\n${formatted}\n\nQuer saber sobre outro tema ou inscrever-se em alguma?`;
    }
  }

  let fallbackQ = supabase
    .from("audiencias")
    .select("titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, projeto_referencia, link_transmissao, mais_informacoes")
    .in("status", AUDIENCIA_STATUS_AGENDADA)
    .order("data", { ascending: true })
    .limit(limitBase);
  fallbackQ = applyDateFilters(fallbackQ);
  const { data: rawUpcoming } = await fallbackQ;
  const upcoming = filterByRegiao(rawUpcoming || [], regiaoNorm).slice(0, 5);

  if (upcoming?.length) {
    const formattedUpcoming = upcoming.map((audiencia: Record<string, unknown>, index: number) => {
      const statusText = formatAudienciaStatus(String(audiencia.status ?? ""));
      const inscricao = audiencia.inscricoes_abertas ? " 🎫 Inscrições abertas" : "";
      const ctx = truncateDescricaoForContext(String(audiencia.descricao ?? ""));
      const ctxBlock = ctx ? `\n\n   **Explicação simplificada do que será discutido:**\n\n   ${ctx}` : "";
      const row = audiencia as Parameters<typeof formatAudienciaLine>[0] & Parameters<typeof formatDocumentosLine>[0];
      const docsBlock = formatDocumentosLine(row);
      return formatAudienciaLine(row, index, statusText, inscricao, ctxBlock, docsBlock);
    }).join("\n\n");
    const temaText = temaNorm ? `sobre "${temaNorm}"` : "com esses critérios";
    return `Não encontrei audiências ${temaText} no momento, mas aqui estão as próximas agendadas:\n\n${formattedUpcoming}\n\nQuer que eu te avise quando houver audiências sobre ${temaNorm || "seu tema de interesse"}?`;
  }

  const { data: allAudiencias } = await supabase
    .from("audiencias")
    .select("tema")
    .limit(100);

  const availableThemes = [...new Set((allAudiencias || []).map((audiencia: Record<string, unknown>) => audiencia.tema).filter(Boolean))].slice(0, 8);

  if (availableThemes.length > 0) {
    return `Não há audiências ${temaNorm ? `sobre "${temaNorm}"` : "agendadas"} no momento.\n\nTemas com histórico de audiências:\n${availableThemes.map((theme) => `• ${theme}`).join("\n")}\n\nQuer saber mais sobre algum desses? (Ao escolher, mostro as audiências desse tema, inclusive do histórico.)`;
  }

  return "Não há audiências agendadas no momento. Você pode acompanhar a agenda em cmsp.sp.gov.br/agenda";
}
