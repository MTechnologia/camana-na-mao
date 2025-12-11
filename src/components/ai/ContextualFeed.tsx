import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { noticias } from "@/data/noticias";
import { formatDistanceToNow, format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
        .limit(1)
        .single();

      if (data) {
        setNextAudiencia(data);
      }
    };

    fetchNextAudiencia();
  }, []);

  const formatNewsTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false, locale: ptBR });
    } catch {
      return "";
    }
  };

  const formatEventDate = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isToday(date)) {
        return `Hoje, ${timeStr.slice(0, 5)}`;
      }
      if (isTomorrow(date)) {
        return `Amanhã, ${timeStr.slice(0, 5)}`;
      }
      return `${format(date, "d MMM", { locale: ptBR })}, ${timeStr.slice(0, 5)}`;
    } catch {
      return "";
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "…";
  };

  if (!latestNews && !nextAudiencia) return null;

  return (
    <motion.div 
      className="flex flex-col gap-1 text-center mt-4 mb-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.3 }}
    >
      {latestNews && (
        <button
          onClick={() => navigate(`/institucional/noticias/${latestNews.id}`)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-full px-4"
          aria-label={`Notícia: ${latestNews.title}`}
        >
          📰 {truncateText(latestNews.title, 40)} • {formatNewsTime(latestNews.date)}
        </button>
      )}
      
      {nextAudiencia && (
        <button
          onClick={() => navigate(`/audiencias/${nextAudiencia.id}`)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-full px-4"
          aria-label={`Audiência: ${nextAudiencia.titulo}`}
        >
          📅 {truncateText(nextAudiencia.titulo, 35)} • {formatEventDate(nextAudiencia.data, nextAudiencia.hora)}
        </button>
      )}
    </motion.div>
  );
};

export default ContextualFeed;
