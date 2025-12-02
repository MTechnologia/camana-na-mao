import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, Star, TrendingUp, Calendar, Route } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Recommendation {
  id: string;
  service_id: string;
  service_name: string;
  service_type: string;
  reason: string;
  confidence: number;
  distance?: number;
  address: string;
  district: string;
  average_rating: number;
  total_ratings: number;
}

// Dados mockados de recomendações para fallback
const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec-1",
    service_id: "ubs-republica",
    service_name: "UBS República",
    service_type: "ubs",
    reason: "Próximo à sua localização e bem avaliada para atendimento básico de saúde. Ideal para consultas de rotina.",
    confidence: 0.92,
    distance: 1200,
    address: "R. do Arouche, 20",
    district: "República",
    average_rating: 4.3,
    total_ratings: 142
  },
  {
    id: "rec-2",
    service_id: "biblioteca-mario-andrade",
    service_name: "Biblioteca Mário de Andrade",
    service_type: "library",
    reason: "Excelente para estudo e pesquisa. Possui amplo acervo e ambiente silencioso.",
    confidence: 0.88,
    distance: 800,
    address: "R. da Consolação, 94",
    district: "República",
    average_rating: 4.8,
    total_ratings: 234
  },
  {
    id: "rec-3",
    service_id: "emef-infante-dom-henrique",
    service_name: "EMEF Infante Dom Henrique",
    service_type: "school",
    reason: "Boa opção educacional no Centro. Programa pedagógico reconhecido pela comunidade.",
    confidence: 0.85,
    distance: 100,
    address: "Praça da Sé, s/n",
    district: "Sé",
    average_rating: 4.1,
    total_ratings: 89
  },
  {
    id: "rec-4",
    service_id: "ceu-consolacao",
    service_name: "CEU Consolação",
    service_type: "ceu",
    reason: "Oferece atividades culturais e esportivas gratuitas. Ótimo para lazer e educação complementar.",
    confidence: 0.82,
    distance: 2500,
    address: "R. Augusta, 450",
    district: "Consolação",
    average_rating: 4.7,
    total_ratings: 178
  },
  {
    id: "rec-5",
    service_id: "ubs-liberdade",
    service_name: "UBS Liberdade",
    service_type: "ubs",
    reason: "Alternativa de saúde na região com bom atendimento e menor tempo de espera.",
    confidence: 0.78,
    distance: 1000,
    address: "R. Galvão Bueno, 257",
    district: "Liberdade",
    average_rating: 4.2,
    total_ratings: 156
  }
];

export default function ServiceRecommendationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      if (!user) {
        // Sem usuário, usar dados mockados
        setRecommendations(MOCK_RECOMMENDATIONS);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('recommend-services', {
        body: { userId: user.id }
      });

      if (error || !data?.recommendations?.length) {
        // Fallback para dados mockados
        console.log("Usando recomendações mockadas como fallback");
        setRecommendations(MOCK_RECOMMENDATIONS);
        return;
      }

      setRecommendations(data.recommendations);
    } catch (error) {
      console.error("Erro ao carregar recomendações:", error);
      // Fallback para dados mockados em caso de erro
      setRecommendations(MOCK_RECOMMENDATIONS);
    } finally {
      setLoading(false);
    }
  };

  const serviceIcons: Record<string, string> = {
    ubs: "🏥",
    school: "🏫",
    ceu: "🎭",
    hospital: "🏥",
    library: "📚",
    sports_center: "⚽",
    other: "📍"
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return '';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-500";
    if (confidence >= 0.6) return "text-blue-500";
    return "text-amber-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-[60px]">
        <PageHeader title="Recomendações Inteligentes" />
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Recomendações Inteligentes" />
      
      <div className="p-4 space-y-4">
        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-foreground mb-1">
                  Serviços Personalizados
                </h2>
                <p className="text-xs text-muted-foreground">
                  Recomendações baseadas no seu perfil, localização e histórico de uso
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{recommendations.length}</p>
              <p className="text-xs text-muted-foreground">Sugestões</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">
                {recommendations.length > 0
                  ? (recommendations.reduce((acc, r) => acc + r.average_rating, 0) / recommendations.length).toFixed(1)
                  : "0"}
              </p>
              <p className="text-xs text-muted-foreground">Média</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Route className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">
                {recommendations.filter(r => r.distance && r.distance < 2000).length}
              </p>
              <p className="text-xs text-muted-foreground">Próximos</p>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations List */}
        {recommendations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="font-semibold text-foreground mb-1">
                Nenhuma recomendação disponível
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete seu perfil e use mais serviços para receber recomendações personalizadas
              </p>
              <Button onClick={() => navigate("/profile")}>
                Completar Perfil
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <Card
                key={rec.id}
                className="cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                onClick={() => navigate(`/servico/${rec.service_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl">
                      {serviceIcons[rec.service_type] || serviceIcons.other}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-foreground line-clamp-2">
                          {rec.service_name}
                        </h3>
                        <Badge variant="secondary" className="whitespace-nowrap">
                          #{index + 1}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-medium text-foreground">
                            {rec.average_rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({rec.total_ratings})
                          </span>
                        </div>
                        
                        {rec.distance && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-primary font-medium">
                              {formatDistance(rec.distance)}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{rec.address}, {rec.district}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-secondary/50 rounded-lg p-3 flex items-start gap-2">
                    <Sparkles className={`w-4 h-4 ${getConfidenceColor(rec.confidence)} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">
                        Por que recomendamos:
                      </p>
                      <p className="text-xs text-foreground">{rec.reason}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              rec.confidence >= 0.8 ? 'bg-green-500' :
                              rec.confidence >= 0.6 ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${rec.confidence * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${getConfidenceColor(rec.confidence)}`}>
                          {Math.round(rec.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
