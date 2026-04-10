import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logManualClassificationPrediction } from '@/lib/classificationPredictionLog';

interface ReportData {
  line_id?: string;
  line_code_custom?: string;
  report_type: string;
  severity?: string;
  description?: string;
  occurrence_date: string;
  occurrence_time?: string;
  location?: string;
  impact_description?: string;
  photos?: string[] | null;
}

export const useTransportReport = () => {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const submitReport = async (reportData: ReportData) => {
    try {
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const insertData = {
        ...reportData,
        severity: reportData.severity || 'pending',
        user_id: user.id,
        photos: Array.isArray(reportData.photos) && reportData.photos.length > 0 ? reportData.photos.slice(0, 3) : null,
      };
      if (insertData.line_id === '') {
        delete insertData.line_id;
      }
      const { data, error } = await supabase
        .from('transport_reports')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await logManualClassificationPrediction(supabase, {
        userId: user.id,
        reportId: data.id,
        reportType: 'transport',
        predictedCategory: reportData.report_type,
        predictedSubcategory: null,
      });

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
        id,
        protocol_code,
        line_id,
        line_code_custom,
        report_type,
        severity,
        description,
        occurrence_date,
        occurrence_time,
        location,
        impact_description,
        status,
        created_at,
        updated_at,
        n8n_processed,
        n8n_processed_at,
        n8n_priority,
        n8n_validated_category,
        n8n_tags,
        line:transport_lines(line_code, line_name, line_type)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  return { submitReport, getMyReports, submitting };
};
