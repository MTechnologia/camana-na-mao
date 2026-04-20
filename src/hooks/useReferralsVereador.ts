import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useGabineteVereador } from '@/hooks/useGabineteVereador';

type ReferralStatus = 'pending' | 'sent' | 'acknowledged' | 'resolved';
type ManifestType = 'urban' | 'transport' | 'service';

interface BaseReferral {
  id: string;
  council_member_id: string;
  council_member_name: string;
  council_member_party: string | null;
  citizen_message: string | null;
  status: string;
  response_text: string | null;
  transport_report_id: string | null;
  urban_report_id: string | null;
  service_rating_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  match_score: number | null;
  match_reasons: string[] | null;
}

export interface ReferralsVereadorItem extends BaseReferral {
  manifestType: ManifestType;
  manifestTitle: string;
  manifestDescription: string | null;
  manifestStatus: string | null;
  manifestProtocol: string | null;
}

interface ReferralKpis {
  total: number;
  pending: number;
  sent: number;
  acknowledged: number;
  resolved: number;
}

const emptyKpis: ReferralKpis = {
  total: 0,
  pending: 0,
  sent: 0,
  acknowledged: 0,
  resolved: 0,
};

export const useReferralsVereador = () => {
  const { councilMemberId } = useGabineteVereador();
  const [referrals, setReferrals] = useState<ReferralsVereadorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReferralStatus>('all');
  const [kpis, setKpis] = useState<ReferralKpis>(emptyKpis);

  const fetchReferrals = useCallback(async () => {
    if (!councilMemberId) {
      setReferrals([]);
      setKpis(emptyKpis);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let query = supabase
        .from('council_member_referrals')
        .select('*')
        .eq('council_member_id', councilMemberId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm.trim()) {
        query = query.or(
          `citizen_message.ilike.%${searchTerm}%,response_text.ilike.%${searchTerm}%,council_member_name.ilike.%${searchTerm}%`,
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      const baseRows = (data ?? []) as BaseReferral[];
      const urbanIds = baseRows.flatMap((item) => (item.urban_report_id ? [item.urban_report_id] : []));
      const transportIds = baseRows.flatMap((item) => (item.transport_report_id ? [item.transport_report_id] : []));
      const serviceIds = baseRows.flatMap((item) => (item.service_rating_id ? [item.service_rating_id] : []));

      const [urbanResult, transportResult, serviceResult] = await Promise.all([
        urbanIds.length > 0
          ? supabase
              .from('urban_reports')
              .select('id, category, subcategory, description, status, protocol_code')
              .in('id', urbanIds)
          : Promise.resolve({ data: [], error: null }),
        transportIds.length > 0
          ? supabase
              .from('transport_reports')
              .select('id, report_type, sub_category, description, status, protocol_code')
              .in('id', transportIds)
          : Promise.resolve({ data: [], error: null }),
        serviceIds.length > 0
          ? supabase
              .from('service_ratings')
              .select('id, rating_stars, rating_text, publication_status')
              .in('id', serviceIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (urbanResult.error) throw urbanResult.error;
      if (transportResult.error) throw transportResult.error;
      if (serviceResult.error) throw serviceResult.error;

      const urbanById = new Map((urbanResult.data ?? []).map((item) => [item.id, item]));
      const transportById = new Map((transportResult.data ?? []).map((item) => [item.id, item]));
      const serviceById = new Map((serviceResult.data ?? []).map((item) => [item.id, item]));

      const hydrated = baseRows.map<ReferralsVereadorItem>((item) => {
        if (item.urban_report_id) {
          const urban = urbanById.get(item.urban_report_id);
          return {
            ...item,
            manifestType: 'urban',
            manifestTitle: urban?.subcategory || urban?.category || 'Relato urbano',
            manifestDescription: urban?.description ?? item.citizen_message,
            manifestStatus: urban?.status ?? null,
            manifestProtocol: urban?.protocol_code ?? null,
          };
        }

        if (item.transport_report_id) {
          const transport = transportById.get(item.transport_report_id);
          return {
            ...item,
            manifestType: 'transport',
            manifestTitle: transport?.sub_category || transport?.report_type || 'Relato de transporte',
            manifestDescription: transport?.description ?? item.citizen_message,
            manifestStatus: transport?.status ?? null,
            manifestProtocol: transport?.protocol_code ?? null,
          };
        }

        const service = item.service_rating_id ? serviceById.get(item.service_rating_id) : null;
        return {
          ...item,
          manifestType: 'service',
          manifestTitle: service ? `Avaliação ${service.rating_stars} estrela(s)` : 'Avaliação de serviço',
          manifestDescription: service?.rating_text ?? item.citizen_message,
          manifestStatus: service?.publication_status ?? null,
          manifestProtocol: null,
        };
      });

      setReferrals(hydrated);
      setKpis({
        total: hydrated.length,
        pending: hydrated.filter((item) => item.status === 'pending').length,
        sent: hydrated.filter((item) => item.status === 'sent').length,
        acknowledged: hydrated.filter((item) => item.status === 'acknowledged').length,
        resolved: hydrated.filter((item) => item.status === 'resolved').length,
      });
    } catch (error) {
      console.error('Error fetching gabinete referrals:', error);
      toast({
        title: 'Erro ao carregar encaminhamentos do gabinete',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
      setReferrals([]);
      setKpis(emptyKpis);
    } finally {
      setLoading(false);
    }
  }, [councilMemberId, searchTerm, statusFilter]);

  const updateStatus = async (id: string, status: ReferralStatus) => {
    try {
      const payload: Record<string, string> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'sent') payload.sent_at = new Date().toISOString();
      if (status === 'acknowledged') payload.acknowledged_at = new Date().toISOString();
      if (status === 'resolved') payload.resolved_at = new Date().toISOString();

      const { error } = await supabase
        .from('council_member_referrals')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'O encaminhamento foi atualizado com sucesso.',
      });
      await fetchReferrals();
    } catch (error) {
      console.error('Error updating gabinete referral status:', error);
      toast({
        title: 'Erro ao atualizar encaminhamento',
        description: 'Não foi possível salvar o novo status.',
        variant: 'destructive',
      });
    }
  };

  const addResponse = async (id: string, responseText: string) => {
    try {
      const { error } = await supabase
        .from('council_member_referrals')
        .update({
          response_text: responseText,
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Resposta registrada',
        description: 'A resposta do gabinete foi salva com sucesso.',
      });
      await fetchReferrals();
    } catch (error) {
      console.error('Error saving gabinete response:', error);
      toast({
        title: 'Erro ao registrar resposta',
        description: 'Não foi possível salvar a resposta.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const openReferralsCount = useMemo(
    () => referrals.filter((item) => item.status !== 'resolved').length,
    [referrals],
  );

  return {
    referrals,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    kpis,
    openReferralsCount,
    updateStatus,
    addResponse,
    refetch: fetchReferrals,
  };
};
