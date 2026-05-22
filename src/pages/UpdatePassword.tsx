import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ChevronLeft, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PasswordRequirementsChecklist } from "@/components/auth/PasswordRequirementsChecklist";
import { updatePasswordSchema, validatePasswordPolicy } from "@/lib/validations";
import { isInsideNativeApp } from "@/lib/nativeBridge";
import { formatAuthErrorForUser } from "@/lib/authErrorMessages";

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const isPasswordValid = validatePasswordPolicy(password);
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    let mounted = true;
    
    // Listen for auth state changes to detect when recovery session is established
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, 'Session:', !!session);
      
      if (!mounted) return;
      
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (session) {
          setSessionReady(true);
          setCheckingSession(false);
        }
      }
      
      if (event === 'USER_UPDATED') {
        // Password was updated successfully
        console.log('User updated event received');
      }
    });

    // Check if there's already a valid session (user might have clicked the link and session is already established)
    const checkExistingSession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenHash = urlParams.get("token_hash");
        const queryType = urlParams.get("type");

        if (tokenHash && queryType === "recovery") {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });

          if (!mounted) return;

          if (verifyError) {
            console.error("Recovery verifyOtp failed:", verifyError);
            toast.error("Link de recuperação inválido ou expirado. Solicite um novo.");
            setTimeout(() => navigate("/reset-password"), 2000);
            return;
          }

          window.history.replaceState({}, document.title, window.location.pathname);
          setSessionReady(true);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session && !error) {
          console.log("Existing session found");
          setSessionReady(true);
        } else {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const type = hashParams.get("type");

          if (accessToken && type === "recovery") {
            console.log("Recovery token found in URL hash, waiting for session...");
            setTimeout(async () => {
              const { data: { session: newSession } } = await supabase.auth.getSession();
              if (mounted && newSession) {
                setSessionReady(true);
              }
              setCheckingSession(false);
            }, 1000);
            return;
          }

          const tokenFromQuery = urlParams.get("access_token") || urlParams.get("token");

          if (!accessToken && !tokenFromQuery) {
            console.log("No recovery token found");
            if (mounted) {
              toast.error("Link de recuperação inválido ou expirado. Solicite um novo.");
              setTimeout(() => navigate("/reset-password"), 2000);
            }
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    // Small delay to allow Supabase to process the token from URL
    const timer = setTimeout(checkExistingSession, 500);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionReady) {
      toast.error("Sessão de recuperação não encontrada. Solicite um novo link.");
      return;
    }

    try {
      updatePasswordSchema.parse({ password, confirmPassword });
      setLoading(true);

      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) {
        throw error;
      }

      // Fazer logout silencioso para forçar novo login com nova senha
      await supabase.auth.signOut();

      setSuccess(true);
      toast.success("Senha alterada com sucesso!");
    } catch (error: unknown) {
      console.error('Error updating password:', error);
      const err = error as { errors?: Array<{ message?: string }>; message?: string };
      if (err.errors) {
        err.errors.forEach((e) => {
          toast.error(e.message ?? 'Erro');
        });
      } else {
        const msg = err.message ?? "";
        if (msg.toLowerCase().includes("session")) {
          toast.error("Sessão expirada. Solicite um novo link de recuperação.");
          setTimeout(() => navigate("/reset-password"), 2000);
        } else {
          toast.error(formatAuthErrorForUser(error, "Erro ao alterar senha"));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center mx-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Verificando link de recuperação...
          </h2>
          <p className="text-gray-600">
            Aguarde enquanto validamos seu acesso.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    const inNativeApp = isInsideNativeApp();

    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="px-6 pt-8 pb-6">
          {inNativeApp ? (
            <div className="h-6" aria-hidden />
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="-ml-2 text-foreground hover:text-primary transition-colors"
              aria-label="Voltar"
            >
              <ChevronLeft size={24} strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="text-green-600" size={32} />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">Senha atualizada</h1>

            <p className="text-gray-600 mb-8 leading-relaxed">
              Sua senha foi atualizada. Volte ao aplicativo e realize novamente a tentativa de Login.
            </p>

            {inNativeApp && (
              <Button
                onClick={() => navigate("/login")}
                className="w-full h-12 bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
              >
                Fazer login
              </Button>
            )}
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
          Criar nova senha
        </h1>
        <p className="text-gray-600 mt-4">
          Digite sua nova senha abaixo. Use as mesmas regras do cadastro (8+ caracteres, maiúscula, minúscula, número e caractere especial).
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

          <PasswordRequirementsChecklist
            password={password}
            className="border-gray-200 bg-gray-50"
          />
          {confirmPassword.length > 0 && (
            <p
              className={`flex items-center gap-2 text-sm ${
                doPasswordsMatch ? "text-green-600" : "text-gray-500"
              }`}
            >
              {doPasswordsMatch ? <Check size={14} /> : <span className="w-3.5" />}
              As senhas coincidem
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !isPasswordValid || !doPasswordsMatch || !sessionReady}
            className="w-full h-14 bg-gray-900 text-white hover:bg-gray-800 rounded-xl text-base font-medium disabled:opacity-50 mt-6"
          >
            {loading ? "Alterando..." : "Alterar Senha"}
          </Button>
          
          {!sessionReady && !checkingSession && (
            <p className="text-center text-sm text-red-500 mt-2">
              Sessão de recuperação não encontrada. 
              <button 
                type="button"
                onClick={() => navigate("/reset-password")}
                className="underline ml-1"
              >
                Solicitar novo link
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;
