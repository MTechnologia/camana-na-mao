import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AIHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-transparent">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate("/home")}
          className="text-foreground hover:text-primary transition-colors"
          aria-label="Voltar para Home"
        >
          <ArrowLeft size={24} />
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
