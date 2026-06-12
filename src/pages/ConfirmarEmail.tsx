import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isAutoConfirmedEmailPending } from "@/lib/emailConfirmationGuard";

const ConfirmarEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, resendEmailConfirmation } = useAuth();
  const [resending, setResending] = useState(false);
  // Cooldown (segundos) entre reenvios do e-mail de confirmação — evita cliques
  // repetidos/abuso e indica ao usuário quando poderá reenviar. Sugestão: 60s.
  const RESEND_COOLDOWN_SECONDS = 60;
  const [cooldown, setCooldown] = useState(0);
  const state = location.state as { email?: string } | null;
  const searchEmail = new URLSearchParams(location.search).get("email") ?? undefined;
  const email = state?.email ?? user?.email ?? searchEmail;
  const requiresSupabaseConfiguration = isAutoConfirmedEmailPending(email);
  const isEmailConfirmed = Boolean(user?.email_confirmed_at) && !requiresSupabaseConfiguration;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    try {
      await resendEmailConfirmation(email);
    } finally {
      setResending(false);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
  };

  const handleGoToLogin = async () => {
    if (user && !isEmailConfirmed) {
      await supabase.auth.signOut().catch(() => undefined);
    }
    navigate("/login", { replace: true });
  };

  const handlePrimaryAction = async () => {
    if (isEmailConfirmed) {
      navigate("/");
      return;
    }

    await handleGoToLogin();
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isEmailConfirmed ? "E-mail confirmado" : "Confirme seu e-mail"}
          </h1>
          <p className="text-muted-foreground">
            {isEmailConfirmed ? (
              <>Seu e-mail já está confirmado. Você já pode acessar o app.</>
            ) : email ? (
              <>
                {requiresSupabaseConfiguration ? (
                  <>
                    O cadastro foi criado para <strong className="text-foreground">{email}</strong>,
                    mas o Supabase marcou o e-mail como confirmado automaticamente.
                  </>
                ) : (
                  <>
                    Enviamos um link de confirmação para{" "}
                    <strong className="text-foreground">{email}</strong>. Abra seu e-mail e clique
                    no link para ativar sua conta.
                  </>
                )}
              </>
            ) : (
              <>
                Enviamos um link de confirmação para o e-mail informado no cadastro. Abra sua caixa
                de entrada e clique no link para ativar sua conta.
              </>
            )}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {isEmailConfirmed
            ? "Se o app não abrir automaticamente, use o botão abaixo."
            : requiresSupabaseConfiguration
              ? "Para exigir validação real, ative a confirmação de e-mail no Supabase Auth. Até lá, este navegador não liberará o login desse cadastro."
              : "Depois de confirmar, você poderá fazer login e acessar o app normalmente."}
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={() => void handlePrimaryAction()} className="w-full">
            {isEmailConfirmed ? "Entrar no app" : "Ir para o login"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          {!isEmailConfirmed && email && !requiresSupabaseConfiguration && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleResend()}
              disabled={resending || cooldown > 0}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${resending ? "animate-spin" : ""}`} />
              {resending
                ? "Reenviando..."
                : cooldown > 0
                  ? `Reenviar em ${cooldown}s`
                  : "Reenviar e-mail de confirmação"}
            </Button>
          )}
          <Link to="/welcome" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarEmail;
