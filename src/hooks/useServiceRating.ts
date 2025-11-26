import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SubmitRatingParams {
  visitId: string;
  serviceId: string;
  ratingStars: number;
  ratingText?: string;
  sentiment?: "positive" | "neutral" | "negative";
  isAnonymous?: boolean;
}

interface CreateReferralParams {
  ratingId: string;
  councilMemberName: string;
  councilMemberParty?: string;
  notes?: string;
}

interface SubscribeServiceParams {
  serviceId: string;
}

export const useServiceRating = () => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const submitRating = async ({
    visitId,
    serviceId,
    ratingStars,
    ratingText,
    sentiment,
    isAnonymous = false,
  }: SubmitRatingParams) => {
    if (!user) {
      toast.error("Você precisa estar logado para avaliar");
      return null;
    }

    setSubmitting(true);

    try {
      // Insert rating
      const { data: rating, error: ratingError } = await supabase
        .from("service_ratings")
        .insert({
          visit_id: visitId,
          user_id: user.id,
          service_id: serviceId,
          rating_stars: ratingStars,
          rating_text: ratingText,
          sentiment: sentiment,
          is_anonymous: isAnonymous,
        })
        .select()
        .single();

      if (ratingError) throw ratingError;

      // Update visit status
      const { error: visitError } = await supabase
        .from("service_visits")
        .update({ status: "completed" })
        .eq("id", visitId);

      if (visitError) throw visitError;

      toast.success("Avaliação enviada com sucesso!");
      return rating;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao enviar avaliação";
      toast.error(errorMessage);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const createReferral = async ({
    ratingId,
    councilMemberName,
    councilMemberParty,
    notes,
  }: CreateReferralParams) => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("rating_referrals")
        .insert({
          rating_id: ratingId,
          user_id: user.id,
          council_member_name: councilMemberName,
          council_member_party: councilMemberParty,
          notes: notes,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Encaminhamento criado com sucesso!");
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao criar encaminhamento";
      toast.error(errorMessage);
      return null;
    }
  };

  const subscribeToService = async ({ serviceId }: SubscribeServiceParams) => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("service_subscriptions")
        .insert({
          user_id: user.id,
          service_id: serviceId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.info("Você já está inscrito para alertas deste serviço");
          return null;
        }
        throw error;
      }

      toast.success("Inscrito para receber alertas!");
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao inscrever para alertas";
      toast.error(errorMessage);
      return null;
    }
  };

  const recordVisit = async (serviceId: string) => {
    if (!user) return null;

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to complete rating

      const { data, error } = await supabase
        .from("service_visits")
        .insert({
          user_id: user.id,
          service_id: serviceId,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      console.error("Error recording visit:", err);
      return null;
    }
  };

  return {
    submitRating,
    createReferral,
    subscribeToService,
    recordVisit,
    submitting,
  };
};
