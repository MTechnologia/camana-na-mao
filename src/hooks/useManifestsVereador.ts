import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useGabineteVereador } from '@/hooks/useGabineteVereador';

export interface GabineteManifestItem {
  referralId: string;
  referralStatus: string;
  manifestType: 'urban' | 'transport' | 'service';
  manifestId: string;
  title: string;
  description: string | null;
  manifestStatus: string | null;
  protocolCode: string | null;
  createdAt: string | null;
}

export const useManifestsVereador = () => {
  const { councilMemberId } = useGabineteVereador();
  const [items, setItems] = useState<GabineteManifestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchManifests = useCallback(async () => {
    if (!councilMemberId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: referrals, error } = await supabase
        .from('council_member_referrals')
        .select('id, status, urban_report_id, transport_report_id, service_rating_id')
        .eq('council_member_id', councilMemberId)
        .neq('status', 'resolved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const urbanIds = (referrals ?? []).flatMap((item) => (item.urban_report_id ? [item.urban_report_id] : []));
      const transportIds = (referrals ?? []).flatMap((item) => (item.transport_report_id ? [item.transport_report_id] : []));
      const serviceIds = (referrals ?? []).flatMap((item) => (item.service_rating_id ? [item.service_rating_id] : []));

      const [urbanResult, transportResult, serviceResult] = await Promise.all([
        urbanIds.length > 0
          ? supabase
              .from('urban_reports')
              .select('id, category, subcategory, description, status, protocol_code, created_at')
              .in('id', urbanIds)
          : Promise.resolve({ data: [], error: null }),
        transportIds.length > 0
          ? supabase
              .from('transport_reports')
              .select('id, report_type, sub_category, description, status, protocol_code, created_at')
              .in('id', transportIds)
          : Promise.resolve({ data: [], error: null }),
        serviceIds.length > 0
          ? supabase
              .from('service_ratings')
              .select('id, rating_stars, rating_text, publication_status, created_at')
              .in('id', serviceIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (urbanResult.error) throw urbanResult.error;
      if (transportResult.error) throw transportResult.error;
      if (serviceResult.error) throw serviceResult.error;

      const urbanById = new Map((urbanResult.data ?? []).map((item) => [item.id, item]));
      const transportById = new Map((transportResult.data ?? []).map((item) => [item.id, item]));
      const serviceById = new Map((serviceResult.data ?? []).map((item) => [item.id, item]));

      const merged = (referrals ?? []).flatMap<GabineteManifestItem>((referral) => {
        if (referral.urban_report_id) {
          const urban = urbanById.get(referral.urban_report_id);
          if (!urban) return [];
          return [{
            referralId: referral.id,
            referralStatus: referral.status,
            manifestType: 'urban',
            manifestId: urban.id,
            title: urban.subcategory || urban.category || 'Relato urbano',
            description: urban.description,
            manifestStatus: urban.status,
            protocolCode: urban.protocol_code,
            createdAt: urban.created_at,
          }];
        }

        if (referral.transport_report_id) {
          const transport = transportById.get(referral.transport_report_id);
          if (!transport) return [];
          return [{
            referralId: referral.id,
            referralStatus: referral.status,
            manifestType: 'transport',
            manifestId: transport.id,
            title: transport.sub_category || transport.report_type || 'Relato de transporte',
            description: transport.description,
            manifestStatus: transport.status,
            protocolCode: transport.protocol_code,
            createdAt: transport.created_at,
          }];
        }

        if (referral.service_rating_id) {
          const service = serviceById.get(referral.service_rating_id);
          if (!service) return [];
          return [{
            referralId: referral.id,
            referralStatus: referral.status,
            manifestType: 'service',
            manifestId: service.id,
            title: `Avaliação ${service.rating_stars} estrela(s)`,
            description: service.rating_text,
            manifestStatus: service.publication_status,
            protocolCode: null,
            createdAt: service.created_at,
          }];
        }

        return [];
      });

      setItems(merged);
    } catch (error) {
      console.error('Error fetching gabinete manifests:', error);
      toast({
        title: 'Erro ao carregar manifestações',
        description: 'Não foi possível buscar os itens em aberto do gabinete.',
        variant: 'destructive',
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [councilMemberId]);

  useEffect(() => {
    fetchManifests();
  }, [fetchManifests]);

  const counts = useMemo(
    () => ({
      total: items.length,
      urban: items.filter((item) => item.manifestType === 'urban').length,
      transport: items.filter((item) => item.manifestType === 'transport').length,
      service: items.filter((item) => item.manifestType === 'service').length,
    }),
    [items],
  );

  return {
    items,
    loading,
    counts,
    refetch: fetchManifests,
  };
};
