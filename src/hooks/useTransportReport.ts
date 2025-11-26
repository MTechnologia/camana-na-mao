import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportData {
  line_id?: string;
  line_code_custom?: string;
  report_type: string;
  severity: string;
  description?: string;
  occurrence_date: string;
  occurrence_time?: string;
  location?: string;
  impact_description?: string;
}

export const useTransportReport = () => {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const submitReport = async (reportData: ReportData) => {
    try {
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('transport_reports')
        .insert({
          ...reportData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Relato enviado!',
        description: 'Seu relato foi registrado com sucesso.',
      });

      return data;
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar relato',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const getMyReports = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('transport_reports')
      .select(`
        *,
        line:transport_lines(line_code, line_name, line_type)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  return { submitReport, getMyReports, submitting };
};
