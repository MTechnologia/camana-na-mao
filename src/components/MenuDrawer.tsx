import { X, HelpCircle } from "lucide-react";
import avatarLuana from "@/assets/avatar-luana.jpg";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuDrawer = ({ isOpen, onClose }: MenuDrawerProps) => {
  const menuOptions = [
    { id: 1, label: "Menu" },
    { id: 2, label: "Menu" },
    { id: 3, label: "Menu" },
    { id: 4, label: "Menu" },
    { id: 5, label: "Menu" },
    { id: 6, label: "Menu" },
    { id: 7, label: "Menu" },
  ];

  const bottomOptions = [
    { id: 1, label: "Configurar notificações" },
    { id: 2, label: "Central de Atendimento" },
    { id: 3, label: "Política de privacidade" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-50 shadow-2xl transition-transform duration-300 rounded-l-3xl ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-foreground hover:text-foreground/70"
          >
            <X size={28} strokeWidth={2} />
          </button>

          <div className="flex items-center gap-4">
            <img 
              src={avatarLuana} 
              alt="Luana Oliveira" 
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <h2 className="font-bold text-lg text-foreground">Luana Oliveira</h2>
              <p className="text-sm text-foreground/70">Ola seja bem vinda</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-6 px-6 flex-1 overflow-y-auto">
          {menuOptions.map((option) => (
            <button
              key={option.id}
              className="w-full py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
            >
              <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
                <HelpCircle className="text-primary" size={22} />
              </div>
              <span className="text-foreground font-medium text-base">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom Options */}
        <div className="px-6 pb-8 pt-4 space-y-4">
          {bottomOptions.map((option) => (
            <button
              key={option.id}
              className="w-full text-left py-2 text-muted-foreground hover:text-foreground transition-colors text-base"
            >
              {option.label}
            </button>
          ))}
          
          <button className="w-full text-left py-2 text-foreground font-semibold hover:text-primary transition-colors text-base">
            Sair do App Câmera SP
          </button>
        </div>
      </div>
    </>
  );
};

export default MenuDrawer;
