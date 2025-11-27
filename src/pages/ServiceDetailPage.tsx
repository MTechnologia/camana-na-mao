import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/page-header";
import FloatingNavbar from "@/components/FloatingNavbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars } from "@/components/evaluation/RatingStars";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Phone, Clock, Star, Bell, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { servicosProximos } from "@/data/searchData";

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [realServiceId, setRealServiceId] = useState<string | null>(null);

  useEffect(() => {
    loadService();
  }, [id]);

  useEffect(() => {
    if (user && realServiceId) checkSubscription();
  }, [user, realServiceId]);

  const isUUID = (str: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  };

  const loadService = async () => {
    if (!id) {
      toast.error("ID do serviço não encontrado");
      navigate("/servicos-proximos");
      return;
    }

    try {
      // Se é UUID, busca direto no Supabase
      if (isUUID(id)) {
        const { data, error } = await supabase
          .from("public_services")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (data) {
          setService(data);
          setRealServiceId(data.id);
          return;
        }
      }

      // Busca nos dados mockados
      const mockedService = servicosProximos.find(s => s.id === id);
      if (mockedService && mockedService.metadata) {
        // Converter formato mockado para formato esperado
        const serviceData = {
          id: mockedService.id,
          name: mockedService.title,
          service_type: mockedService.metadata.serviceType || "other",
          address: mockedService.description,
          district: mockedService.metadata.district || "",
          latitude: mockedService.metadata.latitude,
          longitude: mockedService.metadata.longitude,
          phone: mockedService.metadata.phone,
          average_rating: mockedService.metadata.rating || 0,
          total_ratings: mockedService.metadata.totalRatings || 0,
          city: "São Paulo",
          state: "SP",
          opening_hours: null,
        };
        setService(serviceData);

        // Verifica se já existe no banco pelo nome
        const { data: existingService } = await supabase
          .from("public_services")
          .select("id")
          .eq("name", mockedService.title)
          .maybeSingle();

        if (existingService) {
          setRealServiceId(existingService.id);
        }
        return;
      }

      toast.error("Serviço não encontrado");
      navigate("/servicos-proximos");
    } catch (error) {
      console.error("Error loading service:", error);
      toast.error("Erro ao carregar serviço");
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    if (!user || !realServiceId) return;
    
    try {
      const { data } = await supabase
        .from("service_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("service_id", realServiceId)
        .maybeSingle();

      setIsSubscribed(!!data);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const ensureServiceInDatabase = async (): Promise<string | null> => {
    if (!service) return null;

    // Se já temos o ID real, retorna ele
    if (realServiceId) return realServiceId;

    // Se o ID atual é UUID, pode ser que já exista
    if (id && isUUID(id)) return id;

    try {
      // Verifica se já existe pelo nome
      const { data: existingService } = await supabase
        .from("public_services")
        .select("id")
        .eq("name", service.name)
        .maybeSingle();

      if (existingService) {
        setRealServiceId(existingService.id);
        return existingService.id;
      }

      // Cria o serviço no banco
      const { data: newService, error } = await supabase
        .from("public_services")
        .insert({
          name: service.name,
          service_type: service.service_type,
          address: service.address,
          district: service.district,
          latitude: service.latitude,
          longitude: service.longitude,
          phone: service.phone,
          city: "São Paulo",
          state: "SP"
        })
        .select()
        .single();

      if (error) throw error;
      
      setRealServiceId(newService.id);
      return newService.id;
    } catch (error) {
      console.error("Error ensuring service in database:", error);
      return null;
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Faça login para acompanhar atualizações");
      return;
    }

    try {
      const serviceId = await ensureServiceInDatabase();
      if (!serviceId) {
        toast.error("Erro ao processar serviço");
        return;
      }

      if (isSubscribed) {
        await supabase
          .from("service_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("service_id", serviceId);
        
        setIsSubscribed(false);
        toast.success("Você não receberá mais atualizações");
      } else {
        await supabase
          .from("service_subscriptions")
          .insert({ user_id: user.id, service_id: serviceId });
        
        setIsSubscribed(true);
        toast.success("Você receberá atualizações sobre este serviço");
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
      toast.error("Erro ao atualizar inscrição");
    }
  };

  const handleEvaluate = async () => {
    if (!user) {
      toast.error("Faça login para avaliar");
      return;
    }

    try {
      // Garante que o serviço existe no banco
      const serviceId = await ensureServiceInDatabase();
      if (!serviceId) {
        toast.error("Erro ao processar serviço para avaliação");
        return;
      }

      // Criar uma visita para avaliar
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: visit, error } = await supabase
        .from("service_visits")
        .insert({
          user_id: user.id,
          service_id: serviceId,
          expires_at: expiresAt.toISOString(),
          status: "pending"
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/avaliar/${visit.id}`);
    } catch (error) {
      console.error("Error creating visit:", error);
      toast.error("Erro ao iniciar avaliação");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-[60px]">
        <PageHeader title="Carregando..." />
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-[60px]">
        <PageHeader title="Serviço não encontrado" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title={service.name} />
      
      <div className="p-4 space-y-4">
        {/* Info Card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Endereço</h3>
              <p className="text-sm text-muted-foreground">
                {service.address}, {service.district}
              </p>
              <p className="text-sm text-muted-foreground">
                {service.city} - {service.state}
              </p>
            </div>

            {service.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{service.phone}</span>
              </div>
            )}

            {service.opening_hours && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Seg-Sex: 7h às 19h
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RatingStars rating={service.average_rating} readonly />
                  <span className="text-sm text-muted-foreground">
                    ({service.total_ratings} avaliações)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            className="w-full"
            size="lg"
            onClick={handleEvaluate}
          >
            <Star className="w-4 h-4 mr-2" />
            Avaliar este serviço
          </Button>

          <Button
            variant={isSubscribed ? "secondary" : "outline"}
            className="w-full"
            size="lg"
            onClick={handleSubscribe}
          >
            <Bell className="w-4 h-4 mr-2" />
            {isSubscribed ? "Deixar de acompanhar" : "Acompanhar atualizações"}
          </Button>
        </div>
      </div>

      <FloatingNavbar />
    </div>
  );
}
