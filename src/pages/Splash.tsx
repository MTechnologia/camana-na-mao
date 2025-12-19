import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Splash = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Timer mínimo para exibir a splash
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Navega quando auth terminar de carregar E tempo mínimo passar
  useEffect(() => {
    if (!loading && minTimeElapsed) {
      navigate(user ? "/ia" : "/welcome", { replace: true });
    }
  }, [loading, minTimeElapsed, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-rose-600 via-rose-500 to-pink-400">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-rose-800/20 rounded-full blur-3xl" />
      </div>

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
