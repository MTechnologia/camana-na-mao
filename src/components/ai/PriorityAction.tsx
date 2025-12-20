import { motion } from "framer-motion";
import { Star, Mic, FileText, ChevronRight } from "lucide-react";
import { usePendingRatings } from "@/hooks/usePendingRatings";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PriorityActionProps {
  onAction: (message: string) => void;
}

interface PriorityItem {
  type: "rating" | "audiencia" | "report";
  title: string;
  subtitle: string;
  message: string;
  icon: React.ElementType;
  count?: number;
}

const PriorityAction = ({ onAction }: PriorityActionProps) => {
  const { pendingRatings } = usePendingRatings();
  const { user } = useAuth();
  const [upcomingAudiencia, setUpcomingAudiencia] = useState<any>(null);

  useEffect(() => {
    const fetchUpcomingAudiencia = async () => {
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      
      const { data } = await supabase
        .from("audiencia_inscricoes")
        .select(`
          audiencia_id,
          audiencias (
            id,
            titulo,
            data,
            hora,
            status
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "confirmado");

      if (data && data.length > 0) {
        const todayAudiencia = data.find((item: any) => {
          const audiencia = item.audiencias;
          return audiencia?.data === today && audiencia?.status === "agendada";
        });
        
        if (todayAudiencia) {
          setUpcomingAudiencia(todayAudiencia.audiencias);
        }
      }
    };

    fetchUpcomingAudiencia();
  }, [user]);

  // Determine priority action
  const getPriorityAction = (): PriorityItem | null => {
    // Priority 1: Pending ratings
    if (pendingRatings.length > 0) {
      return {
        type: "rating",
        title: "Avaliar serviços visitados",
        subtitle: `${pendingRatings.length} ${pendingRatings.length === 1 ? "avaliação pendente" : "avaliações pendentes"}`,
        message: "Quero avaliar um serviço público que visitei",
        icon: Star,
        count: pendingRatings.length,
      };
    }

    // Priority 2: Today's audiencia
    if (upcomingAudiencia) {
      return {
        type: "audiencia",
        title: "Audiência acontecendo hoje",
        subtitle: upcomingAudiencia.titulo,
        message: `Quero saber mais sobre a audiência "${upcomingAudiencia.titulo}"`,
        icon: Mic,
      };
    }

    // No priority action
    return null;
  };

  const priorityAction = getPriorityAction();

  if (!priorityAction) {
    return null;
  }

  const IconComponent = priorityAction.icon;

  return (
    <motion.button
      onClick={() => onAction(priorityAction.message)}
      className="w-full p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 hover:from-primary/15 hover:to-primary/10 transition-all duration-200 group"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <IconComponent className="w-5 h-5 text-primary" />
          </div>
          {priorityAction.count && priorityAction.count > 0 && (
            <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {priorityAction.count}
            </div>
          )}
        </div>
        
        <div className="flex-1 text-left">
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {priorityAction.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {priorityAction.subtitle}
          </p>
        </div>
        
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </motion.button>
  );
};

export default PriorityAction;
