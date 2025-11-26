import { useState } from "react";
import { Search, MapPin, HelpCircle, Wifi, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FloatingNavbar from "@/components/FloatingNavbar";
import MenuDrawer from "@/components/MenuDrawer";
import camaraLogo from "@/assets/camara-logo.png";
import avatarLuana from "@/assets/avatar-luana.jpg";
import camaraAbertaBg from "@/assets/camara-aberta-bg.jpg";
import camaraAbertaLogo from "@/assets/camara-aberta-logo.png";
import mapLocation from "@/assets/map-location.png";
import busSptrans from "@/assets/bus-sptrans.png";

const Home = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const shortcuts = [
    { id: 1, title: "Atalho para" },
    { id: 2, title: "Atalho para" },
    { id: 3, title: "Atalho para" },
    { id: 4, title: "Atalho para" },
  ];


  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-24">
      {/* Header */}
      <header className="bg-white px-4 pt-4 pb-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <img src={camaraLogo} alt="Câmara SP" className="w-12 h-12" />
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="O que você procura?"
              className="pl-10 h-10 rounded-full bg-[#F5F5F5] border-none text-sm"
            />
          </div>

          {/* Location Icon */}
          <button className="w-10 h-10 flex items-center justify-center">
            <MapPin className="text-muted-foreground" size={22} />
          </button>

          {/* Avatar */}
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="w-10 h-10 rounded-full overflow-hidden"
          >
            <img src={avatarLuana} alt="Luana" className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pt-5">
        {/* Greeting */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground">Olá, Luana</h1>
          <p className="text-sm text-muted-foreground">Ficamos felizes por voltar!</p>
        </div>

        {/* Shortcuts Carousel */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-foreground mb-3">Atalhos</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className="min-w-[140px] h-[100px] rounded-2xl bg-white p-3 flex items-start gap-3 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="text-primary" size={20} />
                </div>
                <p className="text-xs font-medium text-foreground leading-tight pt-1">{shortcut.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Highlight - Câmara Aberta */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground mb-3">Destaques</h2>
          <div className="rounded-2xl overflow-hidden bg-white shadow-sm relative">
            {/* Background Image */}
            <div className="relative h-48">
              <img
                src={camaraAbertaBg}
                alt="Câmara Aberta"
                className="w-full h-full object-cover"
              />
              
              {/* Overlay Content */}
              <div className="absolute inset-0 flex flex-col justify-between p-4">
                {/* Logo and Banner */}
                <div>
                  <img src={camaraAbertaLogo} alt="Câmara Aberta" className="h-16 mb-2" />
                  <div className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full inline-block">
                    Conheça o Hotsite
                  </div>
                </div>
                
                {/* Bottom Section */}
                <div className="flex items-end justify-between">
                  <div className="bg-white/95 px-3 py-2 rounded-lg">
                    <p className="text-xs font-medium text-foreground">
                      Visita Guiada aos fins de semana
                    </p>
                  </div>
                  <Button 
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-full px-4 h-8 text-xs"
                  >
                    SAIBA MAIS
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Small Highlight Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Perto de mim */}
          <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-3 right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Wifi className="text-white" size={16} />
            </div>
            <h3 className="font-bold text-foreground text-sm mb-1">Perto de mim</h3>
            <p className="text-xs text-primary font-medium mb-3">Serviços</p>
            <img src={mapLocation} alt="Map" className="w-16 h-16 object-contain ml-auto" />
          </div>

          {/* SP Trans */}
          <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-3 right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Wrench className="text-white" size={16} />
            </div>
            <h3 className="font-bold text-foreground text-sm mb-1">SP Trans</h3>
            <p className="text-xs text-primary font-medium mb-3">Fique por dentro</p>
            <img src={busSptrans} alt="Bus" className="w-20 h-12 object-contain ml-auto" />
          </div>
        </div>
      </div>

      <FloatingNavbar />
      <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
};

export default Home;
