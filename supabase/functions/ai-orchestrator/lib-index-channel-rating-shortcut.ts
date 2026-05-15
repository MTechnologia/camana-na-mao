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
    const reply =
      `⭐ **Muito obrigado pela avaliação!** Você registrou **${stars} estrela${stars > 1 ? "s" : ""}** (${starDisplay}) para o atendimento no Câmara na Mão. Seu feedback nos ajuda a evoluir.\n\nTenha um ótimo dia!`;
    console.log("[ai-orchestrator] Channel rating recorded:", stars);
    return { response: createSseResponse(reply, corsHeaders) };
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
