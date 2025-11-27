import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Referral {
  id: string;
  council_member_id: string;
  council_member_name: string;
  council_member_party: string | null;
  match_score: number | null;
  match_reasons: string[] | null;
  citizen_message: string | null;
  status: string;
  response_text: string | null;
  transport_report_id: string | null;
  urban_report_id: string | null;
  service_rating_id: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  user_id: string;
}

interface ReferralKPIs {
  total: number;
  pending: number;
  sent: number;
  acknowledged: number;
  resolved: number;
}

export const useReferralsAdmin = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [kpis, setKpis] = useState<ReferralKPIs>({
    total: 0,
    pending: 0,
    sent: 0,
    acknowledged: 0,
    resolved: 0,
  });

  const fetchKPIs = useCallback(async () => {
    try {
      const { count: total } = await supabase
        .from('council_member_referrals')
        .select('*', { count: 'exact', head: true });

      const { count: pending } = await supabase
        .from('council_member_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: sent } = await supabase
        .from('council_member_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent');

      const { count: acknowledged } = await supabase
        .from('council_member_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'acknowledged');

      const { count: resolved } = await supabase
        .from('council_member_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      setKpis({
        total: total || 0,
        pending: pending || 0,
        sent: sent || 0,
        acknowledged: acknowledged || 0,
        resolved: resolved || 0,
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  }, []);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('council_member_referrals')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter === 'transport') {
        query = query.not('transport_report_id', 'is', null);
      } else if (typeFilter === 'urban') {
        query = query.not('urban_report_id', 'is', null);
      } else if (typeFilter === 'service') {
        query = query.not('service_rating_id', 'is', null);
      }

      if (searchTerm) {
        query = query.or(`council_member_name.ilike.%${searchTerm}%,citizen_message.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setReferrals(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast({
        title: 'Erro ao carregar encaminhamentos',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, typeFilter, searchTerm]);

  const updateReferralStatus = async (id: string, status: string) => {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      
      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString();
      } else if (status === 'acknowledged') {
        updateData.acknowledged_at = new Date().toISOString();
      } else if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('council_member_referrals')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'O encaminhamento foi atualizado com sucesso.',
      });

      fetchReferrals();
      fetchKPIs();
    } catch (error) {
      console.error('Error updating referral:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o status.',
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
        title: 'Resposta adicionada',
        description: 'A resposta foi registrada com sucesso.',
      });

      fetchReferrals();
      fetchKPIs();
    } catch (error) {
      console.error('Error adding response:', error);
      toast({
        title: 'Erro ao adicionar resposta',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchReferrals();
    fetchKPIs();
  }, [fetchReferrals, fetchKPIs]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    referrals,
    loading,
    kpis,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    page,
    setPage,
    pageSize,
    totalCount,
    totalPages,
    updateReferralStatus,
    addResponse,
    refetch: fetchReferrals,
  };
};
