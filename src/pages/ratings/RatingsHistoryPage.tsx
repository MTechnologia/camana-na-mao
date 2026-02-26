import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, Info, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { formatShortDate } from '@/lib/dateUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReferralDialog } from '@/components/referral/ReferralDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Rating {
  id: string;
  rating_stars: number;
  rating_text: string | null;
  sentiment: string | null;
  created_at: string;
  service_id: string;
  service?: {
    name: string;
    service_type: string;
    address: string;
    district: string;
  };
}

const serviceTypeLabels: Record<string, string> = {
  ubs: 'UBS',
  hospital: 'Hospital',
  school: 'Escola',
  ceu: 'CEU',
  library: 'Biblioteca',
  sports_center: 'Centro Esportivo',
  street_market: 'Feira',
  community_center: 'Centro Comunitário',
  daycare: 'Creche',
  park: 'Parque',
  social_assistance: 'Assistência Social',
  police_station: 'Delegacia',
  transit_station: 'Transporte',
  market: 'Mercado',
  theater: 'Teatro/Cinema',
  museum: 'Museu',
  cemetery: 'Cemitério',
  other: 'Outro'
};

const sentimentLabels: Record<string, string> = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo'
};

export default function RatingsHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canReferToCouncilMember } = useUserRole();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [referralReport, setReferralReport] = useState<{
    id: string;
    type: 'service';
    title: string;
    description?: string;
    category?: string;
    location?: string;
    date?: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadRatings();
    }
  }, [user]);

  const loadRatings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('service_ratings')
        .select(`
          id,
          rating_stars,
          rating_text,
          sentiment,
          created_at,
          service_id,
          service:public_services (
            name,
            service_type,
            address,
            district
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRatings((data as any) || []);
    } catch (err) {
      console.error('Error loading ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < stars
            ? 'fill-amber-400 text-amber-400'
            : 'fill-transparent text-muted-foreground'
        }`}
      />
    ));
  };

  return (
    <>
      <PageHeader title="Minhas Avaliações" backTo="/relatos" />
      <div className="min-h-screen bg-background pt-[60px] pb-24">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-4 animate-fade-in">
          
          {/* Explicação do propósito */}
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm text-muted-foreground">
              Suas avaliações de serviços públicos ajudam a melhorar a qualidade do atendimento na cidade.
            </AlertDescription>
          </Alert>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))
          ) : ratings.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma avaliação registrada ainda</p>
              <div className="flex flex-col gap-2 items-center">
                <Button onClick={() => navigate('/servicos-proximos')}>
                  Avaliar um serviço
                </Button>
                <Button variant="outline" onClick={() => navigate('/ia')}>
                  Ou avaliar via chat com IA
                </Button>
              </div>
            </div>
          ) : (
            ratings.map((rating) => (
              <Card key={rating.id} className="hover:shadow-md transition-shadow border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span className="font-medium">
                          {rating.service?.name || 'Serviço não encontrado'}
                        </span>
                      </div>
                      {rating.service?.service_type && (
                        <span className="text-xs text-muted-foreground">
                          {serviceTypeLabels[rating.service.service_type] || rating.service.service_type}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatShortDate(rating.created_at)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {renderStars(rating.rating_stars)}
                      {rating.sentiment && (
                        <span className="text-xs text-muted-foreground">
                          ({sentimentLabels[rating.sentiment] || rating.sentiment})
                        </span>
                      )}
                    </div>

                    {rating.rating_text && (
                      <p className="text-sm text-muted-foreground">
                        {rating.rating_text}
                      </p>
                    )}

                    {rating.service?.address && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {rating.service.address}
                        {rating.service.district && `, ${rating.service.district}`}
                      </div>
                    )}
                  </div>

                  {canReferToCouncilMember && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReferralReport({
                            id: rating.id,
                            type: 'service',
                            title: rating.service?.name || 'Avaliação de serviço',
                            description: rating.rating_text || undefined,
                            category: rating.service?.service_type || undefined,
                            location: rating.service?.address || undefined,
                            date: rating.created_at,
                          });
                          setReferralDialogOpen(true);
                        }}
                      >
                        Encaminhar para vereador
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <ReferralDialog
        open={referralDialogOpen}
        onOpenChange={(open) => {
          setReferralDialogOpen(open);
          if (!open) setReferralReport(null);
        }}
        report={referralReport ? { ...referralReport } : null}
        onComplete={() => {
          setReferralDialogOpen(false);
          setReferralReport(null);
        }}
      />
    </>
  );
}
