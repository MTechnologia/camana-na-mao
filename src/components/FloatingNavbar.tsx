import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageSquare, Bell, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMenu } from "@/contexts/MenuContext";
import { useNotifications } from "@/contexts/NotificationsContext";

const FloatingNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openMenu } = useMenu();
  const { unreadCount } = useNotifications();

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
                {item.badge && !isActive && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full"
                  >
                    {item.badge}
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
