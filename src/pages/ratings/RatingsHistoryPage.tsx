import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Info, MapPin, ChevronLeft, ChevronRight, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { formatShortDate } from '@/lib/dateUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ReferralDialog } from '@/components/referral/ReferralDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 10;

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

interface RatingsStats {
  avg_stars: number | null;
  total_count: number;
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
  city_market: 'Mercado Municipal',
  theater: 'Teatro/Cinema',
  museum: 'Museu',
  cemetery: 'Cemitério',
  accessibility: 'Acessibilidade',
  recycling_point: 'Reciclagem/Limpeza',
  fire_station: 'Bombeiros',
  other: 'Outro',
};

const sentimentLabels: Record<string, string> = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
};

const publicationStatusUi: Record<
  string,
  { label: string; className: string }
> = {
  published: {
    label: 'Comentário público',
    className: 'bg-green-500/10 text-green-800 border-green-500/25 dark:text-green-300',
  },
  pending_review: {
    label: 'Comentário em revisão',
    className: 'bg-amber-500/10 text-amber-900 border-amber-500/25 dark:text-amber-200',
  },
  rejected: {
    label: 'Comentário não publicado',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

/** Comentário sempre visível no histórico; texto longo com expandir/recolher. */
const COMMENT_PREVIEW_CHARS = 280;

function RatingCommentBlock({ ratingId, text }: { ratingId: string; text: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text?.trim() ?? '';
  const isLong = trimmed.length > COMMENT_PREVIEW_CHARS;
  const displayText =
    !trimmed || !isLong || expanded ? trimmed : `${trimmed.slice(0, COMMENT_PREVIEW_CHARS).trimEnd()}…`;

  return (
    <div
      className="rounded-md border border-border/70 bg-muted/25 px-3 py-2.5"
      data-testid={`rating-comment-${ratingId}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <MessageSquareText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-foreground">Comentário</span>
      </div>
      {!trimmed ? (
        <p className="text-sm text-muted-foreground italic">Sem comentário nesta avaliação.</p>
      ) : (
        <>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{displayText}</p>
          {isLong && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 mt-1.5 text-xs"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? 'Ver menos' : 'Ver mais'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function parseStatsRpc(data: unknown): RatingsStats | null {
  if (data == null || typeof data !== 'object') return null;
  const o = data as { avg_stars?: unknown; total_count?: unknown };
  const avg =
    typeof o.avg_stars === 'number' && !Number.isNaN(o.avg_stars) ? o.avg_stars : null;
  const total =
    typeof o.total_count === 'number' && !Number.isNaN(o.total_count)
      ? o.total_count
      : typeof o.total_count === 'string'
        ? Number(o.total_count)
        : 0;
  return { avg_stars: avg, total_count: total };
}

export default function RatingsHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canReferToCouncilMember } = useUserRole();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<RatingsStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
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

  const loadRatingsPage = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const [statsResult, listResult] = await Promise.all([
        supabase.rpc('get_user_service_ratings_stats'),
        supabase
          .from('service_ratings')
          .select(
            `
          id,
          rating_stars,
          rating_text,
          sentiment,
          publication_status,
          created_at,
          service_id,
          service:public_services (
            name,
            service_type,
            address,
            district
          )
        `,
            { count: 'exact' }
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, to),
      ]);

      if (listResult.error) throw listResult.error;

      const rows = (listResult.data as Rating[]) || [];
      setRatings(rows);
      setTotalCount(listResult.count ?? 0);

      if (statsResult.error) {
        console.warn('[RatingsHistory] get_user_service_ratings_stats:', statsResult.error);
        const total = listResult.count ?? rows.length;
        setStats({ avg_stars: null, total_count: total });
      } else {
        const parsed = parseStatsRpc(statsResult.data);
        if (parsed) {
          setStats(parsed);
        } else {
          setStats({
            avg_stars: null,
            total_count: listResult.count ?? 0,
          });
        }
      }
    } catch (err) {
      console.error('Error loading ratings:', err);
      setRatings([]);
      setTotalCount(0);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  useEffect(() => {
    if (user) {
      void loadRatingsPage();
    }
  }, [user, loadRatingsPage]);

  /** Se a página atual ficar vazia após exclusão etc., volta para a primeira. */
  useEffect(() => {
    if (!loading && totalCount > 0) {
      const maxPage = Math.max(0, Math.ceil(totalCount / PAGE_SIZE) - 1);
      if (page > maxPage) setPage(maxPage);
    }
  }, [loading, totalCount, page]);

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < stars ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-muted-foreground'
        }`}
      />
    ));
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showPagination = totalCount > PAGE_SIZE;
  const rangeLabel =
    totalCount === 0
      ? ''
      : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} de ${totalCount}`;

  return (
    <>
      <PageHeader title="Minhas Avaliações" backTo="/relatos" />
      <div className="min-h-screen bg-background pt-[60px] pb-24">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-4 animate-fade-in">
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
          ) : totalCount === 0 ? (
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma avaliação registrada ainda</p>
              <div className="flex flex-col gap-2 items-center">
                <Button onClick={() => navigate('/servicos-proximos')}>Avaliar um serviço</Button>
                <Button variant="outline" onClick={() => navigate('/ia')}>
                  Ou avaliar via chat com IA
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Resumo agregado */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <h2 className="text-sm font-semibold text-foreground mb-2">Resumo</h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Média geral:</span>
                      {stats?.avg_stars != null ? (
                        <span className="font-medium tabular-nums">
                          {stats.avg_stars.toFixed(2)} <span className="text-amber-500">★</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total de avaliações: </span>
                      <span className="font-medium">{stats?.total_count ?? totalCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Avaliações individuais</h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Cada item mostra o serviço, data, nota, sentimento (quando houver), o status de{' '}
                  <strong className="text-foreground font-medium">publicação do comentário</strong> e o
                  texto que você escreveu — ou a indicação de que não houve texto naquela avaliação.
                </p>
                {rangeLabel && (
                  <p className="text-xs text-muted-foreground mb-3">{rangeLabel}</p>
                )}
              </div>

              <div className="space-y-3">
                {ratings.map((rating) => (
                  <Card
                    key={rating.id}
                    className="hover:shadow-md transition-shadow border-border"
                  >
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
                              {serviceTypeLabels[rating.service.service_type] ||
                                rating.service.service_type}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatShortDate(rating.created_at)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {renderStars(rating.rating_stars)}
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {rating.rating_stars}/5
                          </span>
                          {rating.sentiment && (
                            <span className="text-xs text-muted-foreground">
                              ({sentimentLabels[rating.sentiment] || rating.sentiment})
                            </span>
                          )}
                          {(() => {
                            const ps = rating.publication_status || 'published';
                            const cfg = publicationStatusUi[ps] ?? publicationStatusUi.published;
                            return (
                              <Badge variant="outline" className={`text-xs font-normal ${cfg.className}`}>
                                {cfg.label}
                              </Badge>
                            );
                          })()}
                        </div>

                        <RatingCommentBlock ratingId={rating.id} text={rating.rating_text} />

                        {rating.service?.address && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>
                              {rating.service.address}
                              {rating.service.district && `, ${rating.service.district}`}
                            </span>
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
                ))}
              </div>

              {showPagination && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page <= 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Página {page + 1} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
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
