import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useMenu } from "@/contexts/MenuContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

interface AgentHeaderProps {
  onOpenConversations?: () => void;
  onBackToHub?: () => void;
}

const AgentHeader = ({ onBackToHub }: AgentHeaderProps) => {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const { profile, getInitials } = useProfile();
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
      {/* Avatar - Left (opens unified menu) */}
      <Button variant="ghost" size="icon" onClick={openMenu} className="relative">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {profile?.full_name ? getInitials(profile.full_name) : "?"}
          </AvatarFallback>
        </Avatar>
      </Button>
      
      {/* Agent Name - Center (clickable to go back to hub) */}
      <button 
        className="text-lg font-semibold text-foreground"
        onClick={onBackToHub}
      >
        Câmara SP
      </button>
      
      {/* Notifications - Right */}
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
