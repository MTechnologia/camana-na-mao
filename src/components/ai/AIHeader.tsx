import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AIHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-background shadow-sm" style={{ height: '60px' }}>
      <div className="flex items-center justify-between px-4 h-full">
        <button
          onClick={() => navigate("/home")}
          className="text-foreground hover:text-primary transition-colors"
          aria-label="Voltar para Home"
        >
          <ChevronLeft size={28} strokeWidth={2} />
        </button>

        <h1 className="text-sm font-medium text-foreground">
          Assistente IA
        </h1>

        <div className="w-6" /> {/* Spacer for centering */}
      </div>
    </header>
  );
};

export default AIHeader;
