import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Navigation, Bus, Calendar, FileText, Users, Vote, Bell, Mail, Megaphone, Heart } from "lucide-react";
import FloatingNavbar from "@/components/FloatingNavbar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useProfile } from "@/hooks/useProfile";
import NewsCarousel from "@/components/ai/NewsCarousel";
import camaraAbertaBg from "@/assets/camara-aberta-bg.jpg";
import camaraLogo from "@/assets/camara-logo.png";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Card } from "@/components/ui/card";

const Home = () => {
  const navigate = useNavigate();
  const { profile, loading, getInitials } = useProfile();
  const { favorites } = useFavorites();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const highlights = [
    { id: 1, image: camaraAbertaBg, title: "Câmara Aberta" },
    { id: 2, image: camaraAbertaBg, title: "Transparência Total" },
    { id: 3, image: camaraAbertaBg, title: "Participe das Decisões" },
  ];

  const shortcuts = [
    { id: 1, title: "Audiências", icon: Megaphone, color: "text-pink-500", bgColor: "bg-pink-50", path: "/audiencias" },
    { id: 2, title: "Agenda", icon: Calendar, color: "text-purple-500", bgColor: "bg-purple-50" },
    { id: 3, title: "Documentos", icon: FileText, color: "text-blue-500", bgColor: "bg-blue-50" },
    { id: 4, title: "Vereadores", icon: Users, color: "text-green-500", bgColor: "bg-green-50" },
    { id: 5, title: "Votações", icon: Vote, color: "text-orange-500", bgColor: "bg-orange-50" },
    { id: 6, title: "Notificações", icon: Bell, color: "text-cyan-500", bgColor: "bg-cyan-50" },
  ];

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Simplified Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md relative">
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all duration-200 outline-none"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>

            {/* Avatar */}
            <Avatar 
              className="h-10 w-10 ring-2 ring-gray-100 cursor-pointer hover:ring-pink-500 transition-all"
              onClick={() => navigate('/profile')}
            >
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
              ) : null}
              <AvatarFallback className="bg-pink-500 text-white font-medium">
                {profile ? getInitials(profile.full_name) : "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        {/* Simplified Greeting */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-medium text-gray-900">
            Olá, <span className="text-pink-500">{profile?.full_name.split(' ')[0] || "Usuário"}</span>
          </h1>
        </div>

        {/* Quick Access Shortcuts Carousel */}
        <div className="animate-fade-in" style={{ animationDelay: "50ms" }}>
          <h2 className="text-sm font-medium text-gray-500 mb-3">Acesso Rápido</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
            {shortcuts.map((shortcut) => {
              const IconComponent = shortcut.icon;
              return (
                <button
                  key={shortcut.id}
                  onClick={() => shortcut.path && navigate(shortcut.path)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 p-4 w-24 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className={`${shortcut.bgColor} p-3 rounded-full group-hover:scale-110 transition-transform duration-200`}>
                    <IconComponent className={`h-6 w-6 ${shortcut.color}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center">{shortcut.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: "75ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
              <h2 className="text-sm font-medium text-gray-500">Meus Favoritos</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
              {favorites.map((favorite) => (
                <Card
                  key={favorite.id}
                  onClick={() => navigate(favorite.path)}
                  className="flex-shrink-0 w-48 p-3 bg-white hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-100"
                >
                  <div className="flex items-start gap-3">
                    {favorite.image && (
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={favorite.image} alt={favorite.title} />
                        <AvatarFallback className="bg-pink-50 text-pink-600 text-xs">
                          {favorite.title.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                        {favorite.title}
                      </h3>
                      {favorite.subtitle && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {favorite.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
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
                  current === index ? "w-8 bg-pink-500" : "w-2 bg-gray-300"
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
          <div className="relative h-40 rounded-2xl overflow-hidden cursor-pointer group bg-white shadow-sm border border-gray-100 hover:shadow-md hover:scale-[1.02] transition-all duration-200">
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
          <div className="relative h-40 rounded-2xl overflow-hidden cursor-pointer group bg-white shadow-sm border border-gray-100 hover:shadow-md hover:scale-[1.02] transition-all duration-200">
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
