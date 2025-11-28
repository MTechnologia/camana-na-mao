import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { usePendingRatings } from "@/hooks/usePendingRatings";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import AnimatedAIAvatar from "./AnimatedAIAvatar";

const ContextualGreeting = () => {
  const { profile } = useProfile();
  const { pendingRatings } = usePendingRatings();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [nextAudiencia, setNextAudiencia] = useState<any>(null);

  const firstName = profile?.full_name?.split(' ')[0] || "Cidadão";

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

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
      className="flex flex-col items-center justify-center text-center w-full px-4 py-4"
    >
      {/* Agent Avatar com ondas animadas */}
      <div className="mb-4">
        <AnimatedAIAvatar size="md" />
      </div>

      {/* Greeting */}
      <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
        {getTimeGreeting()}, <span className="text-primary">{firstName}</span>!
      </h2>

      {/* Contextual Message */}
      <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
        {getContextualMessage()}
      </p>
    </motion.div>
  );
};

export default ContextualGreeting;
