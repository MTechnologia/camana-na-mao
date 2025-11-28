import { useState, useEffect } from "react";
import { Menu, Bell, MessageSquare, Settings, User, LogOut, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useMenu } from "@/contexts/MenuContext";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AgentHeaderProps {
  onOpenConversations?: () => void;
  onBackToHub?: () => void;
}

const AgentHeader = ({ onOpenConversations, onBackToHub }: AgentHeaderProps) => {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const { profile, getInitials } = useProfile();
  const { signOut } = useAuth();
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
      {/* Menu Button - Left */}
      <Button variant="ghost" size="icon" onClick={openMenu}>
        <Menu className="h-5 w-5" />
      </Button>
      
      {/* Agent Name - Center (clickable to go back to hub) */}
      <Button 
        variant="ghost" 
        className="flex items-center gap-2 hover:bg-accent/50"
        onClick={onBackToHub}
      >
        <Home className="h-4 w-4 text-muted-foreground" />
        <span className="text-lg font-semibold text-foreground">Câmara SP</span>
      </Button>
      
      {/* Avatar with Dropdown - Right */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {profile?.full_name ? getInitials(profile.full_name) : "?"}
              </AvatarFallback>
            </Avatar>
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] p-0 flex items-center justify-center text-[10px] rounded-full"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-popover border border-border shadow-lg z-50">
          <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
            <User className="h-4 w-4 mr-2" />
            <span>Meu Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/notifications')} className="cursor-pointer">
            <Bell className="h-4 w-4 mr-2" />
            <span>Notificações</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {unreadCount}
              </Badge>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenConversations} className="cursor-pointer lg:hidden">
            <MessageSquare className="h-4 w-4 mr-2" />
            <span>Conversas</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/profile/preferences')} className="cursor-pointer">
            <Settings className="h-4 w-4 mr-2" />
            <span>Configurações</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => signOut()} 
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default AgentHeader;
