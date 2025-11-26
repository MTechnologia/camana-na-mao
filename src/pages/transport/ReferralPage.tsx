import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/page-header';
import FloatingNavbar from '@/components/FloatingNavbar';
import { CouncilMemberSuggestion } from '@/components/transport/CouncilMemberSuggestion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { vereadores } from '@/data/vereadores';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReferralPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    if (!reportId) return;

    try {
      const { data, error } = await supabase
        .from('transport_reports')
        .select('*, line:transport_lines(*)')
        .eq('id', reportId)
        .single();

      if (error) throw error;
      setReport(data);
    } catch (err) {
      console.error('Error loading report:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar relato',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForward = async (member: any) => {
    if (!reportId) return;

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('report_referrals').insert({
        report_id: reportId,
        user_id: user.id,
        council_member_name: member.name,
        council_member_party: member.party,
        reason: 'Atua na região e comissões relacionadas ao transporte',
      });

      if (error) throw error;

      toast({
        title: 'Relato encaminhado!',
        description: `Seu relato foi encaminhado para ${member.name}.`,
      });

      navigate('/transporte/meus-relatos');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao encaminhar',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Selecionar alguns vereadores para sugestão (mockado)
  const suggestedMembers = vereadores.slice(0, 3);

  return (
    <>
      <PageHeader title="Encaminhar Relato" backTo="/transporte/meus-relatos" />
      <div className="min-h-screen bg-gray-50 pt-[60px] pb-24">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-4 animate-fade-in">
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Vereadores sugeridos</h2>
                <p className="text-sm text-muted-foreground">
                  Baseado no problema relatado e na região da linha
                </p>
              </div>

              {suggestedMembers.map((member) => (
                <CouncilMemberSuggestion
                  key={member.id}
                  member={member}
                  reason="Atua na Comissão de Trânsito, Transporte, Atividade Econômica, Turismo, Lazer e Gastronomia"
                  onForward={() => handleForward(member)}
                />
              ))}
            </>
          )}
        </div>
      </div>
      <FloatingNavbar />
    </>
  );
}
