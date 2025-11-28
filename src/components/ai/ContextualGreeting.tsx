import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { usePendingRatings } from "@/hooks/usePendingRatings";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import iaIcone from "@/assets/ia-icone.png";

const ContextualGreeting = () => {
  const { profile } = useProfile();
  const { pendingRatings } = usePendingRatings();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [nextAudiencia, setNextAudiencia] = useState<any>(null);

  const firstName = profile?.full_name?.split(' ')[0] || "Cidadão";

  // Get contextual greeting based on time of day
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Fetch unread notifications
  useEffect(() => {
    const fetchUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);
        setUnreadNotifications(count || 0);
      }
    };
    fetchUnread();
  }, []);

  // Fetch next audiência
  useEffect(() => {
    const fetchNextAudiencia = async () => {
      const { data } = await supabase
        .from("audiencias")
        .select("titulo, data, hora")
        .eq("status", "upcoming")
        .order("data", { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (data) setNextAudiencia(data);
    };
    fetchNextAudiencia();
  }, []);

  // Build contextual message
  const getContextualMessage = () => {
    const messages: string[] = [];

    if (pendingRatings.length > 0) {
      messages.push(`Você tem ${pendingRatings.length} avaliação${pendingRatings.length > 1 ? 'ões' : ''} pendente${pendingRatings.length > 1 ? 's' : ''}.`);
    }

    if (unreadNotifications > 0) {
      messages.push(`${unreadNotifications} notificação${unreadNotifications > 1 ? 'ões' : ''} nova${unreadNotifications > 1 ? 's' : ''}.`);
    }

    if (nextAudiencia) {
      const date = new Date(nextAudiencia.data);
      const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      messages.push(`Próxima audiência: ${formattedDate}.`);
    }

    if (messages.length === 0) {
      return "Como posso ajudar você hoje?";
    }

    return messages.join(' ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center text-center px-4 sm:px-6 pt-6 sm:pt-8 pb-2"
    >
      {/* Agent Avatar */}
      <motion.div
        className="relative w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-4"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-secondary to-accent opacity-20 blur-xl" />
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-1 shadow-lg">
          <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
            <img src={iaIcone} alt="Câmara SP" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
          </div>
        </div>
      </motion.div>

      {/* Greeting */}
      <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-1 sm:mb-2">
        {getTimeGreeting()}, <span className="text-primary">{firstName}</span>!
      </h2>

      {/* Contextual Message */}
      <p className="text-muted-foreground text-xs sm:text-sm max-w-xs sm:max-w-sm leading-relaxed">
        {getContextualMessage()}
      </p>
    </motion.div>
  );
};

export default ContextualGreeting;
