import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Menu, MoreVertical, Plus, History } from "lucide-react";
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
import { getJourneyIcon } from "@/config/aiJourneys";
import { cn } from "@/lib/utils";

const AgentHeader = () => {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const { currentJourney, activeConversationId, clearJourney, setActiveConversationId } = useAIJourney();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);

  const isInConversation = !!currentJourney || !!activeConversationId;

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

  const handleBack = () => {
    clearJourney();
    setActiveConversationId(null);
  };

  const handleNewConversation = () => {
    clearJourney();
    setActiveConversationId(null);
    toast({
      title: "Nova conversa",
      description: "Uma nova conversa foi iniciada.",
    });
  };

  const handleViewHistory = () => {
    navigate('/conversas');
  };

  // Active Conversation Header
  if (isInConversation && currentJourney) {
    const JourneyIcon = getJourneyIcon(currentJourney.icon);
    
    return (
      <header className={cn(
        "relative flex items-center justify-between h-14 px-4 shrink-0 overflow-hidden",
        "bg-gradient-to-r",
        currentJourney.color
      )}>
        {/* Soft overlay for subtle effect */}
        <div className="absolute inset-0 bg-background/20" />
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-between w-full">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Journey Icon + Label */}
          <div className="flex items-center gap-2 text-white">
            <JourneyIcon className="h-5 w-5" />
            <span className="font-semibold text-sm sm:text-base truncate max-w-[180px] sm:max-w-none">
              {currentJourney.label}
            </span>
          </div>
          
          {/* Kebab Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-white hover:bg-white/20"
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
        </div>
      </header>
    );
  }

  // Hub Header (default)
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card shrink-0">
      {/* Hamburger Menu */}
      <Button variant="ghost" size="icon" onClick={openMenu}>
        <Menu className="h-5 w-5" />
      </Button>
      
      {/* Title */}
      <span className="text-lg font-semibold text-foreground">Câmara SP</span>
      
      {/* Notifications */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => navigate('/notifications')}
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
    </header>
  );
};

export default AgentHeader;
