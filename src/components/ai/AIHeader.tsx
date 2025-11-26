import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const AIHeader = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/80 dark:bg-background/80 backdrop-blur-lg shadow-sm' 
        : 'bg-transparent'
    }`}>
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
