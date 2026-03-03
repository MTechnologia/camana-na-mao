import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Menu, MoreVertical, Plus, History, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useMenu } from "@/contexts/MenuContext";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const headerVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const }
  }
};

const AgentHeader = () => {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const { activeConversationId, clearConversation } = useAIJourney();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);

  const isInConversation = !!activeConversationId;

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);
          setUnreadCount(count || 0);

          // Setup realtime
          const channel = supabase
            .channel('agent-notifications')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`,
              },
              () => fetchUnreadCount()
            )
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        }
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
      }
    };
    fetchUnreadCount();
  }, []);

  // Saída fluida sem modal - apenas volta para home
  const handleBack = () => {
    clearConversation();
  };

  const handleNewConversation = () => {
    clearConversation();
    toast({
      title: "Nova conversa",
      description: "Uma nova conversa foi iniciada.",
    });
  };

  const handleViewHistory = () => {
    navigate('/conversas');
  };

  const headerLabel = "Assistente Câmara na Mão";
  const headerColor = "from-primary/80 to-primary";

  return (
    <>
      <AnimatePresence mode="wait">
        {isInConversation ? (
          <motion.header
            key="conversation-header"
            variants={headerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              "fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 overflow-hidden",
              "lg:left-[280px] xl:left-[320px] 2xl:left-[360px]",
              "bg-gradient-to-r",
              headerColor
            )}
          >
            {/* Animated overlay */}
            <motion.div 
              className="absolute inset-0 bg-background/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            />
            
            {/* Content */}
            <div className="relative z-10 flex items-center justify-between w-full">
              {/* Back Button with slide animation */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.25 }}
              >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleBack}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </motion.div>
              
              {/* Icon + Label with scale animation */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex items-center gap-2 text-white"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="font-semibold text-sm sm:text-base truncate max-w-[180px] sm:max-w-none">
                  {headerLabel}
                </span>
              </motion.div>
              
              {/* Kebab Menu with fade animation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.25 }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-white hover:bg-white/20"
                      data-testid="conversations-menu"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleNewConversation}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova conversa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleViewHistory}>
                      <History className="h-4 w-4 mr-2" />
                      Ver histórico
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            </div>
          </motion.header>
        ) : (
          <motion.header
            key="hub-header"
            variants={headerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 border-b border-border bg-card lg:left-[280px] xl:left-[320px] 2xl:left-[360px]"
          >
            {/* Hamburger Menu */}
            <motion.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              <Button variant="ghost" size="icon" onClick={openMenu} data-testid="menu-button">
                <Menu className="h-5 w-5" />
              </Button>
            </motion.div>
            
            {/* Title - clickable to reset to home */}
            <motion.button
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.25 }}
              className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
              onClick={() => {
                clearConversation();
              }}
            >
              Câmara na Mão
            </motion.button>
            
            {/* Right Actions */}
            <motion.div
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              className="flex items-center gap-1"
            >
              {/* Notifications */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/notificacoes')}
                className="relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] p-0 flex items-center justify-center text-[10px] rounded-full"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </motion.div>
          </motion.header>
        )}
      </AnimatePresence>
    </>
  );
};

export default AgentHeader;
