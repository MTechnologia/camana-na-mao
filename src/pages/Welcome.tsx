import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { MessageCircle, Sparkles, MapPin, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const slides = [
  {
    icon: MessageCircle,
    title: "Sua voz transforma São Paulo",
    description: "Participe de audiências públicas, avalie serviços e reporte problemas urbanos.",
    gradient: "bg-gradient-to-br from-rose-600 via-rose-500 to-pink-400",
    iconColor: "text-rose-100",
  },
  {
    icon: Sparkles,
    title: "Conheça a Luana",
    description: "Sua assistente inteligente para acessar informações da Câmara Municipal de forma simples.",
    gradient: "bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-400",
    iconColor: "text-violet-100",
  },
  {
    icon: MapPin,
    title: "Serviços perto de você",
    description: "Encontre UBS, escolas, hospitais e outros equipamentos públicos na sua região.",
    gradient: "bg-gradient-to-br from-teal-600 via-cyan-500 to-sky-400",
    iconColor: "text-teal-100",
  },
  {
    icon: Building,
    title: "Transparência em tempo real",
    description: "Acompanhe projetos de lei, vereadores e tudo que acontece na Câmara.",
    gradient: "bg-gradient-to-br from-amber-600 via-orange-500 to-yellow-400",
    iconColor: "text-amber-100",
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
    <div className="fixed inset-0 flex flex-col overflow-hidden z-[100]">
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/login")}
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          Pular
        </Button>
      </div>

      {/* Carousel */}
      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide, index) => {
            const Icon = slide.icon;
            const isActive = selectedIndex === index;
            
            return (
              <div key={index} className={`flex-[0_0_100%] min-w-0 h-full ${slide.gradient}`}>
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
                      className="w-40 h-40 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl relative overflow-hidden"
                      animate={isActive ? {
                        boxShadow: [
                          "0 0 20px rgba(255,255,255,0.3)",
                          "0 0 40px rgba(255,255,255,0.5)",
                          "0 0 20px rgba(255,255,255,0.3)"
                        ]
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {/* Pulsing ring effect */}
                      {isActive && (
                        <>
                          <motion.div
                            className="absolute inset-0 rounded-full border-4 border-white/30"
                            animate={{ scale: [1, 1.3, 1.3], opacity: [0.6, 0, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                          />
                          <motion.div
                            className="absolute inset-0 rounded-full border-4 border-white/20"
                            animate={{ scale: [1, 1.5, 1.5], opacity: [0.4, 0, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                          />
                        </>
                      )}
                      
                      {/* Icon with floating animation */}
                      <motion.div
                        animate={isActive ? {
                          y: [0, -8, 0],
                          rotate: [0, 5, -5, 0]
                        } : {}}
                        transition={{ 
                          duration: 3, 
                          repeat: Infinity, 
                          ease: "easeInOut" 
                        }}
                      >
                        <Icon className={`w-20 h-20 ${slide.iconColor} drop-shadow-lg`} strokeWidth={1.5} />
                      </motion.div>
                    </motion.div>
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: isActive ? 0 : 20, opacity: isActive ? 1 : 0 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                    className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg leading-tight"
                  >
                    {slide.title}
                  </motion.h2>

                  {/* Description */}
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: isActive ? 0 : 20, opacity: isActive ? 1 : 0 }}
                    transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                    className="text-lg md:text-xl text-white/90 max-w-sm leading-relaxed"
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
      <div className={`${slides[selectedIndex].gradient} px-6 pb-8 pt-4`}>
        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === selectedIndex
                  ? "bg-white w-8"
                  : "bg-white/40 hover:bg-white/60 w-2.5"
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
            className="w-full bg-white text-foreground hover:bg-white/90 font-semibold text-lg h-14 shadow-lg"
          >
            Entrar
          </Button>
          <Button
            onClick={() => navigate("/register")}
            variant="outline"
            size="lg"
            className="w-full border-2 border-white text-white hover:bg-white/10 font-semibold text-lg h-14 bg-transparent"
          >
            Cadastre-se
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
