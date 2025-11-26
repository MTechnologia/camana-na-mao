import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageSquare, Bell, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMenu } from "@/contexts/MenuContext";

const FloatingNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openMenu } = useMenu();
  const [unreadCount, setUnreadCount] = useState(0);

  // Buscar contador de notificações não lidas
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
          
          setUnreadCount(count || 0);

          // Setup realtime
          const channel = supabase
            .channel('notifications-count')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`,
              },
              () => {
                // Refetch count on any change
                fetchUnreadCount();
              }
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

  const menuItems = [
    { name: "Home", icon: Home, path: "/home" },
    { name: "Chat", icon: MessageSquare, path: "/ia" },
    { name: "Notificações", icon: Bell, path: "/notifications", badge: unreadCount },
    { name: "Menu", icon: Menu, path: "/menu", isMenuButton: true },
  ];

  const getActiveIndex = () => {
    const index = menuItems.findIndex(item => item.path === location.pathname);
    return index === -1 ? 0 : index;
  };

  const [activeIndex, setActiveIndex] = useState(getActiveIndex());

  useEffect(() => {
    setActiveIndex(getActiveIndex());
  }, [location.pathname]);

  const handleItemClick = (index: number, path: string, isMenuButton?: boolean) => {
    if (isMenuButton) {
      openMenu();
      setActiveIndex(index);
    } else {
      setActiveIndex(index);
      navigate(path);
    }
  };

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-black rounded-full shadow-lg px-2 py-2 relative flex items-center gap-1">
        {/* Menu items */}
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeIndex === index;
          
          return (
            <button
              key={item.name}
              onClick={() => handleItemClick(index, item.path, item.isMenuButton)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                ${isActive 
                  ? "bg-white text-black" 
                  : "text-gray-400"
                }
              `}
            >
              <div className="relative">
                <Icon size={20} />
                {item.badge !== undefined && item.badge > 0 && !isActive && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] min-h-[16px] h-4 w-4 p-0 flex items-center justify-center text-[10px] leading-none rounded-full"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </div>
              {isActive && (
                <span className="text-sm font-medium whitespace-nowrap">
                  {item.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default FloatingNavbar;
