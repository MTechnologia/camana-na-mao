import type { SupabaseClient } from "@supabase/supabase-js";

import { createSseResponse } from "./lib-index-sse.ts";
import { getContentText } from "./lib-index-bootstrap.ts";

type CouncilShortcutArgs = {
  chatMessages: Array<Record<string, unknown>>;
  corsHeaders: Record<string, string>;
  lastAssistantContent: unknown;
  lastAssistantText: string;
  lastAssistantTextEarly: string;
  lastUserTextEarly: string;
  supabase: SupabaseClient;
  userId: string;
  lib: typeof import("./lib.ts");
};

type CouncilShortcutResult = {
  response?: Response;
};

function buildCouncilIssueType(categoryLabel: string): string {
  const categoryToIssueType: Record<string, string> = {
    via_publica: "urbanismo",
    "via pública": "urbanismo",
    pavimentacao: "urbanismo",
    pavimentação: "urbanismo",
    iluminacao: "urbanismo",
    iluminação: "urbanismo",
    calcada: "urbanismo",
    calçada: "urbanismo",
    sinalizacao: "urbanismo",
    sinalização: "urbanismo",
    drenagem: "urbanismo",
    lixo: "urbanismo",
    esgoto: "urbanismo",
    area_verde: "meio_ambiente",
    "área verde": "meio_ambiente",
    feedback_camara: "urbanismo",
    "feedback câmara": "urbanismo",
  };

  const catLower = categoryLabel.toLowerCase();
  for (const [key, value] of Object.entries(categoryToIssueType)) {
    if (catLower.includes(key)) return value;
  }
  return "urbanismo";
}

function extractDistrictFromAssistantContent(lastAssistantContent: unknown): string | undefined {
  const afterEndereco = getContentText(lastAssistantContent).split(/Endere[cç]o:\s*/i)[1];
  if (!afterEndereco) return undefined;

  const lines = afterEndereco
    .split(/\n/)
    .map((line: string) => line.replace(/^-\s*/, "").trim())
    .filter((line: string) =>
      line.length > 0 &&
      !/^\d{5}-?\d{3}$/.test(line.replace(/\s/g, "")) &&
      !/^CEP\s*/i.test(line)
    );

  return lines.length >= 2 ? lines[1] : undefined;
}

function extractLatestCreatedReportIds(
  chatMessages: Array<Record<string, unknown>>,
): { transportReportId: string | null; urbanReportId: string | null } {
  let urbanReportId: string | null = null;
  let transportReportId: string | null = null;

  for (let i = chatMessages.length - 1; i >= 0; i--) {
    const message = chatMessages[i];
    if (message.role !== "assistant") continue;

    const text = getContentText(message.content);
    const urbanMatch = text.match(/\[REPORT_CREATED:([0-9a-f-]{36})\]/);
    const transportMatch = text.match(/\[TRANSPORT_CREATED:([0-9a-f-]{36})\]/);

    if (urbanMatch) {
      urbanReportId = urbanMatch[1];
      break;
    }
    if (transportMatch) {
      transportReportId = transportMatch[1];
      break;
    }
  }

  return { transportReportId, urbanReportId };
}

export async function handleCouncilShortcuts(
  args: CouncilShortcutArgs,
): Promise<CouncilShortcutResult> {
  const {
    chatMessages,
    corsHeaders,
    lastAssistantContent,
    lastAssistantText,
    lastAssistantTextEarly,
    lastUserTextEarly,
    supabase,
    userId,
    lib,
  } = args;

  const botJustRegisteredReport =
    /relato(?:\s+de\s+transporte)?\s+registrado|(?:URB|REL|TRP)-20\d{2}-\d+/.test(lastAssistantTextEarly) ||
    /\[(?:REPORT|TRANSPORT)_CREATED:[0-9a-f-]{36}\]/i.test(lastAssistantText);
  const userAsksForwardToCouncil =
    /(encaminhar|enviar|mandar)\s+(meu\s+)?relato\s+para\s+(um\s+)?vereador|poderia\s+encaminhar\s+meu\s+relato|enviar\s+meu\s+relato\s+para\s+vereador/i
      .test(lastUserTextEarly);

  if (botJustRegisteredReport && userAsksForwardToCouncil && chatMessages.length >= 2) {
    const catMatch = getContentText(lastAssistantContent).match(/Categoria:\s*\*?\*?\s*([^\n]+)/i);
    const descMatch = getContentText(lastAssistantContent).match(/Descri[cç][aã]o:\s*\*?\*?\s*([^\n]+)/i);
    const descText = (descMatch?.[1] ?? "").trim() || "Problema urbano reportado";
    const categoryLabel = (catMatch?.[1] ?? "").trim();
    const district = extractDistrictFromAssistantContent(lastAssistantContent);

    try {
      const councilResult = await lib.suggestCouncilMember(
        buildCouncilIssueType(categoryLabel),
        descText,
        district,
      );
      const reply =
        `Claro! Seu relato já foi registrado. Para encaminhar a um vereador, seguem sugestões de parlamentares que podem ajudar com esse tipo de demanda:\n\n${councilResult}\n\nPosso ajudar com mais alguma coisa?`;
      console.log(
        "[ai-orchestrator] EARLY short-circuit: encaminhar relato para vereador (evita criar novo relato)",
      );
      return { response: createSseResponse(reply, corsHeaders) };
    } catch (error) {
      console.error("[ai-orchestrator] suggestCouncilMember failed in early short-circuit:", error);
    }
  }

  const botJustShowedCouncilList = /deseja que eu encaminhe sua demanda para algum deles\?/i.test(lastAssistantText);
  const selectionMatch = lastUserTextEarly.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (botJustShowedCouncilList && selectionMatch && chatMessages.length > 0) {
    const councilName = selectionMatch[1].trim();
    const councilParty = selectionMatch[2].trim();
    const { transportReportId, urbanReportId } = extractLatestCreatedReportIds(chatMessages);
    const councilId = councilName.toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "vereador";
    const referralRow: Record<string, unknown> = {
      user_id: userId,
      council_member_id: councilId,
      council_member_name: councilName,
      council_member_party: councilParty,
      status: "pending",
    };
    if (urbanReportId) referralRow.urban_report_id = urbanReportId;
    else if (transportReportId) referralRow.transport_report_id = transportReportId;

    if (urbanReportId || transportReportId) {
      const { error: refError } = await supabase.from("council_member_referrals").insert(referralRow);
      if (!refError) {
        const reply =
          `✅ **Encaminhamento registrado!** Seu relato foi encaminhado para **${councilName}** (${councilParty}). O gabinete poderá entrar em contato. Posso ajudar com mais alguma coisa?`;
        console.log("[ai-orchestrator] User selected council member: referral recorded (no new report)");
        return { response: createSseResponse(reply, corsHeaders) };
      }
    }
  }

  const inappropriatePatterns = [
    /\bqual\s+(o\s+)?vereador(\s+[ée]\s+o)?\s*mais\s+ladr[aã]o\b/i,
    /\bqual\s+vereador\s+[ée]\s+mais\s+ladr[aã]o\b/i,
    /\bqual\s+vereador\s+[ée]\s+ladr[aã]o\b/i,
    /\bquem\s+[ée]\s+o\s+(mais\s+)?(ladr[aã]o|corrupto|pior)\s+(vereador|deles)\b/i,
    /\b(vereador|vereadores)\s+(mais\s+)?(ladr[aã]o|corrupto)s?\b/i,
    /\b(mais\s+)?(ladr[aã]o|corrupto)\s+(vereador|dos\s+vereadores)\b/i,
    /\bpior\s+vereador\b/i,
    /\bvereador\s+(corrupto|ladr[aã]o|bandido|rouba|safado|desonesto)\b/i,
    /\b(qual|quem)\s+[ée]\s+o\s+vereador\s+(mais\s+)?(corrupto|ladr[aã]o)\b/i,
    /\bvereador(es)?\s+que\s+(rouba|roubam|s[aã]o\s+corruptos)\b/i,
    /\b(qual|quem)\s+vereador\s+(rouba|roubou|é\s+corrupto)\b/i,
  ];
  const inappropriateAboutVereador = inappropriatePatterns.some((pattern) => pattern.test(lastUserTextEarly));
  if (inappropriateAboutVereador) {
    const reply =
      "Não posso responder perguntas que envolvam ofensas ou acusações a pessoas. Posso ajudar com informações sobre vereadores da sua região, formas de participação na Câmara ou registro de problemas na cidade. Como posso ajudar?";
    console.log("[ai-orchestrator] Inappropriate question about vereador: redirecting politely");
    return { response: createSseResponse(reply, corsHeaders) };
  }

  return {};
}
