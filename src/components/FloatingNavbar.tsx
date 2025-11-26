import { useState } from "react";
import { Home, MessageCircle, Bell, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const FloatingNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const menuItems = [
    { id: "home", icon: Home, label: "Home", path: "/home" },
    { id: "chat", icon: MessageCircle, label: "Chat", path: "/ia" },
    { id: "notifications", icon: Bell, label: "Notificação", path: "/notifications" },
    { id: "menu", icon: Menu, label: "Menu", path: "/menu" },
  ];

  const getActiveIndex = () => {
    const index = menuItems.findIndex(item => location.pathname === item.path);
    return index >= 0 ? index : 0;
  };

  const [activeIndex, setActiveIndex] = useState(getActiveIndex());

  const handleItemClick = (index: number, path: string) => {
    setActiveIndex(index);
    navigate(path);
  };

  const indicatorLeft = `${(activeIndex * 25)}%`;

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-md z-50">
      <div className="bg-card border border-border rounded-full px-4 py-3 shadow-2xl backdrop-blur-lg bg-opacity-95">
        <div className="relative flex items-center justify-around">
          {/* Animated indicator */}
          <div
            className="absolute bottom-0 h-1 bg-primary rounded-full transition-all duration-300 ease-out"
            style={{
              left: indicatorLeft,
              width: "25%",
            }}
          />

          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeIndex === index;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(index, item.path)}
                className={`flex flex-col items-center gap-1 py-2 transition-all duration-300 ${
                  isActive ? "scale-110" : "scale-100"
                }`}
              >
                <Icon
                  size={24}
                  className={`transition-colors duration-300 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-xs font-medium transition-colors duration-300 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default FloatingNavbar;
