import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Splash = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Aguarda o loading da autenticação
    if (loading) return;

    const timer = setTimeout(() => {
      // Se usuário logado, vai direto para /ia
      // Se não, vai para /welcome
      navigate(user ? "/ia" : "/welcome");
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, user, loading]);

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
