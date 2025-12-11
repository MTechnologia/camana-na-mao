import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { noticias } from "@/data/noticias";
import { formatDistanceToNow, format, isToday, isTomorrow, differenceInHours, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Newspaper, Calendar, ChevronRight, Sparkles } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

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
  
  const [emblaRef] = useEmblaCarousel(
    { 
      loop: true, 
      align: "start",
      containScroll: false,
      dragFree: true
    },
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

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

  return (
    <motion.div 
      className="w-full mt-6 mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Section Title */}
      <div className="flex items-center gap-2 mb-3 px-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          O que está rolando
        </span>
      </div>

      {/* Carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3 pl-4">
          {feedItems.map((item, index) => (
            <motion.button
              key={`${item.type}-${item.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              onClick={() => navigate(
                item.type === "news" 
                  ? `/institucional/noticias/${item.id}` 
                  : `/audiencias/${item.id}`
              )}
              className="group flex-shrink-0 w-[85%] max-w-[320px] text-left"
              aria-label={item.title}
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-background to-secondary/8 border border-primary/15 shadow-lg backdrop-blur-sm p-4 h-full min-h-[140px] hover:border-primary/30 hover:shadow-xl transition-all duration-300">
                {/* Decorative gradient orb */}
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
                
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  {/* Icon */}
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    item.type === "news" 
                      ? "bg-gradient-to-br from-blue-500/20 to-blue-600/10" 
                      : "bg-gradient-to-br from-amber-500/20 to-amber-600/10"
                  }`}>
                    {item.type === "news" ? (
                      <Newspaper className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Calendar className="w-4 h-4 text-amber-500" />
                    )}
                  </div>

                  {/* Badge */}
                  {item.badge && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      item.badgeColor === "destructive" 
                        ? "bg-destructive/15 text-destructive animate-pulse" 
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}>
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
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                {/* Read more indicator */}
                <div className="flex items-center gap-1 mt-2 text-xs text-primary/70 group-hover:text-primary transition-colors">
                  <span>Saiba mais</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </motion.button>
          ))}
          
          {/* Spacer for peek effect */}
          <div className="flex-shrink-0 w-4" />
        </div>
      </div>
    </motion.div>
  );
};

export default ContextualFeed;
