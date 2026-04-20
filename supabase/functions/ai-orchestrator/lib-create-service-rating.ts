import { type SupabaseClient } from "@supabase/supabase-js";

type ToolResult = { success: boolean; message: string; data?: unknown };

type RatingDimensions = Record<string, number>;

type CreateServiceRatingDeps = {
  isCompleteServiceRatingDimensions: (value: unknown) => boolean;
  buildServiceRatingDimensionsFromWizardScores: (
    args: Record<string, unknown>,
    accumulatedFields?: Record<string, unknown>,
  ) => Record<string, number> | null;
  aggregateRatingDimensionsStars: (dimensions: Record<string, number>) => number;
  serviceRatingVisitDeadlineExpiredMessage: string;
  isVisitRatingWindowClosed: (createdAt: string, expiresAt: string, nowMs?: number) => boolean;
  getZonedDayUtcBoundsISO: (timeZone: string) => { startIso: string; endExclusiveIso: string };
  serviceRatingDedupTz: string;
  serviceRatingDuplicateDayMessage: string;
  inferServiceRatingSentimentFromMean: (meanStars: number) => string;
  shouldOfferServiceRatingReferral: (stars: number, dimensions?: Record<string, number> | null) => boolean;
};

function buildServiceRatingSuccessMessage(
  data: { id: string; publication_status?: string | null },
  serviceNameForMessage: string,
  stars: number,
  ratingTextTrimmed: string,
  ratingDimensionsJson: RatingDimensions | null,
  waitTimeStored: number | null | undefined,
  offerReferral: boolean,
): ToolResult {
  const publicationStatus = (data?.publication_status as string) || "published";
  const commentPreview = ratingTextTrimmed.substring(0, 80) + (ratingTextTrimmed.length > 80 ? "..." : "");
  const moderationNote =
    publicationStatus === "pending_review"
      ? "\n\n⏳ **Seu comentário passará por revisão** antes de aparecer publicamente para outros cidadãos. A nota já foi registrada."
      : "";
  const waitLine =
    waitTimeStored === undefined
      ? ""
      : waitTimeStored === null
        ? "\n⏱ **Tempo de espera:** Não se aplica"
        : `\n⏱ **Tempo de espera (faixa):** nota ${waitTimeStored}`;
  const dimLine = ratingDimensionsJson
    ? `\n📊 **Por dimensão:** Atendimento ${ratingDimensionsJson.atendimento}/5 · Limpeza ${ratingDimensionsJson.limpeza}/5 · Infraestrutura ${ratingDimensionsJson.infraestrutura}/5 · Tempo de espera ${ratingDimensionsJson.tempo_espera}/5`
    : "";
  const offerReferralLine = offerReferral
    ? "\n\n[OFFER_REFERRAL]Se quiser, posso orientá-lo a **encaminhar esta avaliação** a um vereador (manifestação sobre o serviço)."
    : "";

  return {
    success: true,
    message: `[RATING_CREATED:${data.id}]\n\n✅ **Avaliação registrada!**\n\n🏥 **Serviço:** ${serviceNameForMessage}\n⭐ **Nota geral (média):** ${"★".repeat(stars)}${"☆".repeat(5 - stars)}${dimLine}${waitLine}\n📝 **Comentário:** ${commentPreview}${moderationNote}\n\nObrigado pelo seu feedback! Ele ajuda a melhorar os serviços públicos.${offerReferralLine}\n\nPosso ajudar com mais alguma coisa?`,
    data: { id: data.id, type: "rating", publication_status: publicationStatus },
  };
}

export async function handleCreateServiceRating(
  args: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient,
  accumulatedFields: Record<string, unknown> | undefined,
  deps: CreateServiceRatingDeps,
): Promise<ToolResult> {
  const argsRec = args as Record<string, unknown>;
  let dimsMerged =
    (args.rating_dimensions && deps.isCompleteServiceRatingDimensions(args.rating_dimensions) ? args.rating_dimensions : null) ??
    (accumulatedFields?.rating_dimensions && deps.isCompleteServiceRatingDimensions(accumulatedFields.rating_dimensions)
      ? accumulatedFields.rating_dimensions
      : null);

  if (!dimsMerged) {
    const built = deps.buildServiceRatingDimensionsFromWizardScores(argsRec, accumulatedFields ?? undefined);
    if (built) dimsMerged = built;
  }

  let stars =
    typeof args.rating_stars === "number" && args.rating_stars >= 1 && args.rating_stars <= 5
      ? args.rating_stars
      : null;
  if (dimsMerged && typeof dimsMerged === "object") {
    stars = deps.aggregateRatingDimensionsStars(dimsMerged as Record<string, number>);
  }
  if (!stars || stars < 1 || stars > 5) {
    return {
      success: false,
      message: "[FIELD_REQUEST:rating_dimensions]**Avalie o serviço** nas quatro dimensões (1 a 5) antes de concluir.\n\n[MULTI_DIMENSION_RATING_PICKER]",
    };
  }

  const ratingDimensionsJson =
    dimsMerged && typeof dimsMerged === "object" ? (dimsMerged as RatingDimensions) : null;
  const isNegativeRating = deps.shouldOfferServiceRatingReferral(stars, ratingDimensionsJson);

  const ratingTextTrimmed = String(args.rating_text ?? "").trim();
  if (ratingTextTrimmed.length < 5) {
    return {
      success: false,
      message: "[FIELD_REQUEST:rating_text]**Pode descrever sua experiência?** Me conta como foi o atendimento. (mínimo 5 caracteres)",
    };
  }

  let serviceId: string | null = null;
  let visitId: string | null = null;
  let serviceNameForMessage = args.service_name || "";

  if (args.visit_id) {
    const { data: visitData, error: visitLoadError } = await supabase
      .from("service_visits")
      .select("id, service_id, created_at, expires_at, status")
      .eq("id", args.visit_id)
      .eq("user_id", userId)
      .single();

    if (visitLoadError || !visitData) {
      console.error("[create_service_rating] Visit not found or access denied:", args.visit_id);
      return { success: false, message: "Visita não encontrada. Tente acessar novamente pela notificação." };
    }

    const visitStatus = String(visitData.status || "");
    if (visitStatus === "completed") {
      return { success: false, message: "Esta visita já foi avaliada." };
    }
    if (visitStatus === "skipped") {
      return { success: false, message: "Esta visita não está mais disponível para avaliação." };
    }
    if (visitStatus === "expired") {
      return { success: false, message: deps.serviceRatingVisitDeadlineExpiredMessage };
    }

    const nowMs = Date.now();
    if (visitStatus === "pending" && deps.isVisitRatingWindowClosed(String(visitData.created_at), String(visitData.expires_at), nowMs)) {
      const { error: expireErr } = await supabase
        .from("service_visits")
        .update({ status: "expired", updated_at: new Date(nowMs).toISOString() })
        .eq("id", visitData.id)
        .eq("user_id", userId)
        .eq("status", "pending");
      if (expireErr) {
        console.warn("[create_service_rating] Could not mark visit expired:", expireErr.message);
      }
      return { success: false, message: deps.serviceRatingVisitDeadlineExpiredMessage };
    }

    if (visitStatus !== "pending") {
      return { success: false, message: "Esta visita não está mais disponível para avaliação." };
    }

    visitId = visitData.id;
    serviceId = visitData.service_id;
    serviceNameForMessage = args.service_name || accumulatedFields?.service_name || "serviço";
    console.log("[create_service_rating] Using existing visit:", visitId, "service:", serviceId);
  } else {
    if (!args.service_type) {
      return {
        success: false,
        message: "[FIELD_REQUEST:service_type]**Qual tipo de serviço** você quer avaliar? (UBS, escola, hospital, CEU, biblioteca, centro esportivo) [SERVICE_TYPE_PICKER]",
      };
    }
    const serviceNameCheck = String(args.service_name ?? "").trim();
    if (!serviceNameCheck || serviceNameCheck.length < 3) {
      return {
        success: false,
        message: "[FIELD_REQUEST:service_name]**Qual o nome** do serviço que você visitou? (ex: UBS Vila Madalena, EMEF João XXIII) [SERVICE_PICKER]",
      };
    }
    const addressConfirmed =
      args.service_address_confirmed ||
      accumulatedFields?.service_address_confirmed ||
      accumulatedFields?._address_reconfirmed;
    if (!addressConfirmed) {
      const address =
        args.service_address ||
        accumulatedFields?.service_address ||
        (accumulatedFields?.service_neighborhood
          ? `${args.service_name} - ${accumulatedFields.service_neighborhood}`
          : null) ||
        "Endereço não informado";
      return {
        success: false,
        message: `[FIELD_REQUEST:service_address_confirmed]O serviço fica em **${address}**. Está correto? [SERVICE_ADDRESS_CONFIRM:${address}]`,
      };
    }

    const serviceNameArg = (args.service_name as string || "").trim();
    const serviceTypeArg = (args.service_type as string || "").toLowerCase();
    const neighborhood = (args.service_neighborhood || accumulatedFields?.service_neighborhood) as string | undefined;

    const uuidFromPicker = (() => {
      const raw = [args.service_id, accumulatedFields?.service_id].find(
        (value) => typeof value === "string" && /^[a-f0-9-]{36}$/i.test(String(value).trim()),
      );
      return raw ? String(raw).trim().toLowerCase() : "";
    })();

    if (uuidFromPicker) {
      const { data: serviceById } = await supabase
        .from("public_services")
        .select("id, name")
        .eq("id", uuidFromPicker)
        .maybeSingle();
      if (serviceById?.id) {
        serviceId = serviceById.id;
        serviceNameForMessage = String(serviceById.name || "");
      }
    }

    const tryFindService = async (typeFilter: string | null, namePattern: string): Promise<{ id: string; name: string } | null> => {
      let query = supabase.from("public_services").select("id, name").ilike("name", namePattern).limit(5);
      if (typeFilter) {
        if (typeFilter === "hospital") {
          query = query.in("service_type", ["hospital", "other"] as string[]);
        } else {
          query = query.eq("service_type", typeFilter);
        }
      }
      const { data } = await query;
      return data?.length ? data[0] : null;
    };

    const tryFindByDistrict = async (namePart: string): Promise<{ id: string; name: string } | null> => {
      if (!neighborhood || namePart.length < 3) return null;
      const districtClean = neighborhood.split(/[-–—,]/)[0]?.trim().slice(0, 25);
      if (!districtClean) return null;
      const { data } = await supabase
        .from("public_services")
        .select("id, name")
        .ilike("name", `%${namePart}%`)
        .ilike("district", `%${districtClean}%`)
        .limit(3);
      return data?.length ? data[0] : null;
    };

    if (!serviceId) {
      const partsAfterDash = serviceNameArg.split(/\s*[-–—]\s*/);
      const distinctivePart = (partsAfterDash.length > 1 ? partsAfterDash[partsAfterDash.length - 1] : serviceNameArg).trim();

      let found = await tryFindService(serviceTypeArg, `%${serviceNameArg}%`);
      if (!found && distinctivePart.length >= 4) {
        found = await tryFindService(serviceTypeArg, `%${distinctivePart}%`) || await tryFindService(null, `%${distinctivePart}%`);
      }
      if (!found && serviceNameArg.length > 8) {
        const withoutPrefix = serviceNameArg.replace(/^(biblioteca|ubs|emef|hospital|centro|ceu)\s+(de\s+)?/i, "").trim();
        if (withoutPrefix.length >= 4) {
          found = await tryFindService(serviceTypeArg, `%${withoutPrefix}%`) || await tryFindService(null, `%${withoutPrefix}%`);
        }
      }
      if (!found && distinctivePart.length >= 4) {
        found = await tryFindByDistrict(distinctivePart);
      }
      if (!found) found = await tryFindService(null, `%${serviceNameArg}%`);
      if (!found && distinctivePart.length >= 4) {
        found = await tryFindService(null, `%${distinctivePart}%`);
      }
      if (!found && serviceTypeArg === "ceu") {
        found = await tryFindService("library", `%${serviceNameArg}%`) ||
          (distinctivePart.length >= 4 ? await tryFindService("library", `%${distinctivePart}%`) : null);
      }

      if (found) {
        serviceId = found.id;
        serviceNameForMessage = found.name;
      }
    }

    if (serviceId && !visitId) {
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      const { data: visitData, error: visitError } = await supabase
        .from("service_visits")
        .insert({
          user_id: userId,
          service_id: serviceId,
          expires_at: expires.toISOString(),
          status: "completed",
        })
        .select("id")
        .single();
      if (!visitError && visitData) visitId = visitData.id;
    }

    if (!serviceId || !visitId) {
      console.warn("[create_service_rating] Service not found in DB:", {
        serviceTypeArg,
        serviceNameArg,
        neighborhood,
        hadServiceIdFromPicker: Boolean(uuidFromPicker),
      });
      return {
        success: false,
        message: 'Não encontrei esse serviço na base cadastrada. Tente informar apenas o nome principal (ex: "CEU Rosa da China"). Se o serviço não estiver cadastrado, entre em contato com o suporte.',
      };
    }
  }

  if (!serviceId || !visitId) {
    return {
      success: false,
      message: 'Não encontrei esse serviço na base cadastrada. Tente informar apenas o nome principal (ex: "CEU Rosa da China"). Se o serviço não estiver cadastrado, entre em contato com o suporte.',
    };
  }

  const { startIso, endExclusiveIso } = deps.getZonedDayUtcBoundsISO(deps.serviceRatingDedupTz);
  const { data: existingToday, error: duplicateLookupError } = await supabase
    .from("service_ratings")
    .select("id")
    .eq("user_id", userId)
    .eq("service_id", serviceId)
    .gte("created_at", startIso)
    .lt("created_at", endExclusiveIso)
    .limit(1)
    .maybeSingle();

  if (duplicateLookupError) {
    console.warn("[create_service_rating] duplicate check error:", duplicateLookupError.message);
  } else if (existingToday) {
    return { success: false, message: deps.serviceRatingDuplicateDayMessage };
  }

  const { data: moderationStatus, error: moderationRpcError } = await supabase.rpc(
    "compute_service_rating_publication_status",
    { p_text: ratingTextTrimmed },
  );
  if (moderationRpcError) {
    console.warn("[create_service_rating] moderation RPC error:", moderationRpcError.message);
  }
  const preModeration =
    typeof moderationStatus === "string" && ["published", "pending_review", "rejected"].includes(moderationStatus)
      ? moderationStatus
      : null;
  if (preModeration === "rejected") {
    return {
      success: false,
      message: "[FIELD_REQUEST:rating_text]**Não foi possível enviar este comentário.** Remova links (http/https), evite palavrões ou insultos graves e tente de novo com um texto respeitoso sobre o atendimento.",
    };
  }

  let waitTimeStored: number | null | undefined;
  if (argsRec.wait_time_score !== undefined) {
    waitTimeStored = argsRec.wait_time_score as number | null;
  } else if (accumulatedFields && "wait_time_score" in accumulatedFields) {
    waitTimeStored = accumulatedFields.wait_time_score as number | null;
  } else {
    waitTimeStored = undefined;
  }

  console.log("[create_service_rating] Attempting to insert rating:", {
    userId,
    serviceId,
    visitId,
    rating_stars: stars,
    wait_time_score: waitTimeStored,
    moderation_preview: preModeration,
  });

  const sentimentFinal = deps.inferServiceRatingSentimentFromMean(stars);
  const insertRow: Record<string, unknown> = {
    user_id: userId,
    service_id: serviceId,
    visit_id: visitId,
    rating_stars: stars,
    rating_text: ratingTextTrimmed,
    sentiment: sentimentFinal,
  };
  if (ratingDimensionsJson) {
    insertRow.rating_dimensions = ratingDimensionsJson;
    insertRow.dimensions = ratingDimensionsJson;
  }
  if (waitTimeStored !== undefined) insertRow.wait_time_score = waitTimeStored;

  const { data, error } = await supabase
    .from("service_ratings")
    .insert(insertRow)
    .select("id, publication_status")
    .single();

  if (error) {
    console.error("[create_service_rating] Database insert error:", error.code, error.message, error.details);
    const errorText = String(error.message || "");
    const isDuplicatePerDay =
      String(error.code) === "23505" || errorText.includes("idx_one_rating_per_service_per_day");
    if (isDuplicatePerDay) {
      return { success: false, message: deps.serviceRatingDuplicateDayMessage };
    }
    return {
      success: false,
      message: "Não foi possível salvar sua avaliação no momento. Por favor, tente novamente. Se o problema continuar, entre em contato com o suporte.",
    };
  }

  const publicationStatus = (data?.publication_status as string) || "published";
  if (publicationStatus === "rejected") {
    const { error: deleteError } = await supabase.from("service_ratings").delete().eq("id", data.id);
    if (deleteError) console.warn("[create_service_rating] cleanup rejected row:", deleteError.message);
    return {
      success: false,
      message: "[FIELD_REQUEST:rating_text]**Não foi possível enviar este comentário.** Ajuste o texto (sem links, linguagem adequada) e envie novamente.",
    };
  }

  if (args.visit_id) {
    await supabase.from("service_visits").update({ status: "completed" }).eq("id", visitId);
  }

  if (isNegativeRating) {
    console.log("[create_service_rating] Negative rating eligible for in-app referral offer");
  }

  console.log("[create_service_rating] Rating saved successfully:", {
    id: data.id,
    publication_status: publicationStatus,
  });

  return buildServiceRatingSuccessMessage(
    data,
    String(serviceNameForMessage),
    stars,
    ratingTextTrimmed,
    ratingDimensionsJson,
    waitTimeStored,
    isNegativeRating,
  );
}
