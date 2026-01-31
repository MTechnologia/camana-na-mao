import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Vereador } from '@/hooks/useVereadores';
import { useToast } from '@/hooks/use-toast';

interface ReportData {
  type: 'transport' | 'urban' | 'service';
  category?: string;
  description?: string;
  region?: string;
  severity?: string;
  report_type?: string;
  location?: string;
}

interface SuggestionResult {
  vereador: Vereador;
  matchScore: number;
  matchReasons: string[];
}

export const useCouncilMemberSuggestions = () => {
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getSuggestions = useCallback(async (reportData: ReportData) => {
    setLoading(true);
    try {
      // Fetch vereadores from Edge Function (backed by API + cache)
      const { data: vereadorData, error: vereadorError } = await supabase.functions.invoke('fetch-vereadores');
      
      if (vereadorError) {
        throw vereadorError;
      }
      
      const vereadores: Vereador[] = vereadorData?.vereadores || [];
      
      if (vereadores.length === 0) {
        throw new Error('Nenhum vereador disponível');
      }

      // Ensure we have a valid session before calling
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const { data, error } = await supabase.functions.invoke('suggest-council-members', {
        body: {
          reportData,
          vereadores: vereadores.map((v: Vereador) => ({
            id: v.id,
            name: v.name,
            party: v.party,
            region: v.region,
            initials: v.initials,
            photo: v.photo
          }))
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // Map back to full vereador objects
      const fullSuggestions: SuggestionResult[] = (data.suggestions || []).map((s: any) => ({
        vereador: vereadores.find((v: Vereador) => v.id === s.vereador.id) || s.vereador,
        matchScore: s.matchScore,
        matchReasons: s.matchReasons
      }));

      setSuggestions(fullSuggestions);
      return fullSuggestions;
    } catch (err) {
      console.error('Error getting suggestions:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar sugestões',
        description: 'Não foi possível carregar os vereadores. Tente novamente.'
      });
      
      setSuggestions([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const submitReferral = useCallback(async (params: {
    reportType: 'transport' | 'urban' | 'service';
    reportId: string;
    vereador: Vereador;
    matchScore: number;
    matchReasons: string[];
    citizenMessage?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const referralData: any = {
        user_id: user.id,
        council_member_id: params.vereador.id,
        council_member_name: params.vereador.name,
        council_member_party: params.vereador.party,
        match_score: params.matchScore,
        match_reasons: params.matchReasons,
        citizen_message: params.citizenMessage,
        status: 'pending'
      };

      // Set the appropriate foreign key based on report type
      if (params.reportType === 'transport') {
        referralData.transport_report_id = params.reportId;
      } else if (params.reportType === 'urban') {
        referralData.urban_report_id = params.reportId;
      } else if (params.reportType === 'service') {
        referralData.service_rating_id = params.reportId;
      }

      const { error } = await supabase
        .from('council_member_referrals')
        .insert(referralData);

      if (error) throw error;

      toast({
        title: 'Relato encaminhado!',
        description: `Seu relato foi encaminhado para ${params.vereador.name}.`
      });

      return true;
    } catch (err) {
      console.error('Error submitting referral:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao encaminhar',
        description: err instanceof Error ? err.message : 'Erro desconhecido'
      });
      return false;
    }
  }, [toast]);

  return {
    suggestions,
    loading,
    getSuggestions,
    submitReferral
  };
};
