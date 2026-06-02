import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { usePendingRatings } from "@/hooks/usePendingRatings";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import AnimatedAIAvatar from "./AnimatedAIAvatar";

const ContextualGreeting = () => {
  const { profile } = useProfile();
  const { pendingRatings } = usePendingRatings();
  const [nextAudiencia, setNextAudiencia] = useState<{
    id: string;
    titulo?: string;
    data?: string;
  } | null>(null);

  const firstName = profile?.full_name?.split(" ")[0] || "Cidadão";

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

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
      messages.push(
        `Você tem ${pendingRatings.length} avaliação${pendingRatings.length > 1 ? "ões" : ""} pendente${pendingRatings.length > 1 ? "s" : ""}.`,
      );
    }

    if (nextAudiencia) {
      const date = new Date(nextAudiencia.data);
      const formattedDate = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      messages.push(`Próxima audiência: ${formattedDate}.`);
    }

    if (messages.length === 0) {
      return "Como posso ajudar você hoje?";
    }

    return messages.join(" ");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-4 w-full max-w-md px-4 py-4"
    >
      {/* Agent Avatar com ondas animadas - à esquerda */}
      <div className="shrink-0">
        <AnimatedAIAvatar size="md" />
      </div>

      {/* Text Content - à direita */}
      <div className="flex flex-col text-left">
        {/* Greeting */}
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
          {getTimeGreeting()}, <span className="text-primary">{firstName}</span>!
        </h2>

        {/* Contextual Message */}
        <p className="text-muted-foreground text-sm leading-relaxed">{getContextualMessage()}</p>
      </div>
    </motion.div>
  );
};

export default ContextualGreeting;
