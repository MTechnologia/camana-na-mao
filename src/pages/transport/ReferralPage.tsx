import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/transporte/meus-relatos')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Encaminhar Relato</h1>
            <p className="text-xs text-muted-foreground">Escolha um vereador</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
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
  );
}
