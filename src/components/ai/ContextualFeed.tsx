import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { noticias } from "@/data/noticias";
import { formatDistanceToNow, format, isToday, isTomorrow, differenceInHours, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils";

interface Audiencia {
  id: string;
  titulo: string;
  descricao: string | null;
  data: string;
  hora: string;
  tema: string;
}

interface FeedItem {
  id: string;
  type: "news" | "audiencia";
  title: string;
  description: string;
  date: string;
  time?: string;
  badge?: string;
  badgeColor?: string;
}

const ContextualFeed = () => {
  const navigate = useNavigate();
  const [proximasAudiencias, setProximasAudiencias] = useState<Audiencia[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: "start",
      containScroll: "keepSnaps",
      dragFree: false,
      skipSnaps: false
    },
    [
      Autoplay({ 
        delay: 5000, 
        stopOnInteraction: true, 
        stopOnMouseEnter: true,
        playOnInit: true
      })
    ]
  );

  // Update selected index on scroll
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Set ready state and restart autoplay after user interaction
  useEffect(() => {
    if (!emblaApi) return;
    
    // Mark as ready when carousel is initialized
    setIsReady(true);
    
    emblaApi.on('select', onSelect);
    emblaApi.on('pointerUp', () => {
      const autoplay = emblaApi.plugins().autoplay;
      if (autoplay) {
        setTimeout(() => {
          autoplay.play();
        }, 3000); // Resume after 3 seconds
      }
    });
    
    onSelect();
    
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Get multiple recent news (up to 3)
  const recentNews = noticias.slice(0, 3);

  useEffect(() => {
    const fetchProximasAudiencias = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('audiencias')
        .select('id, titulo, descricao, data, hora, tema')
        .gte('data', today)
        .order('data', { ascending: true })
        .limit(3);

      if (data && data.length > 0) {
        setProximasAudiencias(data);
      }
    };

    fetchProximasAudiencias();
  }, []);

  // Check if news is recent (within 6 hours)
  const isRecentNews = (date: string) => {
    try {
      const hoursAgo = differenceInHours(new Date(), new Date(date));
      return hoursAgo <= 6;
    } catch {
      return false;
    }
  };

  // Check if event is soon (within 3 days)
  const isEventSoon = (dateStr: string) => {
    try {
      const daysUntil = differenceInDays(new Date(dateStr), new Date());
      return daysUntil >= 0 && daysUntil <= 3;
    } catch {
      return false;
    }
  };

  const formatNewsTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
    } catch {
      return "";
    }
  };

  const formatEventDate = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isToday(date)) {
        return `Hoje às ${timeStr.slice(0, 5)}`;
      }
      if (isTomorrow(date)) {
        return `Amanhã às ${timeStr.slice(0, 5)}`;
      }
      return `${format(date, "d 'de' MMMM", { locale: ptBR })} às ${timeStr.slice(0, 5)}`;
    } catch {
      return "";
    }
  };

  // Build feed items
  const feedItems: FeedItem[] = [
    ...recentNews.map((news) => ({
      id: news.id,
      type: "news" as const,
      title: news.title,
      description: news.description + " " + news.fullContent.slice(0, 80) + "...",
      date: news.date,
      badge: isRecentNews(news.date) ? "Novo" : undefined,
      badgeColor: "destructive"
    })),
    ...proximasAudiencias.map((audiencia) => ({
      id: audiencia.id,
      type: "audiencia" as const,
      title: audiencia.titulo,
      description: audiencia.descricao || `Audiência pública sobre ${audiencia.tema}. Participe e contribua com sua opinião sobre este tema relevante para a cidade.`,
      date: audiencia.data,
      time: audiencia.hora,
      badge: isEventSoon(audiencia.data) ? "Em breve" : undefined,
      badgeColor: "amber"
    }))
  ];

  if (feedItems.length === 0) return null;

  const scrollTo = (index: number) => {
    emblaApi?.scrollTo(index);
  };

  return (
    <motion.div 
      className="w-full mt-6 mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : 20 }}
      transition={{ duration: 0.4 }}
    >
      {/* Section Title */}
      <div className="flex items-center gap-2 mb-3 px-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          O que está rolando
        </span>
      </div>

      {/* Carousel Container - overflow-x-clip allows shadows to show vertically */}
      <div className="overflow-x-clip overflow-y-visible px-4" ref={emblaRef}>
        <div className="flex gap-4 pr-4">
          {feedItems.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => navigate(
                item.type === "news" 
                  ? `/institucional/noticias/${item.id}` 
                  : `/audiencias/${item.id}`
              )}
              className="group flex-shrink-0 w-[80%] max-w-[300px] text-left"
              aria-label={item.title}
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-secondary/5 border border-border/60 shadow-sm hover:shadow-lg hover:border-primary/20 backdrop-blur-sm p-4 h-full min-h-[140px] transition-all duration-300">
                {/* Decorative gradient orb */}
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-primary/15 to-transparent rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-80" />
                
                {/* Header */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {/* Type Chip */}
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                    item.type === "news" 
                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" 
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  )}>
                    {item.type === "news" ? "Notícia" : "Evento"}
                  </span>

                  {/* Status Badge */}
                  {item.badge && (
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                      item.badgeColor === "destructive" 
                        ? "bg-destructive/15 text-destructive animate-pulse" 
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    )}>
                      {item.badge}
                    </span>
                  )}

                  {/* Date/Time */}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {item.type === "news" 
                      ? formatNewsTime(item.date) 
                      : formatEventDate(item.date, item.time || "00:00")}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-1.5 group-hover:text-primary transition-colors duration-200">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Dots */}
      {feedItems.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {feedItems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollTo(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                selectedIndex === idx 
                  ? "bg-primary w-4" 
                  : "bg-muted-foreground/30 w-1.5 hover:bg-muted-foreground/50"
              )}
              aria-label={`Ir para slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ContextualFeed;
