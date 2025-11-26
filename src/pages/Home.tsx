import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Navigation, Bus, Calendar, FileText, Users, Vote, Bell, Megaphone, Heart, Star, MessageSquare, Sparkles } from "lucide-react";
import FloatingNavbar from "@/components/FloatingNavbar";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useProfile } from "@/hooks/useProfile";
import NewsCarousel from "@/components/ai/NewsCarousel";
import { PendingRatingsBanner } from "@/components/evaluation/PendingRatingsBanner";
import camaraAbertaBg from "@/assets/camara-aberta-bg.jpg";
import bannerParticipacao from "@/assets/banner-participacao.jpg";
import bannerCidadeDigital from "@/assets/banner-cidade-digital.jpg";
import bannerAudiencias from "@/assets/banner-audiencias.jpg";
import { useFavorites } from "@/contexts/FavoritesContext";
import { usePendingRatings } from "@/hooks/usePendingRatings";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import NextAudienciaBanner from "@/components/home/NextAudienciaBanner";
import LocationPrompt from "@/components/home/LocationPrompt";

import { AvatarWithProgress } from "@/components/home/AvatarWithProgress";

const Home = () => {
  const navigate = useNavigate();
  const { profile, loading, getInitials } = useProfile();
  const { favorites } = useFavorites();
  const { pendingRatings } = usePendingRatings();
  const { status: profileStatus, loading: profileLoading } = useProfileCompletion();
  const { latitude, longitude, refetch: requestLocation } = useGeolocation();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextAudiencia, setNextAudiencia] = useState<any>(null);

  const highlights = [
    { id: 1, image: camaraAbertaBg, title: "Câmara Aberta" },
    { id: 2, image: bannerParticipacao, title: "Transparência e Participação" },
    { id: 3, image: bannerCidadeDigital, title: "São Paulo Digital" },
    { id: 4, image: bannerAudiencias, title: "Audiências Públicas" },
  ];

  const shortcuts = [
    { id: 1, title: "Relato Urbano", icon: MessageSquare, color: "text-cyan-500", bgColor: "bg-cyan-50", path: "/relato-urbano" },
    { id: 2, title: "Audiências", icon: Megaphone, color: "text-pink-500", bgColor: "bg-pink-50", path: "/audiencias" },
    { id: 3, title: "Perto de Você", icon: Navigation, color: "text-blue-500", bgColor: "bg-blue-50", path: "/servicos-proximos" },
    { id: 4, title: "Transporte", icon: Bus, color: "text-orange-500", bgColor: "bg-orange-50", path: "/transporte" },
    { id: 5, title: "Recomendações", icon: Sparkles, color: "text-purple-500", bgColor: "bg-purple-50", path: "/recomendacoes" },
    { id: 6, title: "Vereadores", icon: Users, color: "text-green-500", bgColor: "bg-green-50", path: "/institucional/vereadores" },
    { id: 7, title: "Favoritos", icon: Heart, color: "text-red-500", bgColor: "bg-red-50", path: "/favoritos", badge: favorites.length > 0 ? favorites.length : undefined },
    { id: 8, title: "Avaliar", icon: Star, color: "text-amber-500", bgColor: "bg-amber-50", path: "/avaliar", badge: pendingRatings.length > 0 ? pendingRatings.length : undefined },
  ];

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);
        setUnreadCount(count || 0);
      }
    };
    fetchUnreadCount();
  }, []);

  // Fetch next audiência
  useEffect(() => {
    const fetchNextAudiencia = async () => {
      const { data } = await supabase
        .from("audiencias")
        .select("*")
        .eq("status", "upcoming")
        .order("data", { ascending: true })
        .limit(1)
        .single();
      
      if (data) {
        setNextAudiencia({
          id: data.id,
          title: data.titulo,
          date: data.data,
          time: data.hora,
          location: data.local,
          theme: data.tema,
          participants: 0,
        });
      }
    };
    fetchNextAudiencia();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Simplified Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search Bar */}
            <div 
              className="flex-1 max-w-md relative cursor-pointer"
              onClick={() => navigate("/search")}
            >
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 transition-all duration-200 outline-none cursor-pointer"
                readOnly
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>

            {/* Avatar with Progress */}
            <AvatarWithProgress
              avatarUrl={profile?.avatar_url || null}
              userName={profile?.full_name || "Usuário"}
              percentage={profileStatus?.percentage || 0}
              onClick={() => navigate('/profile')}
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4 md:space-y-6">
        {/* Simplified Greeting */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-medium text-gray-900">
            Olá, <span className="text-primary">{profile?.full_name.split(' ')[0] || "Usuário"}</span>
          </h1>
        </div>

        {/* Quick Access Shortcuts Carousel */}
        <div className="animate-fade-in" style={{ animationDelay: "50ms" }}>
          <div className="flex gap-3 overflow-x-auto overflow-y-visible pb-2 scrollbar-hide -mx-6 px-6 pt-2">
            {shortcuts.map((shortcut) => {
              const IconComponent = shortcut.icon;
              return (
            <button
              key={shortcut.id}
              onClick={() => shortcut.path && navigate(shortcut.path)}
              className="flex-shrink-0 flex flex-col items-start justify-between p-4 w-32 h-28 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 group relative overflow-visible"
            >
              {shortcut.badge && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center z-10">
                  {shortcut.badge}
                </div>
              )}
              <IconComponent className={`h-6 w-6 ${shortcut.color} group-hover:scale-110 transition-transform duration-200`} />
              <span className="text-xs font-medium text-gray-700 text-left leading-tight">{shortcut.title}</span>
            </button>
              );
            })}
          </div>
        </div>

        {/* Location Prompt */}
        {!latitude && !longitude && (
          <div className="animate-fade-in" style={{ animationDelay: "50ms" }}>
            <LocationPrompt onRequestLocation={requestLocation} />
          </div>
        )}

        {/* Pending Ratings Banner */}
        <PendingRatingsBanner />

        {/* Next Audiência Banner */}
        {nextAudiencia && (
          <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
            <NextAudienciaBanner audiencia={nextAudiencia} />
          </div>
        )}

        {/* Carousel Highlights with Bullets */}
        <div className="relative animate-fade-in" style={{ animationDelay: "100ms" }}>
          <Carousel
            opts={{ loop: true }}
            plugins={[Autoplay({ delay: 4000, stopOnInteraction: true })]}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent>
              {highlights.map((highlight) => (
                <CarouselItem key={highlight.id}>
                  <div className="relative h-48 rounded-2xl overflow-hidden shadow-sm">
                    <img
                      src={highlight.image}
                      alt={highlight.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-6">
                      <h2 className="text-2xl font-semibold text-white drop-shadow-lg">
                        {highlight.title}
                      </h2>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Bullets/Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {highlights.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  current === index ? "w-8 bg-primary" : "w-2 bg-gray-300"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Novidades */}
        <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
          <NewsCarousel />
        </div>

        {/* Bottom Cards with Large Icons */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
          {/* Perto de mim Card */}
          <div 
            className="relative h-40 rounded-2xl overflow-hidden cursor-pointer group bg-white shadow-sm border border-gray-100 hover:shadow-md hover:scale-[1.02] transition-all duration-200"
            onClick={() => navigate('/servicos-proximos')}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-400/10 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full blur-xl opacity-20" />
                <Navigation className="h-8 w-8 text-blue-500 relative z-10" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-medium text-gray-900">Perto de mim</h3>
                <p className="text-xs text-gray-500 mt-1">Encontre locais próximos</p>
              </div>
            </div>
          </div>

          {/* SP Trans Card */}
          <div 
            className="relative h-40 rounded-2xl overflow-hidden cursor-pointer group bg-white shadow-sm border border-gray-100 hover:shadow-md hover:scale-[1.02] transition-all duration-200"
            onClick={() => navigate('/transporte')}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-400/10 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-400 rounded-full blur-xl opacity-20" />
                <Bus className="h-8 w-8 text-green-500 relative z-10" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-medium text-gray-900">SP Trans</h3>
                <p className="text-xs text-gray-500 mt-1">Consulte linhas e horários</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FloatingNavbar />
    </div>
  );
};

export default Home;
