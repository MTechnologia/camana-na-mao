import { X, ChevronRight } from "lucide-react";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuDrawer = ({ isOpen, onClose }: MenuDrawerProps) => {
  const menuOptions = [
    { id: 1, label: "Meus Dados", icon: "👤" },
    { id: 2, label: "Protocolos", icon: "📄" },
    { id: 3, label: "Agendamentos", icon: "📅" },
    { id: 4, label: "Documentos", icon: "📋" },
    { id: 5, label: "Favoritos", icon: "⭐" },
    { id: 6, label: "Configurações", icon: "⚙️" },
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
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-background z-50 shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-muted-foreground hover:text-foreground"
          >
            <X size={24} />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-white text-2xl font-semibold">
              LO
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">Luana Oliveira</h2>
              <p className="text-sm text-muted-foreground">luana@email.com</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-4">
          {menuOptions.map((option) => (
            <button
              key={option.id}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{option.icon}</span>
                <span className="text-foreground font-medium">{option.label}</span>
              </div>
              <ChevronRight 
                size={20} 
                className="text-muted-foreground group-hover:text-foreground transition-colors" 
              />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
          <button className="text-primary font-medium flex items-center gap-2">
            <span>Sair da conta</span>
            <ChevronRight size={20} />
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            Versão 1.0.0
          </p>
        </div>
      </div>
    </>
  );
};

export default MenuDrawer;
