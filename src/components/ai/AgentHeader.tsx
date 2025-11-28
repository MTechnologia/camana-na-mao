import { useState, useEffect } from "react";
import { Bell, Menu, MoreVertical, Plus, X } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useMenu } from "@/contexts/MenuContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AgentHeaderProps {
  onOpenConversations?: () => void;
  onBackToHub?: () => void;
  onNewConversation?: () => void;
  onEndConversation?: () => void;
  hasActiveConversation?: boolean;
}

const AgentHeader = ({ 
  onBackToHub, 
  onNewConversation,
  onEndConversation,
  hasActiveConversation = false 
}: AgentHeaderProps) => {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const { profile, getInitials } = useProfile();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEndDialog, setShowEndDialog] = useState(false);

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

  const handleNewConversation = () => {
    onNewConversation?.();
    toast({
      title: "Nova conversa",
      description: "Uma nova conversa foi iniciada.",
    });
  };

  const handleEndConversation = () => {
    setShowEndDialog(true);
  };

  const confirmEndConversation = () => {
    onEndConversation?.();
    setShowEndDialog(false);
    toast({
      title: "Conversa encerrada",
      description: "A conversa foi encerrada com sucesso.",
    });
  };

  return (
    <>
      <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card shrink-0">
        {/* Left: Hamburger + Avatar */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={openMenu}>
            <Menu className="h-5 w-5" />
          </Button>
          <Avatar className="h-7 w-7">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {profile?.full_name ? getInitials(profile.full_name) : "?"}
            </AvatarFallback>
          </Avatar>
        </div>
        
        {/* Center: Agent Name (clickable to go back to hub) */}
        <button 
          className="text-lg font-semibold text-foreground"
          onClick={onBackToHub}
        >
          Câmara SP
        </button>
        
        {/* Right: Notifications + Kebab Menu */}
        <div className="flex items-center gap-1">
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

          {/* Kebab Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleNewConversation}>
                <Plus className="h-4 w-4 mr-2" />
                Nova conversa
              </DropdownMenuItem>
              {hasActiveConversation && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleEndConversation}
                    className="text-destructive focus:text-destructive"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Encerrar conversa
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Confirmation Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              A conversa atual será encerrada e você voltará para a tela inicial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndConversation}>
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AgentHeader;
