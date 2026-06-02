import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ChevronLeft, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
});

const ResetPassword = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const isEmailValid = email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse({ email });
      setLoading(true);

      const { error } = await resetPassword(email);

      if (!error) {
        setEmailSent(true);
        toast.success(
          `Enviamos um link de recuperação de senha para o e-mail ${email}. Verifique sua caixa de entrada e caixa de spam.`,
        );
      }
    } catch (error: unknown) {
      const err = error as { errors?: Array<{ message?: string }> };
      if (err?.errors) {
        err.errors.forEach((e) => {
          toast.error(e.message ?? "Erro");
        });
      } else {
        toast.error("Erro ao enviar email de recuperação");
      }
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
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

            <h1 className="text-2xl font-bold text-gray-900 mb-4">E-mail Enviado</h1>

            <p className="text-gray-600 mb-8 leading-relaxed">
              Enviamos um link de recuperação de senha para o e-mail <strong>{email}</strong>.
              Verifique sua caixa de entrada e caixa de spam (lixo eletrônico) e siga as instruções
              no e-mail.
            </p>

            <Button
              onClick={() => navigate("/login")}
              className="w-full h-12 bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
            >
              Voltar para Login
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
          Esqueceu
          <br />
          sua senha?
        </h1>
        <p className="text-gray-600 mt-4">
          Sem problemas! Digite seu email e enviaremos um link para você criar uma nova senha.
        </p>
      </div>

      {/* Form Card */}
      <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Recuperar Senha</h2>

        <form onSubmit={handleResetPassword} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-xl pl-12 pr-12 bg-gray-50 border-gray-200"
              required
            />
            {isEmailValid && (
              <Check
                className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500"
                size={20}
              />
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !isEmailValid}
            className="w-full h-14 bg-gray-900 text-white hover:bg-gray-800 rounded-xl text-base font-medium disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar Link de Recuperação"}
          </Button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-600 mt-8 mb-6">
          Lembrou sua senha?{" "}
          <Link to="/login" className="text-gray-900 font-semibold">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
