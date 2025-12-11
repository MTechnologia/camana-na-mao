import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Button } from "@/components/ui/button";
import WelcomeSlide from "@/components/welcome/WelcomeSlide";

// Import Lottie animations
import communityAnimation from "@/assets/lottie/community.json";
import aiAssistantAnimation from "@/assets/lottie/ai-assistant.json";
import locationAnimation from "@/assets/lottie/location.json";
import transparencyAnimation from "@/assets/lottie/transparency.json";

const slides = [
  {
    animationData: communityAnimation,
    title: "Sua voz transforma São Paulo",
    description: "Participe de audiências públicas, avalie serviços e reporte problemas urbanos.",
    gradient: "bg-gradient-to-br from-rose-600 via-rose-500 to-pink-400",
  },
  {
    animationData: aiAssistantAnimation,
    title: "Conheça a Luana",
    description: "Sua assistente inteligente para acessar informações da Câmara Municipal de forma simples.",
    gradient: "bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-400",
  },
  {
    animationData: locationAnimation,
    title: "Serviços perto de você",
    description: "Encontre UBS, escolas, hospitais e outros equipamentos públicos na sua região.",
    gradient: "bg-gradient-to-br from-teal-600 via-cyan-500 to-sky-400",
  },
  {
    animationData: transparencyAnimation,
    title: "Transparência em tempo real",
    description: "Acompanhe projetos de lei, vereadores e tudo que acontece na Câmara.",
    gradient: "bg-gradient-to-br from-amber-600 via-orange-500 to-yellow-400",
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
    <div className="fixed inset-0 flex flex-col overflow-hidden">
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
          {slides.map((slide, index) => (
            <WelcomeSlide
              key={index}
              animationData={slide.animationData}
              title={slide.title}
              description={slide.description}
              gradient={slide.gradient}
              isActive={selectedIndex === index}
            />
          ))}
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
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === selectedIndex
                  ? "bg-white w-8"
                  : "bg-white/40 hover:bg-white/60"
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
