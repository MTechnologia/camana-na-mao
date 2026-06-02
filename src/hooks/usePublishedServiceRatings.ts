import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PublishedServiceRatingRow = {
  id: string;
  rating_stars: number;
  rating_text: string | null;
  created_at: string | null;
  is_anonymous: boolean | null;
  user_id: string;
};

type UsePublishedServiceRatingsResult = {
  ratings: PublishedServiceRatingRow[];
  totalCount: number;
  loading: boolean;
  error: string | null;
};

/**
 * Avaliações publicadas de um equipamento, com paginação (ordem: mais recentes primeiro).
 * Respeita RLS: visitante vê só não anônimas publicadas; o autor vê também as próprias.
 */
export function usePublishedServiceRatings(
  serviceId: string | null,
  page: number,
  pageSize: number,
): UsePublishedServiceRatingsResult {
  const [ratings, setRatings] = useState<PublishedServiceRatingRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId || page < 1 || pageSize < 1) {
      setRatings([]);
      setTotalCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const {
        data,
        error: qError,
        count,
      } = await supabase
        .from("service_ratings")
        .select("id, rating_stars, rating_text, created_at, is_anonymous, user_id", {
          count: "exact",
        })
        .eq("service_id", serviceId)
        .eq("publication_status", "published")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (cancelled) return;

      if (qError) {
        setError(qError.message);
        setRatings([]);
        setTotalCount(0);
      } else {
        setRatings((data ?? []) as PublishedServiceRatingRow[]);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [serviceId, page, pageSize]);

  return { ratings, totalCount, loading, error };
}
