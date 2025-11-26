import { Search, MapPin, Calendar, FileText, Users, Compass, Wifi, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FloatingNavbar from "@/components/FloatingNavbar";
import { useMenu } from "@/contexts/MenuContext";
import { useState, useEffect } from "react";
import camaraLogo from "@/assets/camara-logo.png";
import avatarLuana from "@/assets/avatar-luana.jpg";
import camaraAbertaBg from "@/assets/camara-aberta-bg.jpg";
import camaraAbertaLogo from "@/assets/camara-aberta-logo.png";
import mapLocation from "@/assets/map-location.png";
import busSptrans from "@/assets/bus-sptrans.png";

const Home = () => {
  const { openMenu } = useMenu();
  const [greeting, setGreeting] = useState("");

  // Dynamic greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bom dia");
    else if (hour < 18) setGreeting("Boa tarde");
    else setGreeting("Boa noite");
  }, []);

  const shortcuts = [
    { 
      id: 1, 
      title: "Agenda e Eventos",
      icon: Calendar,
      gradient: "from-pink-500 to-rose-400",
      shadow: "shadow-pink-500/20"
    },
    { 
      id: 2, 
      title: "Documentos",
      icon: FileText,
      gradient: "from-purple-500 to-pink-400",
      shadow: "shadow-purple-500/20"
    },
    { 
      id: 3, 
      title: "Vereadores",
      icon: Users,
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20"
    },
    { 
      id: 4, 
      title: "Localizações",
      icon: Compass,
      gradient: "from-orange-500 to-amber-400",
      shadow: "shadow-orange-500/20"
    },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Header with Glassmorphism */}
      <header className="glass sticky top-0 z-50 px-4 pt-4 pb-4 shadow-sm shadow-primary/5">
        <div className="flex items-center gap-3 animate-fade-in">
          {/* Logo */}
          <img src={camaraLogo} alt="Câmara SP" className="w-12 h-12 transition-transform hover:scale-110 duration-300" />
          
          {/* Search Bar */}
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={18} />
            <Input
              placeholder="O que você procura?"
              className="pl-10 h-10 rounded-full bg-secondary/50 border border-transparent text-sm transition-all duration-300 focus:border-primary/30 focus:shadow-lg focus:shadow-primary/10"
            />
          </div>

          {/* Location Icon */}
          <button className="w-10 h-10 flex items-center justify-center transition-all hover:scale-110 hover:text-primary duration-300">
            <MapPin className="text-muted-foreground hover:text-primary transition-colors" size={22} />
          </button>

          {/* Avatar with animated ring */}
          <button 
            onClick={openMenu}
            className="w-10 h-10 rounded-full overflow-hidden avatar-ring transition-transform hover:scale-110 duration-300"
          >
            <img src={avatarLuana} alt="Luana" className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pt-5">
        {/* Dynamic Greeting with Animation */}
        <div className="mb-5 animate-slide-up">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            {greeting}, <span className="gradient-text">Luana</span>
            <span className="inline-block animate-wave origin-bottom-right text-2xl">👋</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ficamos felizes por voltar!</p>
        </div>

        {/* Shortcuts Carousel with Gradients */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-foreground mb-3">Atalhos</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {shortcuts.map((shortcut, index) => {
              const Icon = shortcut.icon;
              return (
                <div
                  key={shortcut.id}
                  className="min-w-[140px] h-[100px] rounded-2xl glass-strong p-3 flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer group relative overflow-hidden"
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    boxShadow: `0 10px 30px -10px var(--tw-shadow-color)`
                  }}
                >
                  {/* Gradient background overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${shortcut.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
                  
                  <div className="relative z-10">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${shortcut.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="text-white" size={20} />
                    </div>
                  </div>
                  
                  <p className="relative z-10 text-xs font-semibold text-foreground leading-tight">{shortcut.title}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Highlight - Câmara Aberta */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground mb-3">Destaques</h2>
          <div className="rounded-2xl overflow-hidden shadow-xl shadow-primary/10 relative group gradient-border">
            {/* Background Image with Zoom */}
            <div className="relative h-48 overflow-hidden">
              <img
                src={camaraAbertaBg}
                alt="Câmara Aberta"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Dark gradient overlay for better contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              
              {/* Overlay Content */}
              <div className="absolute inset-0 flex flex-col justify-between p-4">
                {/* Logo and Banner */}
                <div className="animate-slide-up">
                  <img 
                    src={camaraAbertaLogo} 
                    alt="Câmara Aberta" 
                    className="h-16 mb-2 drop-shadow-2xl" 
                    style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
                  />
                  <div className="glass-strong text-foreground text-xs font-semibold px-3 py-1.5 rounded-full inline-block border border-white/20">
                    Conheça o Hotsite
                  </div>
                </div>
                
                {/* Bottom Section */}
                <div className="flex items-end justify-between gap-2">
                  <div className="glass-strong px-3 py-2 rounded-lg border border-white/20">
                    <p className="text-xs font-medium text-foreground">
                      Visita Guiada aos fins de semana
                    </p>
                  </div>
                  <Button 
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-full px-4 h-8 text-xs shadow-lg shadow-primary/30 transition-all hover:scale-105 animate-pulse-soft"
                  >
                    SAIBA MAIS
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Small Highlight Cards with Glass Effect */}
        <div className="grid grid-cols-2 gap-3">
          {/* Perto de mim */}
          <div className="glass-strong rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 cursor-pointer relative overflow-hidden group gradient-border">
            <div className="absolute top-3 right-3 w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-400 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:scale-110 transition-transform">
              <Wifi className="text-white" size={16} />
            </div>
            <h3 className="font-bold text-foreground text-sm mb-1">Perto de mim</h3>
            <p className="text-xs text-primary font-medium mb-3">Serviços</p>
            <img 
              src={mapLocation} 
              alt="Map" 
              className="w-16 h-16 object-contain ml-auto animate-float opacity-90" 
            />
          </div>

          {/* SP Trans */}
          <div className="glass-strong rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 cursor-pointer relative overflow-hidden group gradient-border">
            <div className="absolute top-3 right-3 w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <Wrench className="text-white" size={16} />
            </div>
            <h3 className="font-bold text-foreground text-sm mb-1">SP Trans</h3>
            <p className="text-xs text-primary font-medium mb-3">Fique por dentro</p>
            <img 
              src={busSptrans} 
              alt="Bus" 
              className="w-20 h-12 object-contain ml-auto animate-float opacity-90" 
              style={{ animationDelay: '1s' }}
            />
          </div>
        </div>
      </div>

      <FloatingNavbar />
    </div>
  );
};

export default Home;
