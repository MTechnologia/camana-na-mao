import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { MessageCircle, Sparkles, MapPin, Building, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import brasaoSP from "@/assets/brasao-sp.png";

const slides = [
  {
    icon: MessageCircle,
    title: "Sua voz transforma São Paulo",
    description: "Participe de audiências públicas, avalie serviços e reporte problemas urbanos.",
  },
  {
    icon: Sparkles,
    title: "Seu Assistente Inteligente",
    description: "Acesse informações da Câmara Municipal de forma simples e conversacional.",
  },
  {
    icon: MapPin,
    title: "Serviços perto de você",
    description: "Encontre UBS, escolas, hospitais e outros equipamentos públicos na sua região.",
  },
  {
    icon: Building,
    title: "Transparência em tempo real",
    description: "Acompanhe projetos de lei, vereadores e tudo que acontece na Câmara.",
  },
];

const Welcome = () => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, skipSnaps: false },
    [Autoplay({ delay: 5000, stopOnInteraction: true })]
  );

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background z-[100]">
      {/* Header with logo and skip */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img 
            src={brasaoSP} 
            alt="Brasão de São Paulo" 
            className="h-9 w-auto"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground leading-tight">CÂMARA MUNICIPAL</span>
            <span className="text-xs font-semibold text-foreground leading-tight">DE SÃO PAULO</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/login")}
          className="text-muted-foreground hover:text-foreground"
        >
          Pular
        </Button>
      </header>

      {/* Carousel */}
      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide, index) => {
            const Icon = slide.icon;
            const isActive = selectedIndex === index;
            
            return (
              <div key={index} className="flex-[0_0_100%] min-w-0 h-full">
                <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                  {/* Animated Icon Container */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ 
                      scale: isActive ? 1 : 0.8, 
                      opacity: isActive ? 1 : 0 
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="mb-8"
                  >
                    <motion.div 
                      className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center relative"
                      animate={isActive ? {
                        boxShadow: [
                          "0 0 0 0 hsl(var(--primary) / 0.1)",
                          "0 0 0 20px hsl(var(--primary) / 0)",
                        ]
                      } : {}}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    >
                      {/* Pulsing ring effect */}
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-primary/30"
                          animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        />
                      )}
                      
                      {/* Icon with subtle animation */}
                      <motion.div
                        animate={isActive ? {
                          y: [0, -4, 0],
                        } : {}}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity, 
                          ease: "easeInOut" 
                        }}
                      >
                        <Icon className="w-14 h-14 text-primary" strokeWidth={1.5} />
                      </motion.div>
                    </motion.div>
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: isActive ? 0 : 20, opacity: isActive ? 1 : 0 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                    className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight max-w-xs"
                  >
                    {slide.title}
                  </motion.h2>

                  {/* Description */}
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: isActive ? 0 : 20, opacity: isActive ? 1 : 0 }}
                    transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                    className="text-base text-muted-foreground max-w-sm leading-relaxed"
                  >
                    {slide.description}
                  </motion.p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom section with dots and buttons */}
      <div className="px-6 pb-8 pt-4 bg-background">
        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === selectedIndex
                  ? "bg-primary w-6"
                  : "bg-border hover:bg-muted-foreground/30 w-2"
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          <Button
            onClick={() => navigate("/login")}
            size="lg"
            className="w-full font-semibold text-base h-12 gap-2"
          >
            Entrar
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => navigate("/register")}
            variant="outline"
            size="lg"
            className="w-full font-semibold text-base h-12 border-border text-foreground hover:bg-muted"
          >
            Criar conta
          </Button>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Câmara Municipal de São Paulo
        </p>
      </div>
    </div>
  );
};

export default Welcome;
