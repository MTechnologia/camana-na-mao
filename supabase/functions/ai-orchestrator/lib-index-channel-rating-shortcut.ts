import type { SupabaseClient } from "@supabase/supabase-js";

import {
  assistantOfferedChannelRating,
  buildThanksLine,
  chatIndicatesActiveGeneralJourney,
  chatIndicatesActiveServicesJourney,
  extractReportNatureFromChat,
  normalizeReportNature,
  parseChannelRatingFromUserMessage,
  userDeclinedChannelRating,
  userFarewellWithoutRating,
} from "./lib-conversation-closing.ts";
import { createSseResponse } from "./lib-index-sse.ts";
import { getContentText } from "./lib-index-bootstrap.ts";
import { fetchNearestUrbanReportsForSimilarity } from "./lib-location-and-similarity.ts";

/** Raio (m) para sugerir relatos urbanos semelhantes "na região". Alinhado ao Perto de você. */
const SIMILAR_URBAN_RADIUS_METERS = 500;
const REPORT_CREATED_RE = /\[REPORT_CREATED:([0-9a-f-]{36})\]/i;

/**
 * Após a avaliação do canal, se a conversa registrou um RELATO URBANO, monta o convite para
 * apoiar relatos semelhantes na região (raio 500 m). Retorna null quando não há relato urbano
 * na conversa, sem coordenada/categoria, ou quando não há semelhantes no raio. Movido para cá
 * para NÃO interromper a jornada do relato (antes aparecia entre a coleta e as fotos).
 */
async function buildUrbanSimilarSupportBlock(
  supabase: SupabaseClient,
  chatMessages: Array<Record<string, unknown>>,
  userId: string,
): Promise<string | null> {
  let reportId: string | null = null;
  for (let i = chatMessages.length - 1; i >= 0; i--) {
    const match = REPORT_CREATED_RE.exec(getContentText(chatMessages[i].content));
    if (match) {
      reportId = match[1];
      break;
    }
  }
  if (!reportId) return null;

  const { data: report, error } = await supabase
    .from("urban_reports")
    .select("category, latitude, longitude")
    .eq("id", reportId)
    .maybeSingle();
  if (error || !report) return null;

  const category = String(report.category || "");
  const lat = report.latitude != null ? Number(report.latitude) : null;
  const lon = report.longitude != null ? Number(report.longitude) : null;
  if (
    !category || category === "feedback_camara" ||
    lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)
  ) {
    return null;
  }

  const near = await fetchNearestUrbanReportsForSimilarity(
    supabase,
    lat,
    lon,
    category,
    userId,
    10,
    SIMILAR_URBAN_RADIUS_METERS,
  );
  if (near.length === 0) return null;

  const payload = { reports: near, center: { lat, lon } };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const intro =
    "Relato cadastrado com sucesso! Quer apoiar **relatos semelhantes na sua região**?";
  return `${intro}\n\n[SIMILAR_URBAN_REPORTS_B64:${b64}]`;
}

type ChannelRatingShortcutArgs = {
  chatMessages?: Array<Record<string, unknown>>;
  conversationId?: string;
  corsHeaders: Record<string, string>;
  lastAssistantText: string;
  lastUserTextEarly: string;
  supabase: SupabaseClient;
  userId: string;
};

type ChannelRatingShortcutResult = {
  response?: Response;
};

export async function handleChannelRatingShortcut(
  args: ChannelRatingShortcutArgs,
): Promise<ChannelRatingShortcutResult> {
  const {
    chatMessages = [],
    conversationId,
    corsHeaders,
    lastAssistantText,
    lastUserTextEarly,
    supabase,
    userId,
  } = args;

  if (!assistantOfferedChannelRating(lastAssistantText)) {
    return {};
  }

  const stars = parseChannelRatingFromUserMessage(lastUserTextEarly);
  if (stars != null) {
    if (conversationId) {
      try {
        await supabase
          .from("ai_conversations")
          .update({
            context: JSON.stringify({
              channel_rating: stars,
              channel_rating_at: new Date().toISOString(),
            }),
          })
          .eq("id", conversationId)
          .eq("user_id", userId);
      } catch (error) {
        console.warn("[ai-orchestrator] Failed to persist channel_rating:", error);
      }
    }

    const starDisplay = "★".repeat(stars) + "☆".repeat(5 - stars);
    const ratingAck =
      `⭐ **Muito obrigado pela avaliação!** Você registrou **${stars} estrela${stars > 1 ? "s" : ""}** (${starDisplay}) para o atendimento no Câmara na Mão. Seu feedback nos ajuda a evoluir.`;

    // Ao final do relato urbano (após a avaliação do canal), convida a apoiar relatos
    // semelhantes na região — sem interromper a jornada do relato.
    const similarSupport = await buildUrbanSimilarSupportBlock(supabase, chatMessages, userId);
    if (similarSupport) {
      console.log("[ai-orchestrator] Channel rating recorded + offering nearby similar urban reports:", stars);
      return { response: createSseResponse(`${ratingAck}\n\n${similarSupport}`, corsHeaders) };
    }

    console.log("[ai-orchestrator] Channel rating recorded:", stars);
    return { response: createSseResponse(`${ratingAck}\n\nTenha um ótimo dia!`, corsHeaders) };
  }

  if (userDeclinedChannelRating(lastUserTextEarly) || userFarewellWithoutRating(lastUserTextEarly)) {
    const nature = normalizeReportNature(extractReportNatureFromChat(chatMessages));
    const thanks = buildThanksLine(nature) ??
      (chatIndicatesActiveServicesJourney(chatMessages)
        ? "Foi um prazer ajudar na busca de **serviços perto de você**."
        : chatIndicatesActiveGeneralJourney(chatMessages)
        ? "Fico feliz em ter ajudado com informações sobre a **Câmara Municipal**."
        : null);
    const reply = thanks
      ? `${thanks}\n\nTenha um ótimo dia! Se precisar de mais alguma coisa sobre a cidade ou a Câmara, é só chamar.`
      : "De nada! Fico feliz em ter ajudado. Se precisar de mais alguma coisa sobre a cidade ou a Câmara, é só chamar. Tenha um ótimo dia!";
    console.log("[ai-orchestrator] User closed conversation after channel rating offer");
    return { response: createSseResponse(reply, corsHeaders) };
  }

  return {};
}
