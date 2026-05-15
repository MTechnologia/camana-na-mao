import type { SupabaseClient } from "@supabase/supabase-js";

import { findCouncilMemberMatches } from "./lib-chamber-feedback.ts";
import {
  buildConversationClosingMessage,
  extractReportNatureFromChat,
} from "./lib-conversation-closing.ts";
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

type CouncilListOption = {
  index: number;
  councilName: string;
  councilParty: string;
};

function normalizeForCouncilMatch(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim();
}

export function parseCouncilOptionsFromAssistantText(assistantText: string): CouncilListOption[] {
  return [...assistantText.matchAll(/^\s*(\d+)\.\s+(.+?)\s*\(([^)]+)\)\s*$/gim)]
    .map((match) => ({
      index: parseInt(match[1], 10),
      councilName: match[2].trim(),
      councilParty: match[3].trim(),
    }))
    .filter((option) => Number.isFinite(option.index));
}

function matchCouncilOptionInUserText(
  userText: string,
  options: CouncilListOption[],
): { councilName: string; councilParty: string } | null {
  if (options.length === 0) return null;

  const userNorm = normalizeForCouncilMatch(userText);
  for (const option of options) {
    const nameNorm = normalizeForCouncilMatch(option.councilName);
    if (userNorm.includes(nameNorm)) {
      return { councilName: option.councilName, councilParty: option.councilParty };
    }
    const parts = nameNorm.split(" ").filter((part) => part.length >= 3);
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[parts.length - 1];
      if (userNorm.includes(first) && userNorm.includes(last)) {
        return { councilName: option.councilName, councilParty: option.councilParty };
      }
    }
    if (parts.length === 1 && userNorm.includes(parts[0])) {
      const sameFirst = options.filter((o) =>
        normalizeForCouncilMatch(o.councilName).split(" ").includes(parts[0])
      );
      if (sameFirst.length === 1) {
        return { councilName: sameFirst[0].councilName, councilParty: sameFirst[0].councilParty };
      }
    }
  }

  return null;
}

function extractCouncilNameFromNaturalLanguage(
  userText: string,
  options: CouncilListOption[],
): { councilName: string; councilParty: string } | null {
  const fromList = matchCouncilOptionInUserText(userText, options);
  if (fromList) return fromList;

  const patterns = [
    /(?:encaminhar|enviar|mandar)\s+(?:para\s+)?(?:[oa]\s+)?(?:vereador(?:a)?\s+)?([^.,!?]+)/i,
    /(?:pode\s+)?(?:encaminhar|enviar)\s+(?:para\s+)?(?:[oa]\s+)?(?:vereador(?:a)?\s+)?([^.,!?]+)/i,
    /(?:escolho|quero|prefiro)\s+(?:[oa]\s+)?(?:vereador(?:a)?\s+)?([^.,!?]+)/i,
    /(?:vereador(?:a)?)\s+([^.,!?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = userText.match(pattern);
    if (!match?.[1]) continue;
    let raw = match[1].trim().replace(/^(o|a)\s+/i, "").replace(/\s+por favor$/i, "").trim();
    if (!raw || raw.length < 3) continue;

    const listHit = matchCouncilOptionInUserText(raw, options);
    if (listHit) return listHit;

    const validation = findCouncilMemberMatches(raw);
    if (validation.found && validation.matches.length === 1) {
      return {
        councilName: validation.matches[0].name,
        councilParty: validation.matches[0].party,
      };
    }
  }

  return matchCouncilOptionInUserText(userText, options);
}

export function extractCouncilSelectionFromAssistantList(
  lastAssistantText: string,
  lastUserTextEarly: string,
): { councilName: string; councilParty: string } | null {
  const options = parseCouncilOptionsFromAssistantText(lastAssistantText);

  const namedSelectionMatch = lastUserTextEarly.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (namedSelectionMatch) {
    return {
      councilName: namedSelectionMatch[1].trim(),
      councilParty: namedSelectionMatch[2].trim(),
    };
  }

  const numericSelectionMatch = lastUserTextEarly.match(/^(?:op[cç][aã]o\s*)?([1-9]\d*)$/i);
  if (numericSelectionMatch) {
    const selectedIndex = parseInt(numericSelectionMatch[1], 10);
    if (Number.isFinite(selectedIndex) && selectedIndex >= 1) {
      const selectedOption = options.find((option) => option.index === selectedIndex);
      if (selectedOption) {
        return {
          councilName: selectedOption.councilName,
          councilParty: selectedOption.councilParty,
        };
      }
    }
  }

  return extractCouncilNameFromNaturalLanguage(lastUserTextEarly, options);
}

function assistantRecentlyAskedCouncilForward(chatMessages: Array<Record<string, unknown>>): boolean {
  const recentAssistants = chatMessages
    .filter((message) => message.role === "assistant")
    .slice(-4);
  return recentAssistants.some((message) =>
    /deseja que eu encaminhe sua demanda para algum deles/i.test(getContentText(message.content))
  );
}

function getAssistantTextWithCouncilList(chatMessages: Array<Record<string, unknown>>): string {
  const recentAssistants = chatMessages
    .filter((message) => message.role === "assistant")
    .slice(-4)
    .map((message) => getContentText(message.content));
  const withNumberedList = recentAssistants.find((text) => /^\s*\d+\.\s+.+\([^)]+\)/m.test(text));
  return withNumberedList ?? recentAssistants.join("\n");
}

function extractDemandDescriptionFromChat(
  chatMessages: Array<Record<string, unknown>>,
): string | null {
  for (let i = chatMessages.length - 1; i >= 0; i--) {
    const text = getContentText(chatMessages[i].content);
    const progressMatch = text.match(/\[COLLECTION_PROGRESS:urban_report:(\{[\s\S]*?\})\]/);
    if (progressMatch) {
      try {
        const fields = JSON.parse(progressMatch[1]) as { description?: string };
        if (fields.description && String(fields.description).trim().length >= 12) {
          return String(fields.description).trim();
        }
      } catch {
        /* ignore malformed progress */
      }
    }
  }

  let best: string | null = null;
  for (let i = chatMessages.length - 1; i >= 0; i--) {
    if (chatMessages[i].role !== "user") continue;
    const text = getContentText(chatMessages[i].content).trim();
    if (text.length < 12) continue;
    if (/^(reclamacao|duvida|sugestao|elogio)$/i.test(text.normalize("NFD").replace(/\p{M}/gu, ""))) {
      continue;
    }
    if (/^(sim|n[aã]o|nao|ok|\d+)$/i.test(text)) continue;
    if (!best || text.length > best.length) best = text;
  }
  return best;
}

async function resolveUrbanReportIdForReferral(
  chatMessages: Array<Record<string, unknown>>,
  supabase: SupabaseClient,
  userId: string,
  lib: typeof import("./lib.ts"),
): Promise<string | null> {
  const { urbanReportId } = extractLatestCreatedReportIds(chatMessages);
  if (urbanReportId) return urbanReportId;

  if (typeof lib.executeTool !== "function") return null;

  const description = extractDemandDescriptionFromChat(chatMessages);
  if (!description) return null;

  try {
    const toolResult = await lib.executeTool(
      "create_urban_report",
      {
        category: "outro",
        report_nature: "sugestao",
        description,
        street: "Cidade de São Paulo",
        neighborhood: "São Paulo",
        city: "São Paulo",
        risk_level: "low",
        affected_scope: "citywide",
        subcategory: "Sugestão via chat",
      },
      userId,
      supabase,
      {},
    ) as { success: boolean; message: string };

    if (!toolResult.success) {
      console.warn(
        "[ai-orchestrator] Auto urban report for council referral failed:",
        toolResult.message?.slice(0, 200),
      );
      return null;
    }

    const createdMatch = toolResult.message.match(/\[REPORT_CREATED:([0-9a-f-]{36})\]/i);
    return createdMatch?.[1] ?? null;
  } catch (error) {
    console.warn("[ai-orchestrator] resolveUrbanReportIdForReferral error:", error);
    return null;
  }
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

  const assistantCouncilContext = getAssistantTextWithCouncilList(chatMessages) || lastAssistantText;
  const botJustShowedCouncilList = assistantRecentlyAskedCouncilForward(chatMessages) ||
    /deseja que eu encaminhe sua demanda para algum deles\?/i.test(lastAssistantText);
  const parsedSelection = extractCouncilSelectionFromAssistantList(
    assistantCouncilContext,
    lastUserTextEarly,
  );
  if (botJustShowedCouncilList && parsedSelection && chatMessages.length > 0) {
    const { councilName, councilParty } = parsedSelection;
    const { transportReportId } = extractLatestCreatedReportIds(chatMessages);
    const urbanReportId = await resolveUrbanReportIdForReferral(chatMessages, supabase, userId, lib);

    const demandDescription = extractDemandDescriptionFromChat(chatMessages);
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
    if (demandDescription) referralRow.citizen_message = demandDescription;
    if (urbanReportId) referralRow.urban_report_id = urbanReportId;
    else if (transportReportId) referralRow.transport_report_id = transportReportId;

    const reportNature = extractReportNatureFromChat(chatMessages);
    if (urbanReportId || transportReportId) {
      const { error: refError } = await supabase.from("council_member_referrals").insert(referralRow);
      if (!refError) {
        const reply = buildConversationClosingMessage({
          kind: "council_referral_full",
          councilName,
          councilParty,
          reportNature,
        });
        console.log("[ai-orchestrator] User selected council member: referral recorded");
        return { response: createSseResponse(reply, corsHeaders) };
      }
      console.error("[ai-orchestrator] council_member_referrals insert failed:", refError);
    } else {
      const reply = buildConversationClosingMessage({
        kind: "council_referral_partial",
        councilName,
        councilParty,
        reportNature,
      });
      console.log("[ai-orchestrator] User selected council member without linked report id");
      return { response: createSseResponse(reply, corsHeaders) };
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
