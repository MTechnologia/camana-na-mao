import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  clearEmailConfirmationPending,
  hasEmailConfirmationCallback,
  isAutoConfirmedEmailPending,
  markEmailConfirmationPending,
} from "@/lib/emailConfirmationGuard";
import { getAuthRedirectUrl } from "@/lib/authRedirect";

const getErrorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : (typeof e === 'object' && e !== null && 'message' in e)
    ? String((e as { message: unknown }).message) : '';

const translateError = (message: string): string => {
  const translations: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos",
    "Email not confirmed": "E-mail não confirmado. Verifique sua caixa de entrada",
    "Email confirmation pending": "Confirme seu e-mail antes de acessar o app",
    "User already registered": "Este e-mail já está cadastrado",
    "Password should be at least 6 characters": "A senha deve ter no mínimo 6 caracteres",
    "Invalid email": "E-mail inválido",
    "Email rate limit exceeded": "Limite de e-mails excedido. Aguarde cerca de 1 hora para tentar de novo",
    "Signup requires a valid password": "Senha inválida",
    "Unable to validate email address": "Não foi possível validar o e-mail",
    "signup_disabled": "Cadastro desabilitado pelo administrador",
    "email_exists": "Este e-mail já está cadastrado",
  };
  const normalized = message.trim();
  if (translations[normalized]) return translations[normalized];
  if (normalized.toLowerCase().includes("password should contain at least one character of each")) {
    return "A senha deve ter pelo menos 8 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial.";
  }
  // Supabase pode enviar "email rate limit exceeded" com outra capitalização
  if (normalized.toLowerCase().includes("email rate limit") || normalized.toLowerCase().includes("rate limit exceeded")) {
    return "Limite de e-mails excedido. Aguarde cerca de 1 hora para tentar de novo";
  }
  // Send Email Hook (Edge send-email) → SendGrid falhou; Supabase devolve texto com "hook" + código HTTP
  if (
    normalized.toLowerCase().includes("unexpected status code returned from hook") ||
    (normalized.toLowerCase().includes("hook") &&
      (normalized.includes("502") || normalized.includes("500") || normalized.includes("503")))
  ) {
    return "Não foi possível enviar o e-mail de recuperação (serviço de envio indisponível ou remetente não validado). Tente de novo em alguns minutos ou fale com o suporte.";
  }
  return message;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ data: { user: User | null } | null; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  resendEmailConfirmation: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email_confirmed_at && hasEmailConfirmationCallback()) {
        clearEmailConfirmationPending(session.user.email);
      }
      if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
        if (isAutoConfirmedEmailPending(session?.user?.email)) {
          navigate('/confirmar-email', { replace: true, state: { email: session?.user?.email } });
        } else if (session?.user?.email_confirmed_at) {
          navigate('/');
        } else {
          navigate('/confirmar-email', { replace: true, state: { email: session?.user?.email } });
        }
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email_confirmed_at && hasEmailConfirmationCallback()) {
        clearEmailConfirmationPending(session.user.email);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, phone: string) => {
    try {
      const redirectUrl = getAuthRedirectUrl();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone,
          }
        }
      });

      // Supabase às vezes retorna sucesso mesmo com e-mail já existente (identities vazio)
      const emailAlreadyExists = !error && data?.user && (data.user.identities?.length ?? 0) === 0;
      if (emailAlreadyExists) {
        const msg = "Este e-mail já está cadastrado.";
        toast.error(msg);
        toast.info("Use «Esqueci a senha» na tela de login ou verifique seu e-mail para confirmar a conta.");
        return { data: null, error: new Error(msg) };
      }

      if (error) throw error;

      if (data.user) {
        const confirmationReason =
          data.session || data.user.email_confirmed_at ? "supabase_auto_confirmed" : "awaiting_email";
        markEmailConfirmationPending(email, confirmationReason);
      }

      if (data.session || data.user?.email_confirmed_at) {
        toast.warning("O Supabase marcou este e-mail como confirmado automaticamente. Verifique se a confirmação de e-mail está ativa no Dashboard.");
      } else {
        toast.success("Enviamos um link para confirmar seu e-mail.");
      }
      return { data: { user: data.user }, error: null };
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      const isEmailExists = (msg.trim() === "User already registered" || msg.trim() === "email_exists");
      // Só loga erros inesperados em dev (evita ruído quando e-mail já cadastrado)
      if ((import.meta.env.DEV || import.meta.env.MODE === "development") && !isEmailExists) {
        const err = error as { message?: string; status?: number };
        console.warn("[Auth] signUp error:", { message: err?.message, status: err?.status });
      }
      const translatedMessage = translateError(msg);
      toast.error(translatedMessage || "Erro ao criar conta");
      if (isEmailExists) {
        toast.info("Faça login na tela de entrada ou use «Esqueci a senha» para redefinir.");
      }
      return { data: null, error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      if (isAutoConfirmedEmailPending(email)) {
        throw new Error("Email confirmation pending");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Register audit log for login
      if (data.user) {
        await supabase.from('audit_logs').insert({
          user_id: data.user.id,
          action: 'login',
          entity_type: 'session',
          metadata: { email },
          user_agent: navigator.userAgent
        });
      }
      
      toast.success("Login realizado com sucesso!");
      return { error: null };
    } catch (error: unknown) {
      const translatedMessage = translateError(getErrorMessage(error));
      toast.error(translatedMessage || "Erro ao fazer login");
      return { error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Register audit log for logout before signing out
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'logout',
          entity_type: 'session',
          user_agent: navigator.userAgent
        });
      }
      
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso!");
      navigate('/login');
    } catch (error: unknown) {
      const translatedMessage = translateError(getErrorMessage(error));
      toast.error(translatedMessage || "Erro ao fazer logout");
    }
  }, [user, navigate]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      // Get the correct origin (handle both dev and production)
      const origin = window.location.origin;
      const redirectUrl = `${origin}/nova-senha`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      
      toast.success("E-mail de recuperação enviado!");
      return { error: null };
    } catch (error: unknown) {
      const translatedMessage = translateError(getErrorMessage(error));
      toast.error(translatedMessage || "Erro ao enviar e-mail");
      return { error };
    }
  }, []);

  const resendEmailConfirmation = useCallback(async (email: string) => {
    try {
      const redirectUrl = getAuthRedirectUrl();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      toast.success("E-mail de confirmação reenviado!");
      return { error: null };
    } catch (error: unknown) {
      const translatedMessage = translateError(getErrorMessage(error));
      toast.error(translatedMessage || "Erro ao reenviar confirmação");
      return { error: error as Error };
    }
  }, []);

  const value = useMemo(() => ({ 
    user, 
    session, 
    loading, 
    signUp, 
    signIn, 
    signOut, 
    resetPassword,
    resendEmailConfirmation,
  }), [user, session, loading, signUp, signIn, signOut, resetPassword, resendEmailConfirmation]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- Context pattern: Provider + hook in same file
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
