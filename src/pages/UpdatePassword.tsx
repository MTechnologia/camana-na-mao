import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ChevronLeft, Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [success, setSuccess] = useState(false);

  const isPasswordValid = password.length >= 6;
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    // Check if user arrived via password recovery link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoverySession(true);
      }
    });

    // Also check URL for recovery parameters
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    if (type === 'recovery') {
      setIsRecoverySession(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      passwordSchema.parse({ password, confirmPassword });
      setLoading(true);

      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      toast.success("Senha alterada com sucesso!");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          toast.error(err.message);
        });
      } else {
        toast.error(error.message || "Erro ao alterar senha");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="px-6 pt-8 pb-6">
          <button
            onClick={() => navigate("/login")}
            className="-ml-2 text-foreground hover:text-primary transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="text-green-600" size={32} />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Senha Alterada!
            </h1>
            
            <p className="text-gray-600 mb-8">
              Sua senha foi alterada com sucesso. Você será redirecionado para a tela de login.
            </p>

            <Button
              onClick={() => navigate("/login")}
              className="w-full h-12 bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
            >
              Ir para Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header com botão de voltar */}
      <div className="px-6 pt-8 pb-2">
        <button
          onClick={() => navigate("/login")}
          className="-ml-2 text-foreground hover:text-primary transition-colors"
          aria-label="Voltar"
        >
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
      </div>

      {/* Header Text */}
      <div className="px-6 pb-6">
        <h1 className="text-4xl font-bold text-gray-900 leading-tight">
          Criar nova<br />
          senha
        </h1>
        <p className="text-gray-600 mt-4">
          Digite sua nova senha abaixo. Ela deve ter no mínimo 6 caracteres.
        </p>
      </div>

      {/* Form Card */}
      <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Nova Senha
        </h2>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-xl pl-12 pr-12 bg-gray-50 border-gray-200"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-14 rounded-xl pl-12 pr-12 bg-gray-50 border-gray-200"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {doPasswordsMatch && (
              <Check className="absolute right-12 top-1/2 -translate-y-1/2 text-green-500" size={20} />
            )}
          </div>

          {/* Password requirements hint */}
          <div className="text-sm text-gray-500 space-y-1">
            <p className={`flex items-center gap-2 ${isPasswordValid ? 'text-green-600' : ''}`}>
              {isPasswordValid ? <Check size={14} /> : <span className="w-3.5" />}
              Mínimo de 6 caracteres
            </p>
            <p className={`flex items-center gap-2 ${doPasswordsMatch ? 'text-green-600' : ''}`}>
              {doPasswordsMatch ? <Check size={14} /> : <span className="w-3.5" />}
              As senhas coincidem
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || !isPasswordValid || !doPasswordsMatch}
            className="w-full h-14 bg-gray-900 text-white hover:bg-gray-800 rounded-xl text-base font-medium disabled:opacity-50 mt-6"
          >
            {loading ? "Alterando..." : "Alterar Senha"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;
