import type { SupabaseClient } from "@supabase/supabase-js";

import { hasTransportAccessibilityDetails } from "./lib-index-transport-preview.ts";

export type NextFieldInfo = {
  field: string | null;
  picker: string | null;
  prompt: string | null;
};

export async function getNextMissingField(
  collectionType: string,
  fields: Record<string, unknown>,
  supabaseClient: SupabaseClient,
  classificationFeedbackReadClient: SupabaseClient,
  userIdForAddress: string,
  lib: typeof import("./lib.ts"),
): Promise<NextFieldInfo> {
  if (collectionType === "urban_report") {
    const natureRaw = fields.report_nature;
    const natureStr = natureRaw != null ? String(natureRaw).trim() : "";
    const natureOk = (lib.URBAN_REPORT_NATURE_VALUES as readonly string[]).includes(natureStr);
    if (!natureOk) {
      return {
        field: "report_nature",
        picker: null,
        prompt:
          "[FIELD_REQUEST:report_nature]Antes de começarmos, qual é o **tipo do seu relato** sobre a cidade?\n\n[QUICK_REPLY:reclamacao,duvida,sugestao,elogio]",
      };
    }

    const description = String(fields.description ?? "");
    const isBareNature = lib.isBareUrbanReportNatureReply(String(description));
    const descToCheck = isBareNature ? "" : description;
    const isValidDesc = lib.isValidUrbanReportDescription(descToCheck, natureStr);

    console.log("[getNextMissingField] Urban description check:", {
      description: description.substring(0, 40),
      report_nature: natureStr,
      isValidDesc,
    });

    if (!isValidDesc) {
      const nk = natureStr || "reclamacao";
      const descPrompts: Record<string, string> = {
        reclamacao: "**O que está acontecendo?** Me conta o problema.",
        duvida:
          "**Qual é sua dúvida** sobre a cidade, um serviço ou a infraestrutura? Descreva com o máximo de detalhes.",
        sugestao:
          "**Qual é sua sugestão ou ideia de melhoria?** Conte o que você imagina e, se souber, onde se aplica.",
        elogio:
          "**O que você quer elogiar?** Conte o que está funcionando bem e quem ou o quê fez diferença.",
      };
      const descPrompt =
        descPrompts[nk] || "**Conte mais:** o que você gostaria de registrar sobre a cidade?";
      return { field: "description", picker: null, prompt: descPrompt };
    }

    const cepDigitsEarly = fields.cep ? String(fields.cep).replace(/\D/g, "") : "";
    const hasLocationEarly = cepDigitsEarly.length === 8 || (!!fields.street && !!fields.neighborhood);
    const cityEarly = typeof fields.city === "string" ? fields.city.trim() : undefined;
    if (hasLocationEarly && cityEarly && !lib.isCitySaoPaulo(cityEarly)) {
      return { field: null, picker: null, prompt: lib.MESSAGE_OUTSIDE_SAO_PAULO(cityEarly) };
    }

    lib.applyUrbanNatureCategoryDefaults(fields, lib.generateLabelFromDescription);

    if (!fields.category) {
      const descriptionLower = description.toLowerCase();
      const feedback = await lib.getClassificationFromFeedback(
        classificationFeedbackReadClient,
        description,
        "urban",
      );
      if (feedback) {
        fields.category = feedback.category;
        fields.subcategory = feedback.subcategory || lib.generateLabelFromDescription(description);
        fields._auto_classified = true;
        fields._from_feedback = true;
        console.log(
          "[getNextMissingField] Category from feedback:",
          feedback.category,
          "label:",
          fields.subcategory,
        );
      } else if (
        /(armado|arma|armas|drogas?|tráfico|trafico|violência|violencia|agressão|agressao|baderna|funkeiros?)/i
          .test(descriptionLower)
      ) {
        if (/(barulho|som|música|música|festa|balada|ruído|ruido)/i.test(descriptionLower)) {
          fields.category = "poluicao";
          fields.subcategory = "Perturbação Sonora com Risco";
          fields._auto_classified = true;
          fields._urgent_content = true;
          console.log("[getNextMissingField] Auto-classified as poluicao (urgent noise/disturbance)");
        } else {
          fields.category = "outro";
          fields.subcategory = "Questão de Segurança";
          fields._auto_classified = true;
          fields._urgent_content = true;
          console.log("[getNextMissingField] Auto-classified as outro (security issue)");
        }
      } else {
        const autoClass = lib.autoClassifyCategory(description);

        if (autoClass.category && autoClass.confidence >= 0.8) {
          fields.category = autoClass.category;
          fields.subcategory = autoClass.suggestedLabel || lib.generateLabelFromDescription(description);
          fields._auto_classified = true;
          console.log(
            "[getNextMissingField] Auto-classified:",
            autoClass.category,
            "label:",
            fields.subcategory,
            "confidence:",
            autoClass.confidence,
          );
        } else if (autoClass.category && autoClass.confidence >= 0.5) {
          const intuitiveName = autoClass.suggestedLabel || (() => {
            const categoryLabels: Record<string, string> = {
              iluminacao: "iluminação",
              via_publica: "via pública",
              pavimentacao: "pavimentação",
              calcada: "calçada",
              sinalizacao: "sinalização",
              drenagem: "drenagem",
              lixo: "lixo/entulho",
              esgoto: "esgoto/alagamento",
              area_verde: "área verde",
              higiene_urbana: "higiene urbana",
              animais: "animais",
              poluicao: "poluição (barulho ou ar/fumaça)",
              outro: "outro",
            };
            return categoryLabels[autoClass.category!] || autoClass.category;
          })();

          fields._pending_category = autoClass.category;
          fields._pending_subcategory =
            autoClass.suggestedLabel || lib.generateLabelFromDescription(description);
          return {
            field: "category",
            picker: null,
            prompt: `[FIELD_REQUEST:category]Parece ser **${intuitiveName}**. Confirma? (sim/não, ou diga outro tipo)`,
          };
        } else {
          const alreadyAskedCategory = fields._asked_category === true;

          if (alreadyAskedCategory) {
            fields.category = "outro";
            fields.subcategory = lib.generateLabelFromDescription(description);
            fields._fallback_category = true;
            console.log("[getNextMissingField] Fallback to outro with label:", fields.subcategory);
          } else {
            fields._asked_category = true;
            return {
              field: "category",
              picker: null,
              prompt:
                "Qual **tema** melhor descreve seu relato? (iluminação, buraco na via, **pavimentação/recape**, **sinalização** (semáforo/placa/faixa), **drenagem**/água pluvial/sarjeta, esgoto, lixo, barulho, praça/área verde, ou descreva com suas palavras)",
            };
          }
        }
      }
    }

    if (fields.category && !fields.subcategory) {
      if (fields._pending_subcategory) {
        fields.subcategory = fields._pending_subcategory;
        delete fields._pending_subcategory;
      } else {
        const autoClass = lib.autoClassifyCategory(String(fields.description ?? ""));
        fields.subcategory =
          autoClass.suggestedLabel || lib.generateLabelFromDescription(String(fields.description ?? ""));
      }
      console.log("[getNextMissingField] Set subcategory:", fields.subcategory);
    }

    if (lib.urbanNatureSkipsLocationCollection(natureStr)) {
      console.log("[getNextMissingField] Urban non-complaint nature: skipping location/risk collection");
      return { field: null, picker: null, prompt: null };
    }

    if (!fields.location_method) {
      return {
        field: "location_method",
        picker: "[LOCATION_METHOD_PICKER]",
        prompt:
          "Como você quer informar **onde fica** o problema?\n\nToque em **Usar minha localização (GPS)** abaixo, ou escolha **endereço cadastrado** / **digitar CEP ou endereço**.",
      };
    }
    if (fields.location_method === "gps" && (fields.user_lat == null || fields.user_lon == null)) {
      return {
        field: "gps_coords",
        picker: "[LOCATION_METHOD_PICKER]",
        prompt:
          "Preciso da sua posição: use **Usar minha localização (GPS)** abaixo e permita o acesso no navegador (e no celular, se pedir).",
      };
    }
    if (fields.location_method === "registered_address" && userIdForAddress) {
      const cepDigitsPre = fields.cep ? String(fields.cep).replace(/\D/g, "") : "";
      const hasLocPre = cepDigitsPre.length === 8 || (!!fields.street && !!fields.neighborhood);
      if (!hasLocPre) {
        const { data: addrRows } = await supabaseClient
          .from("user_addresses")
          .select("street, number, neighborhood, city, zip_code, is_primary")
          .eq("user_id", userIdForAddress)
          .order("is_primary", { ascending: false })
          .limit(1);
        const addr = addrRows?.[0] as
          | { street?: string; number?: string; neighborhood?: string; city?: string; zip_code?: string }
          | undefined;
        if (addr?.street && addr.neighborhood) {
          fields.street = addr.street;
          fields.street_number = addr.number || "";
          fields.neighborhood = addr.neighborhood;
          fields.city = addr.city || fields.city;
          const z = String(addr.zip_code || "").replace(/\D/g, "");
          if (z.length === 8) fields.cep = z;
          fields._location_from_user_profile = true;
          console.log("[getNextMissingField] Urban: filled location from user_addresses");
        } else {
          return {
            field: "cep",
            picker: "[ADDRESS_PICKER]",
            prompt:
              "Não há **endereço cadastrado** no seu perfil (ou está incompleto). Qual o **CEP** do local do problema?\n\n_Se não souber, me diz a rua e bairro._",
          };
        }
      }
    }
    if (fields.location_method === "gps") {
      const ulat = fields.user_lat != null ? Number(fields.user_lat) : NaN;
      const ulon = fields.user_lon != null ? Number(fields.user_lon) : NaN;
      if (Number.isFinite(ulat) && Number.isFinite(ulon)) {
        const cepDigitsG = fields.cep ? String(fields.cep).replace(/\D/g, "") : "";
        const hasLocG = cepDigitsG.length === 8 || (!!fields.street && !!fields.neighborhood);
        if (!hasLocG) {
          const rev = await lib.reverseGeocodeLatLon(ulat, ulon);
          if (rev) {
            const parts = rev.split(",").map((s: string) => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
              fields.street = parts[0].slice(0, 200);
              fields.neighborhood = parts[1].slice(0, 120);
            } else {
              fields.street = rev.slice(0, 200);
              fields.neighborhood = "Referência GPS";
            }
          } else {
            fields.street = "Local informado por GPS";
            fields.neighborhood = "Aproximação por coordenadas";
          }
          if (!fields.city) fields.city = "São Paulo";
          console.log(
            "[getNextMissingField] Urban: reverse geocode GPS →",
            fields.street,
            "|",
            fields.neighborhood,
          );
        }
      }
    }

    const cepDigits = fields.cep ? String(fields.cep).replace(/\D/g, "") : "";
    const hasLocationViaCep = cepDigits.length === 8;
    const hasLocationViaAddress = !!fields.street && !!fields.neighborhood;
    const hasResolvedLocation = hasLocationViaCep || hasLocationViaAddress;

    const city = typeof fields.city === "string" ? fields.city.trim() : undefined;
    if (hasResolvedLocation && city && !lib.isCitySaoPaulo(city)) {
      return { field: null, picker: null, prompt: lib.MESSAGE_OUTSIDE_SAO_PAULO(city) };
    }

    if (!hasResolvedLocation) {
      if (fields.street && !fields.neighborhood) {
        return { field: "neighborhood", picker: null, prompt: "Em qual **bairro** fica essa rua?" };
      }
      if (fields.neighborhood && !fields.street) {
        return { field: "street", picker: "[ADDRESS_PICKER]", prompt: "Qual o **nome da rua**?" };
      }
      const cepPrompt =
        fields.location_method === "registered_address"
          ? "Não encontrei endereço no seu **perfil**. Informe o **CEP** ou a rua e o bairro do local.\n\n_Se não souber o CEP, me diz a rua e bairro._"
          : "Qual o **CEP** do local?\n\n_Se não souber, me diz a rua e bairro._";
      return { field: "cep", picker: "[ADDRESS_PICKER]", prompt: `[FIELD_REQUEST:cep]${cepPrompt}` };
    }

    if (
      fields.location_method === "registered_address" &&
      fields._location_from_user_profile === true &&
      !fields.urban_registered_address_ack &&
      hasLocationViaAddress
    ) {
      const st = String(fields.street || "").trim();
      const nb = String(fields.neighborhood || "").trim();
      const numRaw = fields.street_number != null ? String(fields.street_number).trim() : "";
      const num = numRaw ? `, ${numRaw}` : "";
      const cityPart = fields.city ? `, ${String(fields.city).trim()}` : "";
      const cepRaw = fields.cep ? String(fields.cep).replace(/\D/g, "") : "";
      const cepFmt = cepRaw.length === 8 ? `${cepRaw.slice(0, 5)}-${cepRaw.slice(5)}` : "";
      const cepPart = cepFmt ? ` — CEP ${cepFmt}` : "";
      const line = `**${st}${num}**, ${nb}${cityPart}${cepPart}`;
      return {
        field: "urban_registered_address_ack",
        picker: null,
        prompt:
          `Encontrei este **endereço no seu perfil**:\n\n📍 ${line}\n\n**O problema é neste local?** Responda **sim** para continuar ou **não** para informar outro CEP ou endereço.`,
      };
    }

    if (!fields.street_number && !fields.reference_point) {
      return {
        field: "street_number",
        picker: null,
        prompt: "Qual o **número** ou **ponto de referência** próximo?",
      };
    }

    if (lib.URBAN_RISK_COLLECTION_CATEGORIES.includes(String(fields.category || ""))) {
      if (!fields.risk_level) {
        const inferText = `${String(fields.description ?? "")} ${fields.subcategory || ""}`.trim();
        const inferred = inferText.length >= 4
          ? lib.autoInferRisk(inferText)
          : { risk_level: null as string | null, confidence: 0, risk_types: [] as string[] };
        if (inferred.risk_level != null && inferred.confidence >= 0.4) {
          fields.risk_level = inferred.risk_level;
          if (inferred.risk_types?.length) fields.risk_types = inferred.risk_types;
          fields._risk_auto_inferred = true;
          console.log(
            "[getNextMissingField] Auto-inferred risk_level:",
            inferred.risk_level,
            "confidence:",
            inferred.confidence,
          );
        } else {
          fields.risk_level = "low";
          fields._risk_default_low = true;
          console.log(
            "[getNextMissingField] No risk patterns matched; defaulting risk_level to 'low' (avoids redundant question; user can adjust via correction menu)",
          );
        }
      }
      if (!fields.affected_scope) {
        return {
          field: "affected_scope",
          picker: null,
          prompt:
            "[FIELD_REQUEST:affected_scope]Isso está afetando **só você**, **toda a rua** ou **o bairro todo**?[QUICK_REPLY:somente eu,toda a rua,bairro todo]",
        };
      }
    }

    return { field: null, picker: null, prompt: null };
  }

  if (collectionType === "transport_report") {
    const description = String(fields.description ?? "");
    const isGeneric = lib.isGenericIntentText(description);
    const descToCheck = isGeneric ? "" : description;
    const isValidDesc = lib.isValidDomainDescription(descToCheck, "transport");

    console.log("[getNextMissingField] Transport description check:", {
      description: description.substring(0, 40),
      isGeneric,
      isValidDesc,
    });

    if (!isValidDesc) {
      return { field: "description", picker: null, prompt: "**O que aconteceu?** Me conta o problema." };
    }

    if (!fields.report_type) {
      const transportFeedback = await lib.getClassificationFromFeedback(
        classificationFeedbackReadClient,
        description,
        "transport",
      );
      const validTransportTypes = [
        "atraso",
        "lotacao",
        "seguranca",
        "acessibilidade",
        "limpeza",
        "conducao",
        "outro",
      ] as const;
      if (
        transportFeedback?.category &&
        (validTransportTypes as readonly string[]).includes(transportFeedback.category)
      ) {
        fields.report_type = transportFeedback.category;
        if (transportFeedback.subcategory) {
          fields.subcategory_label = transportFeedback.subcategory;
        }
        fields._from_classification_feedback = true;
        fields._transport_classification_route = "feedback_loop";
        console.log(
          "[getNextMissingField] Transport report_type from classification feedback:",
          fields.report_type,
          transportFeedback.subcategory,
        );
      }
    }

    if (!fields.report_type) {
      const fuzzyInferredType = lib.inferTransportTypeFromText(description);
      if (fuzzyInferredType) {
        fields.report_type = fuzzyInferredType;
        fields._transport_classification_route = "fuzzy_text";
        console.log("[getNextMissingField] Fuzzy-inferred transport report_type:", fields.report_type);
      } else {
        const inferredFields = lib.extractTransportFields(description.toLowerCase());
        if (inferredFields.report_type) {
          fields.report_type = inferredFields.report_type;
          fields._transport_classification_route = "keyword_extract";
          console.log("[getNextMissingField] Auto-inferred transport report_type:", fields.report_type);
        } else {
          fields.report_type = "outro";
          fields._fallback_report_type = true;
          fields._transport_classification_route = "fallback_outro";
          console.log("[getNextMissingField] Fallback transport report_type to outro");
        }
      }
    }

    const reportTypeForSub = String(fields.report_type || "outro").toLowerCase();
    const subTrimmed =
      fields.sub_category != null && String(fields.sub_category).trim() !== ""
        ? String(fields.sub_category).trim()
        : "";
    if (!subTrimmed || !lib.isValidTransportSubcategory(reportTypeForSub, subTrimmed)) {
      return {
        field: "sub_category",
        picker: `[SUBCATEGORY_PICKER:${reportTypeForSub}]`,
        prompt: "Qual detalhe descreve melhor esse problema?",
      };
    }

    if (!fields.line_code && fields.line_id) {
      const lid = String(fields.line_id).trim();
      const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lid);
      if (uuidOk) {
        const { data: tlRow } = await supabaseClient
          .from("transport_lines")
          .select("line_code")
          .eq("id", lid)
          .maybeSingle();
        if (tlRow?.line_code) {
          fields.line_code = String(tlRow.line_code).trim();
          console.log(
            "[getNextMissingField] Hydrated line_code from transport_lines by line_id:",
            fields.line_code,
          );
        }
      }
    }
    if (!fields.line_code && !fields.line_id) {
      return {
        field: "line_code",
        picker: "[LINE_PICKER]",
        prompt: "Qual **linha ou estação** teve o problema?",
      };
    }

    if (!fields.stop_name) {
      return {
        field: "stop_name",
        picker: null,
        prompt: "Qual foi a **parada, ponto, terminal ou estação** específicos onde isso aconteceu?",
      };
    }

    if (!fields.stop_location) {
      return {
        field: "stop_location",
        picker: null,
        prompt:
          "Qual o **endereço, cruzamento ou referência** desse ponto? Se preferir, você também pode informar coordenadas `lat,lng`.",
      };
    }

    if (!fields.occurrence_date) {
      return {
        field: "occurrence_date",
        picker: "[DATE_PICKER]",
        prompt: "**Quando isso aconteceu?** (hoje, ontem, ou me diz a data)",
      };
    }

    if (!fields.occurrence_time) {
      return {
        field: "occurrence_time",
        picker: "[TIME_PICKER]",
        prompt: "Qual foi o **horário exato** da ocorrência?",
      };
    }

    if (!fields.direction) {
      return {
        field: "direction",
        picker: "[DIRECTION_PICKER]",
        prompt: "Qual era o **sentido** da viagem?",
      };
    }

    if (!fields.recurrence_frequency) {
      return {
        field: "recurrence_frequency",
        picker: "[RECURRENCE_FREQUENCY_PICKER]",
        prompt: "Com qual frequência isso acontece?",
      };
    }

    if (fields.personal_impact == null || fields.personal_impact === "") {
      return {
        field: "personal_impact",
        picker: "[IMPACT_PICKER]",
        prompt: "Como isso afetou **sua rotina**?",
      };
    }

    if (
      String(fields.report_type || "").toLowerCase() === "acessibilidade" &&
      !hasTransportAccessibilityDetails(fields.accessibility_details)
    ) {
      return {
        field: "accessibility_details",
        picker: "[ACCESSIBILITY_CHECKLIST]",
        prompt:
          "Para detalhar a ocorrência, marque o **checklist de acessibilidade** abaixo (rampa, elevador, piso tátil, apoio para embarque) e complemente se necessário.",
      };
    }

    return { field: null, picker: null, prompt: null };
  }

  if (collectionType === "service_rating") {
    if (fields.service_neighborhood != null && String(fields.service_neighborhood).trim() !== "") {
      fields.service_neighborhood = lib.normalizeServiceRatingNeighborhood(fields.service_neighborhood);
    }

    if (fields.visit_id) {
      const legacyFourDims =
        "tempo_espera_score" in fields &&
        "atendimento_score" in fields &&
        "infraestrutura_score" in fields &&
        "limpeza_score" in fields;
      const dimsComplete = lib.isCompleteServiceRatingDimensions(fields.rating_dimensions) || legacyFourDims;
      if (!dimsComplete) {
        return {
          field: "rating_dimensions",
          picker: "[MULTI_DIMENSION_RATING_PICKER]",
          prompt:
            "**Avalie em quatro aspectos** (1 a 5 estrelas cada): tempo de espera, atendimento, infraestrutura e limpeza. Use o formulário abaixo.",
        };
      }
      if (!fields._rating_text_skipped) {
        if (fields.rating_text === undefined) {
          return {
            field: "rating_text",
            picker: null,
            prompt:
              'Você tem alguma **sugestão de melhoria** ou quer deixar um comentário extra? (Digite abaixo ou diga "pular")',
          };
        }
        if (
          typeof fields.rating_text === "string" &&
          fields.rating_text.length > 0 &&
          fields.rating_text.length < 5
        ) {
          return {
            field: "rating_text",
            picker: null,
            prompt:
              'Sua sugestão é um pouco curta. Pode detalhar um pouco mais? (Mín. 5 letras ou diga "pular")',
          };
        }
      }
      return { field: null, picker: null, prompt: null };
    }

    let effectiveNeighborhood = String(fields.service_neighborhood || "").trim();
    if (!effectiveNeighborhood && fields.service_name) {
      const inferred = lib.inferServiceRatingNeighborhoodFromCompositeName(
        fields.service_name,
        String(fields.service_type),
      );
      if (inferred) effectiveNeighborhood = inferred;
    }

    if (!fields.service_type) {
      return {
        field: "service_type",
        picker: "[SERVICE_TYPE_PICKER]",
        prompt: "Qual **tipo de serviço** você quer avaliar? (UBS, escola, hospital, CEU...)",
      };
    }

    if (!effectiveNeighborhood && !fields.service_address) {
      return {
        field: "service_neighborhood",
        picker: null,
        prompt: lib.buildServiceRatingBairroPrompt(String(fields.service_type)),
      };
    }

    const nounPt = lib.getServiceRatingNounPt(String(fields.service_type));
    const sn = String(fields.service_name || "").trim();
    const neighStr = effectiveNeighborhood;
    const genericAddr = neighStr ? `${nounPt} - ${neighStr}` : "";
    const isGenericName =
      !!genericAddr &&
      !!sn &&
      lib.normalizeGenericServiceRatingName(sn) === lib.normalizeGenericServiceRatingName(genericAddr);
    const snLower = sn.toLowerCase();
    const isJustTypeLabel =
      !!sn &&
      (snLower === "ceu" ||
        snLower === "ubs" ||
        snLower === nounPt.toLowerCase() ||
        snLower === "hospital" ||
        snLower === "biblioteca" ||
        snLower === "escola");
    const isTypeOnlyEquipment = lib.isServiceRatingTypeOnlyEquipmentName(
      fields.service_name,
      String(fields.service_type),
    );
    if (
      !fields.service_name ||
      String(fields.service_name).length < 3 ||
      isGenericName ||
      isJustTypeLabel ||
      isTypeOnlyEquipment
    ) {
      const labelQual = fields.service_type === "ceu"
        ? "CEU"
        : fields.service_type === "ubs"
        ? "UBS"
        : nounPt;
      const districtHint = neighStr ? ` em **${neighStr}**` : "";
      const typeParam = fields.service_type ? ":type=" + encodeURIComponent(String(fields.service_type)) : "";
      const districtParam = neighStr ? ":district=" + encodeURIComponent(neighStr) : "";
      const hideRatedParam = ":hideRatedToday=1";
      return {
        field: "service_name",
        picker: `[SERVICE_PICKER${districtParam}${typeParam}${hideRatedParam}]`,
        prompt: `Qual **${labelQual}** você visitou${districtHint}? Selecione na lista abaixo.`,
      };
    }

    if (fields.service_address_confirmed === undefined) {
      const serviceTypeLabel: Record<string, string> = {
        ubs: "UBS",
        school: "escola",
        hospital: "hospital",
        ceu: "CEU",
        library: "biblioteca",
        sports_center: "centro esportivo",
      };
      const stKey = String(fields.service_type ?? "");
      const typeLabel = serviceTypeLabel[stKey] || stKey;

      const nameStr = String(fields.service_name ?? "");
      const neighForAddr = String(fields.service_neighborhood || "").trim() || effectiveNeighborhood;
      const nameHasNeigh = neighForAddr && nameStr.toLowerCase().includes(neighForAddr.toLowerCase());
      const address = fields.service_address ||
        (nameStr ? (nameHasNeigh ? nameStr : neighForAddr ? `${nameStr} - ${neighForAddr}` : nameStr) : null);

      if (address) {
        return {
          field: "service_address_confirmed",
          picker: `[SERVICE_ADDRESS_CONFIRM:${address}]`,
          prompt: `O serviço fica em **${address}**. Está correto? (sim/não)`,
        };
      }
    }

    if (fields.service_address_confirmed === false && !fields.service_neighborhood) {
      const serviceTypeLabel: Record<string, string> = {
        ubs: "UBS",
        school: "escola",
        hospital: "hospital",
        ceu: "CEU",
        library: "biblioteca",
        sports_center: "centro esportivo",
      };
      const stKey2 = String(fields.service_type ?? "");
      const typeLabel = serviceTypeLabel[stKey2] || "serviço";
      return {
        field: "service_neighborhood",
        picker: null,
        prompt: `Ok, qual o **bairro** correto onde fica a ${typeLabel}?`,
      };
    }

    if (fields._needs_address_reconfirm && fields.service_neighborhood && !fields._address_reconfirmed) {
      const address = fields.service_address || `${fields.service_name} - ${fields.service_neighborhood}`;
      return {
        field: "service_address_reconfirm",
        picker: `[SERVICE_ADDRESS_CONFIRM:${address}]`,
        prompt: `Então é **${address}**. Correto?`,
      };
    }

    const legacyFourDimsFree =
      "tempo_espera_score" in fields &&
      "atendimento_score" in fields &&
      "infraestrutura_score" in fields &&
      "limpeza_score" in fields;
    const dimsCompleteFree =
      lib.isCompleteServiceRatingDimensions(fields.rating_dimensions) || legacyFourDimsFree;
    if (!dimsCompleteFree) {
      return {
        field: "rating_dimensions",
        picker: "[MULTI_DIMENSION_RATING_PICKER]",
        prompt: lib.buildServiceRatingDimensionsPrompt(String(fields.service_type || "")),
      };
    }

    if (!fields._rating_text_skipped) {
      if (fields.rating_text === undefined) {
        return {
          field: "rating_text",
          picker: null,
          prompt:
            'Você tem alguma **sugestão de melhoria** ou quer deixar um comentário extra? (Digite abaixo ou diga "pular")',
        };
      }
      if (
        typeof fields.rating_text === "string" &&
        fields.rating_text.length > 0 &&
        fields.rating_text.length < 5
      ) {
        return {
          field: "rating_text",
          picker: null,
          prompt:
            'Sua sugestão é um pouco curta. Pode detalhar um pouco mais? (Mín. 5 letras ou diga "pular")',
        };
      }
    }

    return { field: null, picker: null, prompt: null };
  }

  if (collectionType === "services") {
    if (!fields.location_method) {
      return {
        field: "location_method",
        picker: "[LOCATION_METHOD_PICKER]",
        prompt:
          "[FIELD_REQUEST:location_method]Como você quer informar sua localização para buscar serviços próximos?",
      };
    }
    if (fields.location_method === "manual") {
      const hasCep = !!(fields.cep && String(fields.cep).replace(/\D/g, "").length === 8);
      const hasAddress = !!(fields.street && fields.neighborhood);
      if (!hasCep && !hasAddress) {
        return {
          field: "cep",
          picker: "[ADDRESS_PICKER]",
          prompt: "[FIELD_REQUEST:cep]Qual seu CEP ou endereço? (Digite o CEP ou a rua e o bairro.)",
        };
      }
      if (!fields.street_number && !fields.reference_point) {
        return {
          field: "street_number",
          picker: null,
          prompt:
            '[FIELD_REQUEST:street_number]Qual o **número** ou **ponto de referência** próximo? (Ex.: 100, 1477, próximo ao mercado). _Opcional: responda "pular" para continuar._',
        };
      }
    }
    if (fields.location_method === "gps" && (fields.user_lat == null || fields.user_lon == null)) {
      return {
        field: "gps_coords",
        picker: null,
        prompt:
          "[FIELD_REQUEST:gps_coords]Permita o acesso à sua localização no navegador (e no celular, se pedir). Depois confirme para continuar.",
      };
    }
    if (!fields.service_type) {
      return {
        field: "service_type",
        picker: "[SERVICE_TYPE_PICKER]",
        prompt:
          "[FIELD_REQUEST:service_type]Qual tipo de serviço você está procurando? (UBS, escola, hospital, CEU, biblioteca...)",
      };
    }
    return { field: null, picker: null, prompt: null };
  }

  return { field: null, picker: null, prompt: null };
}
