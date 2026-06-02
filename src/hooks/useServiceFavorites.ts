import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { withPoolRetry } from "@/lib/supabaseRetry";

export type ServiceFavoriteRow = Database["public"]["Tables"]["service_favorites"]["Row"];

export type FavoriteWithService = ServiceFavoriteRow & {
  public_services: {
    id: string;
    name: string;
    address: string;
    district: string;
    service_type: string;
    latitude: number;
    longitude: number;
    phone: string | null;
    average_rating: number | null;
    total_ratings: number | null;
    operational_status: Database["public"]["Enums"]["operational_status"] | null;
  } | null;
};

/** IDs favoritados do usuário (uma query; útil para listas com muitos cards). */
export function useFavoriteServiceIds() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user?.id) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await withPoolRetry(
      () => supabase.from("service_favorites").select("service_id").eq("user_id", user.id),
      { retries: 1, baseDelayMs: 700 },
    );
    if (error) {
      console.error("[useFavoriteServiceIds]", error);
      setFavoriteIds(new Set());
    } else {
      setFavoriteIds(new Set((data ?? []).map((r) => r.service_id)));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const toggleFavorite = useCallback(
    async (serviceId: string): Promise<boolean> => {
      if (!user?.id) return false;
      const isOn = favoriteIds.has(serviceId);
      if (isOn) {
        const { error } = await supabase
          .from("service_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("service_id", serviceId);
        if (error) {
          console.error(error);
          toast.error("Não foi possível remover dos favoritos.");
          return false;
        }
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(serviceId);
          return next;
        });
        toast.success("Removido dos favoritos");
      } else {
        const { error } = await supabase.from("service_favorites").insert({
          user_id: user.id,
          service_id: serviceId,
        });
        if (error) {
          console.error(error);
          toast.error("Não foi possível adicionar aos favoritos.");
          return false;
        }
        setFavoriteIds((prev) => new Set(prev).add(serviceId));
        toast.success("Salvo em Meus Favoritos");
      }
      return true;
    },
    [user?.id, favoriteIds],
  );

  return {
    favoriteIds,
    loading,
    refetch,
    toggleFavorite,
    isFavorite: (id: string) => favoriteIds.has(id),
  };
}

/** Estado de favorito para um único equipamento (detalhe do serviço). */
export function useSingleServiceFavorite(serviceId: string | null) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || !serviceId) {
      setIsFavorite(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void supabase
      .from("service_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("service_id", serviceId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[useSingleServiceFavorite]", error);
          setIsFavorite(false);
        } else {
          setIsFavorite(!!data);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, serviceId]);

  const toggleFavorite = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !serviceId) return false;
    const next = !isFavorite;
    if (next) {
      const { error } = await supabase.from("service_favorites").insert({
        user_id: user.id,
        service_id: serviceId,
      });
      if (error) {
        console.error(error);
        toast.error("Não foi possível adicionar aos favoritos.");
        return false;
      }
      setIsFavorite(true);
      toast.success("Salvo em Meus Favoritos");
    } else {
      const { error } = await supabase
        .from("service_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("service_id", serviceId);
      if (error) {
        console.error(error);
        toast.error("Não foi possível remover dos favoritos.");
        return false;
      }
      setIsFavorite(false);
      toast.success("Removido dos favoritos");
    }
    return true;
  }, [user?.id, serviceId, isFavorite]);

  return { isFavorite, loading, toggleFavorite };
}

export function useMyFavoritesList() {
  const { user } = useAuth();
  const [items, setItems] = useState<FavoriteWithService[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("service_favorites")
      .select(
        `
        *,
        public_services (
          id, name, address, district, service_type,
          latitude, longitude, phone, average_rating, total_ratings, operational_status
        )
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[useMyFavoritesList]", error);
      setItems([]);
      toast.error("Não foi possível carregar seus favoritos.");
    } else {
      setItems((data ?? []) as FavoriteWithService[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const removeFavorite = useCallback(
    async (serviceId: string) => {
      if (!user?.id) return false;
      const { error } = await supabase
        .from("service_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("service_id", serviceId);
      if (error) {
        toast.error("Não foi possível remover.");
        return false;
      }
      setItems((prev) => prev.filter((r) => r.service_id !== serviceId));
      toast.success("Removido dos favoritos");
      return true;
    },
    [user?.id],
  );

  return { items, loading, refetch, removeFavorite };
}
