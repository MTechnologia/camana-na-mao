import { useState, useEffect } from "react";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useMenu } from "@/contexts/MenuContext";
import { supabase } from "@/integrations/supabase/client";

interface AgentHeaderProps {
  onBackToHub?: () => void;
}

const AgentHeader = ({ onBackToHub }: AgentHeaderProps) => {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const [unreadCount, setUnreadCount] = useState(0);

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

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card shrink-0">
      {/* Left: Hamburger */}
      <Button variant="ghost" size="icon" onClick={openMenu}>
        <Menu className="h-5 w-5" />
      </Button>
      
      {/* Center: Agent Name (clickable to go back to hub) */}
      <button 
        className="text-lg font-semibold text-foreground"
        onClick={onBackToHub}
      >
        Câmara SP
      </button>
      
      {/* Right: Notifications */}
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
