import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import splashBg from "@/assets/splash-bg.png";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${splashBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay escuro para melhor legibilidade */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* Conteúdo */}
      <div className="relative z-10 flex flex-col items-center px-8">
        <div className="text-center animate-fade-in mb-12">
          <h1 className="text-white text-5xl font-bold mb-2 drop-shadow-lg">
            Fala
          </h1>
          <h2 className="text-white text-5xl font-bold drop-shadow-lg">
            Cidadão SP
          </h2>
        </div>
        
        {/* Loading spinner animado */}
        <div className="animate-scale-in">
          <Loader2 className="w-12 h-12 text-white animate-spin drop-shadow-lg" />
        </div>
      </div>
    </div>
  );
};

export default Splash;
