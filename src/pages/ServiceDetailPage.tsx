import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/page-header";
import FloatingNavbar from "@/components/FloatingNavbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars } from "@/components/evaluation/RatingStars";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Phone, Clock, Star, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MapboxMap } from "@/components/map/MapboxMap";
import { useGeolocation } from "@/hooks/useGeolocation";

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { latitude, longitude } = useGeolocation();

  useEffect(() => {
    loadService();
    if (user) checkSubscription();
  }, [id, user]);

  const loadService = async () => {
    try {
      const { data, error } = await supabase
        .from("public_services")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Error loading service:", error);
        throw error;
      }

      if (!data) {
        toast.error("Serviço não encontrado");
        navigate("/");
        return;
      }

      setService(data);
    } catch (error) {
      console.error("Error loading service:", error);
      toast.error("Erro ao carregar serviço");
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    if (!user || !id) return;
    
    try {
      const { data, error } = await supabase
        .from("service_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("service_id", id)
        .maybeSingle();

      if (error) {
        console.error("Error checking subscription:", error);
      }

      setIsSubscribed(!!data);
    } catch (error) {
      // Not subscribed
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Faça login para acompanhar atualizações");
      return;
    }

    try {
      if (isSubscribed) {
        await supabase
          .from("service_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("service_id", id);
        
        setIsSubscribed(false);
        toast.success("Você não receberá mais atualizações");
      } else {
        await supabase
          .from("service_subscriptions")
          .insert({ user_id: user.id, service_id: id });
        
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
      // Criar uma visita para avaliar
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: visit, error } = await supabase
        .from("service_visits")
        .insert({
          user_id: user.id,
          service_id: id,
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
        {/* Map Section */}
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Localização</h3>
          <MapboxMap
            userLocation={latitude && longitude ? { latitude, longitude } : null}
            services={[{
              id: service.id,
              name: service.name,
              service_type: service.service_type,
              latitude: service.latitude,
              longitude: service.longitude,
              address: service.address,
            }]}
            onServiceClick={() => {}}
          />
        </Card>

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
