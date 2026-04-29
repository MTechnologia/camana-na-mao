import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, Eye, EyeOff, Check, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { loginSchema } from "@/lib/validations";
import { toast } from "sonner";
import brasaoSP from "@/assets/brasao-sp.png";
import { isAutoConfirmedEmailPending } from "@/lib/emailConfirmationGuard";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  
  const isEmailValid = email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    if (user && isAutoConfirmedEmailPending(user.email)) {
      navigate("/confirmar-email", { replace: true, state: { email: user.email } });
    } else if (user?.email_confirmed_at) {
      navigate("/");
    } else if (user && !user.email_confirmed_at) {
      navigate("/confirmar-email", { replace: true, state: { email: user.email } });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = loginSchema.parse({ email, password });
      setLoading(true);

      if (isAutoConfirmedEmailPending(validated.email)) {
        toast.error("Confirme seu e-mail antes de acessar o app.");
        navigate("/confirmar-email", { replace: true, state: { email: validated.email } });
        return;
      }

      const { error } = await signIn(validated.email, validated.password);

      if (!error) {
        navigate("/");
      } else if (
        error.message?.toLowerCase().includes("email not confirmed") ||
        error.message?.toLowerCase().includes("email confirmation pending")
      ) {
        navigate("/confirmar-email", { replace: true, state: { email: validated.email } });
      }
    } catch (error: unknown) {
      const err = error as { errors?: Array<{ message?: string }> };
      if (err?.errors) {
        err.errors.forEach((e) => toast.error(e.message ?? 'Erro'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col flex-1">
        {/* Header com botão de voltar */}
        <div className="px-6 pt-6">
          <button
            onClick={() => navigate("/")}
            className="-ml-2 text-foreground hover:text-primary transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
        </div>
        
        {/* Logo Header */}
        <div className="flex items-center justify-center gap-4 pt-8 pb-8 px-6">
          <img src={brasaoSP} alt="Brasão São Paulo" className="w-20 h-20" />
          <div className="text-left">
            <p className="text-2xl font-bold text-gray-900">Câmara na Mão</p>
            <p className="text-xs text-gray-600 mt-1">Câmara Municipal de São Paulo</p>
          </div>
        </div>

        {/* Form */}
        <div className="mt-auto">
          <div className="bg-white rounded-t-[32px] px-6 pt-10 pb-6 lg:rounded-[32px] lg:mb-8 lg:shadow-lg">
            <form onSubmit={handleLogin} className="space-y-4 mb-6">
              {/* Email Input */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-xl pl-12 pr-12 bg-gray-50 border-gray-200"
                  required
                />
                {isEmailValid && (
                  <Check className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={20} />
                )}
              </div>

              {/* Password Input */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 rounded-xl pl-12 pr-12 bg-gray-50 border-gray-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Manter Logado e Esqueci a senha */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="keep-logged" 
                    checked={keepLoggedIn}
                    onCheckedChange={(checked) => setKeepLoggedIn(checked as boolean)}
                  />
                  <label htmlFor="keep-logged" className="text-sm text-gray-600 cursor-pointer">
                    Manter Logado
                  </label>
                </div>
                <Link to="/reset-password" className="text-sm text-gray-600 underline">
                  Esqueci a senha
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gray-900 text-white hover:bg-gray-800 rounded-xl text-base font-medium"
              >
                {loading ? "Entrando..." : "Continuar"}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-2">
              Você ainda não tem uma conta?{" "}
              <Link to="/register" className="text-gray-900 font-semibold">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
