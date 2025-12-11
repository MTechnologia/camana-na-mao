import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { noticias } from "@/data/noticias";
import { formatDistanceToNow, format, isToday, isTomorrow, differenceInHours, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Newspaper, Calendar, ChevronRight, Sparkles } from "lucide-react";

interface Audiencia {
  id: string;
  titulo: string;
  data: string;
  hora: string;
}

const ContextualFeed = () => {
  const navigate = useNavigate();
  const [nextAudiencia, setNextAudiencia] = useState<Audiencia | null>(null);

  // Get the most recent news
  const latestNews = noticias.find(n => n.isNew) || noticias[0];

  useEffect(() => {
    const fetchNextAudiencia = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('audiencias')
        .select('id, titulo, data, hora')
        .gte('data', today)
        .order('data', { ascending: true })
        .limit(1);

      if (data && data.length > 0) {
        setNextAudiencia(data[0]);
      }
    };

    fetchNextAudiencia();
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
      return `${format(date, "d 'de' MMM", { locale: ptBR })} às ${timeStr.slice(0, 5)}`;
    } catch {
      return "";
    }
  };

  if (!latestNews && !nextAudiencia) return null;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div 
      className="w-full max-w-md mx-auto px-4 mt-6 mb-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Card Container with Glassmorphism */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-background to-secondary/8 border border-primary/15 shadow-lg backdrop-blur-sm">
        {/* Decorative gradient orb */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
        
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary uppercase tracking-wider">
            O que está rolando
          </span>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 space-y-3">
          {/* News Item */}
          {latestNews && (
            <motion.button
              variants={itemVariants}
              onClick={() => navigate(`/institucional/noticias/${latestNews.id}`)}
              className="w-full group flex items-start gap-3 p-3 rounded-xl bg-background/50 hover:bg-background/80 border border-transparent hover:border-primary/20 transition-all duration-200"
              aria-label={`Notícia: ${latestNews.title}`}
            >
              {/* Icon */}
              <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-blue-500" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-1">
                  {isRecentNews(latestNews.date) && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-destructive/15 text-destructive animate-pulse">
                      Novo
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {formatNewsTime(latestNews.date)}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {latestNews.title}
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="shrink-0 w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          )}

          {/* Audiencia Item */}
          {nextAudiencia && (
            <motion.button
              variants={itemVariants}
              onClick={() => navigate(`/audiencias/${nextAudiencia.id}`)}
              className="w-full group flex items-start gap-3 p-3 rounded-xl bg-background/50 hover:bg-background/80 border border-transparent hover:border-primary/20 transition-all duration-200"
              aria-label={`Audiência: ${nextAudiencia.titulo}`}
            >
              {/* Icon */}
              <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-500" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-1">
                  {isEventSoon(nextAudiencia.data) && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      Em breve
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {formatEventDate(nextAudiencia.data, nextAudiencia.hora)}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {nextAudiencia.titulo}
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="shrink-0 w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ContextualFeed;
