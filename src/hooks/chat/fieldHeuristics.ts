import type { Dispatch, SetStateAction } from "react";
import type { CollectionType, CollectedFields } from "@/components/ai/DataCollectionTracker";
import {
  aggregateServiceRatingStars,
  parseRatingDimensionsFromMessage,
} from "@/lib/serviceRatingDimensions";
import { parseOccurrenceTime } from "@/hooks/chat/parseOccurrenceTime";
import type { ChatMessage } from "@/hooks/chat/types";

export interface ApplyFieldHeuristicsParams {
  content: string;
  messages: ChatMessage[];
  collectionType: CollectionType | null;
  collectedFields: CollectedFields;
  setCollectedFields: Dispatch<SetStateAction<CollectedFields>>;
}

/** Atualiza o tracker no envio do usuário (heurísticas locais, sem esperar o backend). */
export function applyOutgoingFieldHeuristics({
  content,
  messages,
  collectionType,
  collectedFields,
  setCollectedFields,
}: ApplyFieldHeuristicsParams): void {
  // Heurísticas de UI: quando o assistente faz perguntas estruturadas, atualizamos o tracker
  // imediatamente no envio do usuário (sem depender de marcadores do backend).
  if (collectionType === "urban_report") {
    const lastAssistantText =
      [...messages].reverse().find((m) => m.role === "assistant")?.content || "";
    const lastAssistantLower = lastAssistantText.toLowerCase();
    const raw = content.trim();
    const rawLower = raw.toLowerCase();

    // Natureza (reclamação, dúvida, sugestão, elogio) — resposta rápida ou texto curto
    if (!collectedFields.report_nature) {
      const askedNature =
        lastAssistantLower.includes("[field_request:report_nature]") ||
        lastAssistantLower.includes("tipo do seu relato");
      if (askedNature && raw.length <= 32) {
        const nk = rawLower.normalize("NFD").replace(/\p{M}/gu, "");
        const map: Record<string, string> = {
          reclamacao: "reclamacao",
          duvida: "duvida",
          sugestao: "sugestao",
          elogio: "elogio",
        };
        if (map[nk]) {
          setCollectedFields((prev) => ({ ...prev, report_nature: map[nk] }));
        }
      }
    }

    // ========== CEP DETECTION (typed manually) ==========
    // If assistant asked for CEP and user provides 8 digits, capture immediately
    const cepPattern = /\b(\d{5})-?(\d{3})\b/;
    const cepMatch = raw.match(cepPattern);
    if (cepMatch && !collectedFields.cep) {
      const fullCep = cepMatch[1] + cepMatch[2];
      console.log("[useUnifiedAIChat] Detected CEP from user input:", fullCep);
      setCollectedFields((prev) => ({ ...prev, cep: fullCep }));
    }

    // Also detect pure 8-digit numbers as CEP when assistant asked for it
    const askedForCep =
      lastAssistantLower.includes("cep") ||
      lastAssistantLower.includes("[field_request:cep]") ||
      lastAssistantLower.includes("[address_picker]");
    if (askedForCep && /^\d{8}$/.test(raw) && !collectedFields.cep) {
      console.log("[useUnifiedAIChat] Detected 8-digit CEP:", raw);
      setCollectedFields((prev) => ({ ...prev, cep: raw }));
    }

    // 0) Detect Address Picker structured address (from Google Places or CEP)
    // Parse different formats: "Endereço selecionado: Rua X - Bairro, Cidade - CEP: 00000-000"
    // Or simpler: "Endereço selecionado: Rua X - Bairro, Cidade"
    if (rawLower.includes("endereço selecionado:")) {
      const newFields: CollectedFields = {};

      // Extract street (before first " - ")
      const streetMatch = raw.match(/Endereço selecionado:\s*([^-\n]+)/i);
      if (streetMatch?.[1]?.trim()) {
        newFields.street = streetMatch[1].trim();
      }

      // Extract neighborhood (after first " - ", before comma or " - CEP")
      const neighborhoodMatch = raw.match(/-\s*([^,\n]+?)(?:,|\s+-\s+CEP)/i);
      if (neighborhoodMatch?.[1]?.trim()) {
        newFields.neighborhood = neighborhoodMatch[1].trim();
      }

      // Extract CEP if present
      const pickerCepMatch = raw.match(/CEP:\s*(\d{5}-?\d{3})/i);
      if (pickerCepMatch?.[1]) {
        newFields.cep = pickerCepMatch[1].replace("-", "");
      }

      if (Object.keys(newFields).length > 0) {
        console.log("[useUnifiedAIChat] Parsed address from picker:", newFields);
        setCollectedFields((prev) => ({ ...prev, ...newFields }));
      }
    }

    // 0.5) Categoria - detecta confirmação de feedback ou classificação na conversa
    if (!collectedFields.category) {
      // Detecta quando IA oferece registrar como feedback e usuário aceita
      const isOfferingFeedback =
        lastAssistantLower.includes("registrar") &&
        (lastAssistantLower.includes("feedback") ||
          lastAssistantLower.includes("preocupação") ||
          lastAssistantLower.includes("câmara"));
      const userAccepts =
        rawLower.includes("sim") ||
        rawLower.includes("desejo") ||
        rawLower.includes("quero") ||
        rawLower.includes("pode") ||
        rawLower.includes("ok") ||
        rawLower.includes("aceito");

      if (isOfferingFeedback && userAccepts) {
        setCollectedFields((prev) => ({ ...prev, category: "feedback_camara" }));
      }

      // Detecta quando IA confirma categoria via texto
      const categoryConfirmPatterns = [
        { pattern: /problema de \*?\*?ilumina[çc][ãa]o\*?\*?/i, category: "iluminacao" },
        { pattern: /problema de \*?\*?via p[úu]blica\*?\*?/i, category: "via_publica" },
        { pattern: /problema de \*?\*?cal[çc]ada\*?\*?/i, category: "calcada" },
        { pattern: /problema de \*?\*?sinaliza[çc][ãa]o\*?\*?/i, category: "sinalizacao" },
        { pattern: /problema de \*?\*?drenagem\*?\*?/i, category: "drenagem" },
        { pattern: /problema de \*?\*?lixo\*?\*?/i, category: "lixo" },
        { pattern: /problema de \*?\*?esgoto\*?\*?/i, category: "esgoto" },
        { pattern: /problema de \*?\*?[áa]rea verde\*?\*?/i, category: "area_verde" },
        { pattern: /feedback.*c[âa]mara/i, category: "feedback_camara" },
        { pattern: /registrar.*preocupa[çc][ãa]o.*c[âa]mara/i, category: "feedback_camara" },
        { pattern: /registrar como feedback/i, category: "feedback_camara" },
      ];

      for (const { pattern, category } of categoryConfirmPatterns) {
        if (pattern.test(lastAssistantText)) {
          setCollectedFields((prev) => ({ ...prev, category }));
          break;
        }
      }
    }

    // 1) Número / Referência
    if (!collectedFields.street_number) {
      const askedForNumber = /\bn[úu]mero\b/i.test(lastAssistantText);
      if (askedForNumber) {
        const numberMatch =
          raw.match(/^(\d+[A-Za-z]?|s\/?n|sem\s*n[úu]mero)$/i) || raw.match(/^(\d+)\b/);
        if (numberMatch) {
          const extracted = (numberMatch[1] || numberMatch[0] || raw).toUpperCase();
          setCollectedFields((prev) => ({ ...prev, street_number: extracted }));
        } else if (!collectedFields.reference_point && raw.length > 0) {
          // Se não for número, mas a pergunta foi "número ou ponto de referência", marca referência.
          if (
            lastAssistantLower.includes("ponto de referência") ||
            lastAssistantLower.includes("referência")
          ) {
            setCollectedFields((prev) => ({ ...prev, reference_point: raw }));
          }
        }
      }
    }

    // 2) Risco (impacto) - Heurística expandida; permite corrigir gravidade depois do primeiro valor
    const riskBtnKey = raw
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/\s+/g, "");
    const riskBtnMap: Record<string, string> = {
      critical: "critical",
      moderate: "moderate",
      low: "low",
      none: "none",
      critica: "critical",
      critico: "critical",
      moderada: "moderate",
      moderado: "moderate",
      baixa: "low",
      baixo: "low",
      semriscoimediato: "none",
      semrisco: "none",
    };
    const fromRiskButton = riskBtnMap[riskBtnKey];
    const askedForRisk =
      lastAssistantLower.includes("risco imediato") ||
      lastAssistantLower.includes("risco") ||
      lastAssistantLower.includes("perigo") ||
      lastAssistantLower.includes("gravidade") ||
      lastAssistantLower.includes("urgên") ||
      /\balgum\s+risco\b/i.test(lastAssistantText);
    const forceRiskUpdate =
      !!fromRiskButton ||
      lastAssistantLower.includes("nova gravidade") ||
      /\[field_request:risk_level\]/i.test(lastAssistantText) ||
      (lastAssistantLower.includes("gravidade do problema") &&
        (lastAssistantLower.includes("escolha") ||
          lastAssistantLower.includes("opção") ||
          lastAssistantLower.includes("opcao") ||
          lastAssistantLower.includes("frase"))) ||
      !collectedFields.risk_level;

    if (forceRiskUpdate) {
      if (fromRiskButton && askedForRisk && raw.length > 0) {
        setCollectedFields((prev) => ({ ...prev, risk_level: fromRiskButton }));
      } else if (!fromRiskButton && askedForRisk && raw.length > 0) {
        let risk_level: string | null = null;
        const risk_types: string[] = [];
        const riskNorm = rawLower.replace(/\bcheio(?=\s+t[óo]xic)/g, "cheiro");

        // Detecção de negação
        if (
          rawLower.includes("sem risco") ||
          rawLower.includes("não tem risco") ||
          rawLower.includes("nenhum risco")
        ) {
          risk_level = "none";
        }
        // Crítico - palavras de alta urgência
        else if (
          rawLower.includes("fios") ||
          rawLower.includes("choque") ||
          rawLower.includes("incênd") ||
          rawLower.includes("fogo") ||
          rawLower.includes("alag") ||
          rawLower.includes("inund") ||
          rawLower.includes("desab") ||
          rawLower.includes("desmor") ||
          rawLower.includes("bloqueada") ||
          rawLower.includes("bloqueado") ||
          rawLower.includes("não passa") ||
          rawLower.includes("nao passa") ||
          rawLower.includes("urgente") ||
          rawLower.includes("emergência") ||
          rawLower.includes("emergencia") ||
          rawLower.includes("crítico") ||
          rawLower.includes("muito perigoso") ||
          rawLower.includes("grave") ||
          riskNorm.includes("tóxic") ||
          riskNorm.includes("toxic") ||
          riskNorm.includes("foco de contamina") ||
          (riskNorm.includes("cheiro") && riskNorm.includes("forte"))
        ) {
          risk_level = "critical";
          if (
            rawLower.includes("fios") ||
            rawLower.includes("choque") ||
            rawLower.includes("elétric")
          )
            risk_types.push("electrical");
          if (rawLower.includes("alag") || rawLower.includes("inund")) risk_types.push("flooding");
          if (
            rawLower.includes("desab") ||
            rawLower.includes("desmor") ||
            rawLower.includes("estrutur")
          )
            risk_types.push("structural");
          if (rawLower.includes("incênd") || rawLower.includes("fogo")) risk_types.push("fire");
          if (
            rawLower.includes("trânsit") ||
            rawLower.includes("bloqu") ||
            rawLower.includes("passa")
          )
            risk_types.push("traffic");
          if (
            riskNorm.includes("tóxic") ||
            riskNorm.includes("toxic") ||
            riskNorm.includes("cheiro") ||
            riskNorm.includes("fedor") ||
            riskNorm.includes("fuma")
          ) {
            risk_types.push("health");
          }
        }
        // Moderado - problemas de trânsito e acidentes
        else if (
          rawLower.includes("acident") ||
          rawLower.includes("trânsit") ||
          rawLower.includes("transit") ||
          rawLower.includes("lento")
        ) {
          risk_level = "moderate";
          risk_types.push("traffic");
        }
        // Odor / poluição / saúde (frases livres, alinhado ao parser do orquestrador)
        else if (
          riskNorm.includes("cheiro") ||
          riskNorm.includes("fedor") ||
          riskNorm.includes("fumaça") ||
          riskNorm.includes("fumaca") ||
          riskNorm.includes("contamina") ||
          riskNorm.includes("polui")
        ) {
          risk_level =
            riskNorm.includes("forte") ||
            riskNorm.includes("grave") ||
            riskNorm.includes("tóxic") ||
            riskNorm.includes("toxic")
              ? "critical"
              : "moderate";
          risk_types.push("health");
        }
        // Baixo - incômodos
        else if (
          rawLower.includes("incômod") ||
          rawLower.includes("desconfort") ||
          rawLower.includes("pouco")
        ) {
          risk_level = "low";
        }
        // Frase substantiva sem padrão claro: não travar o fluxo (evita tokens de fluxo tipo "confirmar")
        else if (
          raw.trim().length >= 10 &&
          /\s/.test(raw.trim()) &&
          !/^(não|nao|n|no)\b/i.test(raw.trim()) &&
          !/^(não sei|nao sei|sem ideia)\b/i.test(raw.trim()) &&
          !/^(confirmar|corrigir|continuar|registrar|ok|obrigad)/i.test(raw.trim())
        ) {
          risk_level = "low";
        }
        // Resposta afirmativa simples ("sim", "sim, o trânsito está lento")
        else if (rawLower.match(/^sim\b/)) {
          // Se a resposta começa com "sim" para pergunta de risco
          if (
            rawLower.includes("trânsit") ||
            rawLower.includes("bloqu") ||
            rawLower.includes("passage")
          ) {
            risk_level = "critical";
            risk_types.push("traffic");
          } else {
            // Assumir moderado para respostas afirmativas genéricas
            risk_level = "moderate";
          }
        }

        if (risk_level) {
          setCollectedFields((prev) => ({
            ...prev,
            risk_level,
            ...(risk_types.length ? { risk_types } : {}),
          }));
        }
      }
    }

    // 3) Afetação / Escopo
    if (!collectedFields.affected_scope) {
      const askedForScope =
        lastAssistantLower.includes("isso está afetando") ||
        lastAssistantLower.includes("toda a rua") ||
        lastAssistantLower.includes("bairro todo") ||
        lastAssistantLower.includes("[field_request:affected_scope]");
      if (askedForScope && raw.length > 0) {
        let affected_scope: string | null = null;
        if (
          rawLower.includes("só eu") ||
          rawLower.includes("apenas eu") ||
          rawLower.includes("somente eu")
        )
          affected_scope = "individual";
        else if (rawLower.includes("rua")) affected_scope = "street";
        else if (rawLower.includes("bairro")) affected_scope = "neighborhood";
        else if (rawLower.includes("zona")) affected_scope = "zone";
        else if (rawLower.includes("cidade")) affected_scope = "city";

        if (affected_scope) {
          setCollectedFields((prev) => ({ ...prev, affected_scope }));
        }
      }
    }

    // 4) Descrição - detecta resposta a pedido de detalhes OU primeira mensagem descritiva
    // SEMANTIC INTERPRETATION: Accept any non-generic text (no character count)
    if (!collectedFields.description) {
      const askedForDescription =
        lastAssistantLower.includes("me conte mais") ||
        lastAssistantLower.includes("descreva") ||
        lastAssistantLower.includes("mais detalhes") ||
        lastAssistantLower.includes("o que está acontecendo") ||
        lastAssistantLower.includes("qual o problema") ||
        lastAssistantLower.includes("sua dúvida") ||
        lastAssistantLower.includes("sua duvida") ||
        lastAssistantLower.includes("sua sugestão") ||
        lastAssistantLower.includes("sua sugestao") ||
        lastAssistantLower.includes("quer elogiar") ||
        lastAssistantLower.includes("funcionando bem") ||
        lastAssistantLower.includes("ideia de melhoria") ||
        lastAssistantLower.includes("[field_request:description]");

      // Helper to detect generic intent phrases (same logic as backend)
      const isGenericIntent = (text: string): boolean => {
        const genericPhrases = [
          // Generic report intents
          /^quero\s*(relatar|reportar|fazer|registrar)/i,
          /^preciso\s*(relatar|reportar|fazer|registrar)/i,
          /^tenho\s*um\s*(problema|relato)/i,
          /quero\s*falar\s+sobre\s+a\s+cidade/i,
          /^(sim|não|nao|ok|pode|quero|desejo|aceito)$/i,
          /^quero\s*avaliar/i,
          // Journey switch phrases (must NOT be treated as descriptions)
          /quero\s*falar\s*(de|do|sobre)\s*(transporte|avalia[çc][ãa]o|servi[çc]o|urbano|cidade)/i,
          /falar\s*(de|do|sobre)\s*(transporte|avalia[çc][ãa]o|servi[çc]o|urbano|cidade)/i,
          /mudar\s*para\s*(transporte|avalia[çc][ãa]o|servi[çc]o|urbano|relato)/i,
          /trocar\s*para\s*(transporte|avalia[çc][ãa]o|servi[çc]o|urbano|relato)/i,
          /quero\s*(avaliar|relatar|reportar)\s*(um\s*)?(servi[çc]o|problema|transporte)/i,
          /na\s*verdade,?\s*(quero|preciso|gostaria)/i,
          // Service search phrases (trigger service discovery)
          /quero\s*(encontrar|buscar|achar|procurar)\s*(um\s*)?(servi[çc]o|ubs|escola|hospital|ceu)/i,
          /encontrar\s*(um\s*)?(servi[çc]o|ubs|escola|hospital|ceu)/i,
          /buscar\s*(um\s*)?(servi[çc]o|ubs|escola|hospital|ceu)/i,
          /onde\s*(fica|tem|posso\s*encontrar)\s*(um\s*)?(ubs|escola|hospital|posto|ceu)/i,
          /servi[çc]os?\s*(perto|pr[óo]ximo|perto\s*de\s*mim)/i,
          // Learning/knowledge phrases (trigger knowledge search)
          /tenho\s*(uma?\s*)?(d[úu]vida|pergunta|quest[ãa]o)\s*(sobre)?/i,
          /d[úu]vida\s*(sobre|da|do)\s*(c[âa]mara|legislativo|vereador)/i,
          /como\s+funciona/i,
          /o\s+que\s+[ée]/i,
          /quem\s+[ée]/i,
          /me\s+explica/i,
          /quero\s+(saber|entender|aprender)/i,
          // News phrases (trigger news search)
          /quais?\s*(as|a)?\s*([úu]ltimas?\s*)?not[íi]cias/i,
          /not[íi]cias\s*(da|do|sobre)/i,
          /novidades\s*(da|do)/i,
        ];
        return genericPhrases.some((pattern) => pattern.test(text.trim().toLowerCase()));
      };

      const natureKey = String(collectedFields.report_nature ?? "").toLowerCase();
      const isNonComplaintNature = ["duvida", "sugestao", "elogio"].includes(natureKey);
      const isSubstantiveNatureAnswer = (text: string): boolean => {
        const t = text.trim();
        if (t.length < 12) return false;
        if (
          /^(reclamacao|duvida|sugestao|elogio)$/i.test(t.normalize("NFD").replace(/\p{M}/gu, ""))
        ) {
          return false;
        }
        if (/^quero\s+falar\s+sobre\s+a\s+cidade\b/i.test(t)) return false;
        return true;
      };

      // Accept any non-empty, non-generic text as description (dúvida/sugestão/elogio: regras mais permissivas)
      if (askedForDescription && raw.trim().length > 0) {
        const accept = isNonComplaintNature
          ? isSubstantiveNatureAnswer(raw)
          : !isGenericIntent(raw);
        if (accept) {
          setCollectedFields((prev) => ({ ...prev, description: raw }));
        }
      }

      // Detect description from first/second user message if not generic
      const userMsgCount = messages.filter((m) => m.role === "user").length;
      if (
        userMsgCount <= 2 &&
        raw.trim().length > 0 &&
        !rawLower.includes("endereço selecionado:") &&
        !isGenericIntent(raw)
      ) {
        // Not a structured address and not generic = valid description
        setCollectedFields((prev) => ({ ...prev, description: raw }));
      }
    }
  }

  // === HEURÍSTICAS PARA TRANSPORTE ===
  if (collectionType === "transport_report") {
    const lastAssistantText =
      [...messages].reverse().find((m) => m.role === "assistant")?.content || "";
    const lastAssistantLower = lastAssistantText.toLowerCase();
    const raw = content.trim();
    const rawLower = raw.toLowerCase();

    // Detectar tipo de problema (mapeamento para enums reais do banco)
    if (!collectedFields.report_type) {
      // SEGURANÇA - prioridade (termos graves)
      if (
        /ass[ée]dio|encox|importunação|abuso|agress|ameaç|roubo|furto|assalto|arma|facão|faca|briga|violên|estup|molest|insegur|perigos/i.test(
          rawLower,
        )
      ) {
        setCollectedFields((prev) => ({ ...prev, report_type: "seguranca" }));
      }
      // ATRASO
      else if (
        /atras|demor|não (veio|passou|chegou)|espera|aguard|\d+\s*min|meia hora|uma hora/i.test(
          rawLower,
        )
      ) {
        setCollectedFields((prev) => ({ ...prev, report_type: "atraso" }));
      }
      // LOTAÇÃO
      else if (/lot[aç]|cheio|superlot|aperta|empurr|não (coube|cabe)|sardinha/i.test(rawLower)) {
        setCollectedFields((prev) => ({ ...prev, report_type: "lotacao" }));
      }
      // ACESSIBILIDADE
      else if (/elevador|rampa|cadeira|deficien|acessib|cego|surdo|mobilidade/i.test(rawLower)) {
        setCollectedFields((prev) => ({ ...prev, report_type: "acessibilidade" }));
      }
      // LIMPEZA
      else if (/suj[oa]|lixo|fedido|mal cheiro|imundo|nojento|barata|rato|inseto/i.test(rawLower)) {
        setCollectedFields((prev) => ({ ...prev, report_type: "limpeza" }));
      }
      // CONDUÇÃO
      else if (/motorista|dirig|freiada|acelera|imprudên|costur/i.test(rawLower)) {
        setCollectedFields((prev) => ({ ...prev, report_type: "conducao" }));
      }
    }

    // Linha com UUID da base (lista) — HU-5.2
    const lineSelUuid = raw.match(
      /\[LINE_SELECTED:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i,
    );
    if (lineSelUuid) {
      setCollectedFields((prev) => ({ ...prev, line_id: lineSelUuid[1] }));
    }
    const lineFromListMsg = raw.match(/linha:\s*(\S+)\s*-\s*(.+?)\s*\[LINE_SELECTED:/i);
    if (lineFromListMsg) {
      setCollectedFields((prev) => ({ ...prev, line_code: lineFromListMsg[1].trim() }));
    }
    const lineCustomMsg =
      raw.match(/linha informada\s*\(fora da lista\):\s*(.+)/i) ||
      raw.match(/linha não listada:\s*(.+)/i);
    if (lineCustomMsg) {
      setCollectedFields((prev) => ({
        ...prev,
        line_code: lineCustomMsg[1].trim(),
        line_id: undefined,
      }));
    }

    // Detectar linha de ônibus/metrô (texto livre) — não sobrescrever escolha estruturada desta mensagem
    if (!lineFromListMsg && !lineCustomMsg && !collectedFields.line_code) {
      const lineMatch = raw.match(/\b(\d{3,4}[A-Za-z]?-?\d*|[A-Z]{1,3}\d{1,2})\b/i);
      if (lineMatch) {
        setCollectedFields((prev) => ({ ...prev, line_code: lineMatch[1].toUpperCase() }));
      }
    }

    // Detectar data (hoje, ontem, ou data específica)
    if (!collectedFields.occurrence_date) {
      if (/\bhoje\b/i.test(rawLower)) {
        setCollectedFields((prev) => ({
          ...prev,
          occurrence_date: new Date().toISOString().split("T")[0],
        }));
      } else if (/\bontem\b/i.test(rawLower)) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setCollectedFields((prev) => ({
          ...prev,
          occurrence_date: yesterday.toISOString().split("T")[0],
        }));
      } else if (/\banteontem\b/i.test(rawLower)) {
        const dayBefore = new Date();
        dayBefore.setDate(dayBefore.getDate() - 2);
        setCollectedFields((prev) => ({
          ...prev,
          occurrence_date: dayBefore.toISOString().split("T")[0],
        }));
      }
      // Data explícita dd/mm/aaaa
      const dateMatch = rawLower.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
      if (dateMatch) {
        const [, d, m, y] = dateMatch;
        const year = y.length === 2 ? `20${y}` : y;
        setCollectedFields((prev) => ({
          ...prev,
          occurrence_date: `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
        }));
      }
    }

    // Detectar horário
    if (!collectedFields.occurrence_time) {
      const parsedTime = parseOccurrenceTime(raw);
      if (parsedTime) setCollectedFields((prev) => ({ ...prev, occurrence_time: parsedTime }));
    }

    // Detectar sentido (ida/volta/circular)
    if (!collectedFields.direction) {
      if (/\bida\b/i.test(rawLower)) {
        setCollectedFields((prev) => ({ ...prev, direction: "ida" }));
      } else if (/\bvolta\b/i.test(rawLower)) {
        setCollectedFields((prev) => ({ ...prev, direction: "volta" }));
      } else if (/\bcircular\b/i.test(rawLower)) {
        setCollectedFields((prev) => ({ ...prev, direction: "circular" }));
      }
    }

    // Detectar descrição (mensagem longa >= 20 caracteres)
    if (!collectedFields.description && raw.length >= 20) {
      // Não capturar respostas curtas como linha, data, etc.
      const isShortResponse =
        /^(hoje|ontem|anteontem|\d{3,4}[A-Za-z]?|\d{1,2}[h:]\d{2}|sim|não|ok)$/i.test(raw);
      if (!isShortResponse) {
        const askedForDescription =
          lastAssistantLower.includes("descreva") ||
          lastAssistantLower.includes("me cont") ||
          lastAssistantLower.includes("o que aconteceu") ||
          lastAssistantLower.includes("detalhes") ||
          lastAssistantLower.includes("[field_request:description]");

        // Ou é uma das primeiras mensagens (descrição inicial)
        const userMsgCount = messages.filter((m) => m.role === "user").length;
        if (askedForDescription || userMsgCount <= 2) {
          setCollectedFields((prev) => ({ ...prev, description: raw }));
        }
      }
    }

    // Detectar frequência de recorrência
    if (!collectedFields.recurrence_frequency) {
      if (/\bprimeira vez\b/i.test(rawLower)) {
        setCollectedFields((prev) => ({ ...prev, recurrence_frequency: "primeira_vez" }));
      } else if (/algumas vezes/i.test(rawLower)) {
        setCollectedFields((prev) => ({ ...prev, recurrence_frequency: "algumas_vezes_mes" }));
      } else if (/toda semana/i.test(rawLower)) {
        setCollectedFields((prev) => ({ ...prev, recurrence_frequency: "toda_semana" }));
      } else if (/todos os dias|todo dia/i.test(rawLower)) {
        setCollectedFields((prev) => ({ ...prev, recurrence_frequency: "todos_os_dias" }));
      }
    }

    const impactSelectedTag = raw.match(/\[IMPACT_SELECTED:([2-5])\]/);
    if (impactSelectedTag) {
      const score = parseInt(impactSelectedTag[1], 10);
      setCollectedFields((prev) => ({ ...prev, personal_impact: score }));
    }
  }

  // === HEURÍSTICAS PARA AVALIAÇÃO ===
  if (collectionType === "service_rating") {
    const lastAssistantText =
      [...messages].reverse().find((m) => m.role === "assistant")?.content || "";
    const lastAssistantLower = lastAssistantText.toLowerCase();
    const raw = content.trim();
    const rawLower = raw.toLowerCase();

    // Detectar tipo de serviço
    if (!collectedFields.service_type) {
      const serviceTypes: Record<string, string> = {
        ubs: "ubs",
        "posto de saúde": "ubs",
        posto: "ubs",
        "unidade básica": "ubs",
        escola: "school",
        emef: "school",
        emei: "school",
        ceu: "ceu",
        hospital: "hospital",
        biblioteca: "library",
        "centro esportivo": "sports_center",
      };
      for (const [keyword, type] of Object.entries(serviceTypes)) {
        if (rawLower.includes(keyword)) {
          setCollectedFields((prev) => ({ ...prev, service_type: type }));
          break;
        }
      }
    }

    const parsedDims = parseRatingDimensionsFromMessage(raw);
    if (parsedDims) {
      setCollectedFields((prev) => ({
        ...prev,
        rating_dimensions: parsedDims,
        rating_stars: aggregateServiceRatingStars(parsedDims),
      }));
    }

    const ratingSelectedTag = raw.match(/\[RATING_SELECTED:([1-5])\]/);
    if (ratingSelectedTag) {
      const stars = parseInt(ratingSelectedTag[1], 10);
      setCollectedFields((prev) => ({ ...prev, rating_stars: stars }));
    }

    // Detectar nota (1-5 estrelas) — legado, só se ainda não houver dimensões / marcador
    if (!collectedFields.rating_stars && !collectedFields.rating_dimensions && !ratingSelectedTag) {
      const starsMatch = raw.match(/(\d)\s*(estrela|nota|ponto)/i);
      if (starsMatch) {
        const stars = parseInt(starsMatch[1]);
        if (stars >= 1 && stars <= 5) {
          setCollectedFields((prev) => ({ ...prev, rating_stars: stars }));
        }
      }
      // Também detectar números isolados quando perguntado sobre nota
      if (lastAssistantLower.includes("nota") || lastAssistantLower.includes("estrela")) {
        const numMatch = raw.match(/^(\d)$/);
        if (numMatch) {
          const stars = parseInt(numMatch[1]);
          if (stars >= 1 && stars <= 5) {
            setCollectedFields((prev) => ({ ...prev, rating_stars: stars }));
          }
        }
      }
    }

    if (!("wait_time_score" in collectedFields)) {
      const wtMatch = raw.match(/\[WAIT_TIME:(\d+|null)\]/i);
      if (wtMatch) {
        const token = wtMatch[1].toLowerCase();
        const v = token === "null" ? null : parseInt(wtMatch[1], 10);
        if (v === null || (v >= 2 && v <= 5)) {
          setCollectedFields((prev) => ({ ...prev, wait_time_score: v }));
        }
      }
    }

    // Detect dimension rating (atendimento, infraestrutura, etc.)
    const dimMatch = raw.match(/\[DIM_RATING:(\w+):(\d)\]/i);
    if (dimMatch) {
      const dimKey = dimMatch[1].toLowerCase();
      const dimScore = parseInt(dimMatch[2], 10);
      if (dimScore >= 1 && dimScore <= 5) {
        const fieldKey = `${dimKey}_score`;
        if (!(fieldKey in collectedFields)) {
          setCollectedFields((prev) => {
            const next: Record<string, unknown> = { ...prev, [fieldKey]: dimScore };
            if (dimKey === "tempo_espera") {
              next.wait_time_score = Math.min(5, Math.max(2, dimScore));
            }
            return next;
          });
        }
      }
    }

    // Detectar nome do serviço
    if (
      !collectedFields.service_name &&
      lastAssistantLower.includes("qual") &&
      (lastAssistantLower.includes("nome") ||
        lastAssistantLower.includes("unidade") ||
        lastAssistantLower.includes("serviço"))
    ) {
      if (raw.length >= 3) {
        setCollectedFields((prev) => ({ ...prev, service_name: raw }));
      }
    }

    // Detectar comentário (mensagem longa)
    if (!collectedFields.rating_text && raw.length >= 20) {
      const askedForComment =
        lastAssistantLower.includes("comentário") ||
        lastAssistantLower.includes("descreva") ||
        lastAssistantLower.includes("experiência") ||
        lastAssistantLower.includes("[field_request:rating_text]");
      if (askedForComment) {
        setCollectedFields((prev) => ({ ...prev, rating_text: raw }));
      }
    }
  }
}
