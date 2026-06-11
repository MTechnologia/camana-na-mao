import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
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
import { getAuthRedirectUrl, getPasswordRecoveryRedirectUrl } from "@/lib/authRedirect";
import {
  formatAuthErrorForUser,
  getAuthErrorCode,
  getAuthErrorMessage,
  translateAuthError,
} from "@/lib/authErrorMessages";
import { withTimeout } from "@/lib/promiseTimeout";

const AUTH_INIT_TIMEOUT_MS = 8_000;
// Login/logout toleram mais latência (rede móvel lenta, cold start do Auth) que a
// restauração de sessão na inicialização — evita falso "timeout" no login.
const AUTH_SIGNIN_TIMEOUT_MS = 20_000;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
  ) => Promise<{ data: { user: User | null } | null; error: Error | null }>;
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email_confirmed_at && hasEmailConfirmationCallback()) {
        clearEmailConfirmationPending(session.user.email);
      }
      if (event === "SIGNED_IN" && window.location.pathname === "/login") {
        if (isAutoConfirmedEmailPending(session?.user?.email)) {
          navigate("/confirmar-email", { replace: true, state: { email: session?.user?.email } });
        } else if (session?.user?.email_confirmed_at) {
          navigate("/");
        } else {
          navigate("/confirmar-email", { replace: true, state: { email: session?.user?.email } });
        }
      }
    });

    let cancelled = false;

    void (async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_INIT_TIMEOUT_MS,
          "AUTH_SESSION_TIMEOUT",
        );
        if (cancelled) return;
        if (session?.user?.email_confirmed_at && hasEmailConfirmationCallback()) {
          clearEmailConfirmationPending(session.user.email);
        }
        setSession(session);
        setUser(session?.user ?? null);
      } catch (err) {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          console.warn("[Auth] Sessão inicial indisponível (rede/timeout).", err);
        }
        setSession(null);
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, phone: string) => {
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
            },
          },
        });

        // Supabase às vezes retorna sucesso mesmo com e-mail já existente (identities vazio)
        const emailAlreadyExists =
          !error && data?.user && (data.user.identities?.length ?? 0) === 0;
        if (emailAlreadyExists) {
          const msg = "Este e-mail já está cadastrado.";
          toast.error(
            "Este e-mail já está cadastrado. Use «Esqueci a senha» na tela de login ou verifique seu e-mail para confirmar a conta.",
          );
          return { data: null, error: new Error(msg) };
        }

        if (error) throw error;

        if (data.user) {
          const confirmationReason =
            data.session || data.user.email_confirmed_at
              ? "supabase_auto_confirmed"
              : "awaiting_email";
          markEmailConfirmationPending(email, confirmationReason);
        }

        if (data.session || data.user?.email_confirmed_at) {
          toast.warning(
            "O Supabase marcou este e-mail como confirmado automaticamente. Verifique se a confirmação de e-mail está ativa no Dashboard.",
          );
        } else {
          toast.success("Enviamos um link para confirmar seu e-mail.");
        }
        return { data: { user: data.user }, error: null };
      } catch (error: unknown) {
        const msg = getAuthErrorMessage(error);
        const isEmailExists =
          msg.trim() === "User already registered" || msg.trim() === "email_exists";
        // Só loga erros inesperados em dev (evita ruído quando e-mail já cadastrado)
        if ((import.meta.env.DEV || import.meta.env.MODE === "development") && !isEmailExists) {
          const err = error as { message?: string; status?: number };
          console.warn("[Auth] signUp error:", { message: err?.message, status: err?.status });
        }
        const translatedMessage = translateAuthError(msg, getAuthErrorCode(error));
        toast.error(translatedMessage || "Erro ao criar conta");
        if (isEmailExists) {
          toast.info("Faça login na tela de entrada ou use «Esqueci a senha» para redefinir.");
        }
        return { data: null, error };
      }
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      if (isAutoConfirmedEmailPending(email)) {
        throw new Error("Email confirmation pending");
      }

      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_SIGNIN_TIMEOUT_MS,
        "AUTH_SIGNIN_TIMEOUT",
      );

      if (error) throw error;

      // Register audit log for login (best-effort: RLS/indisponibilidade não deve quebrar o login)
      if (data.user) {
        try {
          await supabase.from("audit_logs").insert({
            user_id: data.user.id,
            action: "login",
            entity_type: "session",
            metadata: { email },
            user_agent: navigator.userAgent,
          });
        } catch {
          // ignore
        }
      }

      toast.success("Login realizado com sucesso!");
      return { error: null };
    } catch (error: unknown) {
      const translatedMessage = formatAuthErrorForUser(error);
      toast.error(translatedMessage || "Erro ao fazer login");
      return { error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Register audit log for logout before signing out (best-effort)
      if (user) {
        try {
          await supabase.from("audit_logs").insert({
            user_id: user.id,
            action: "logout",
            entity_type: "session",
            user_agent: navigator.userAgent,
          });
        } catch {
          // ignore
        }
      }

      try {
        await withTimeout(
          supabase.auth.signOut({ scope: "global" }),
          AUTH_SIGNIN_TIMEOUT_MS,
          "AUTH_SIGNOUT_TIMEOUT",
        );
      } catch {
        await supabase.auth.signOut({ scope: "local" });
      }
      setSession(null);
      setUser(null);
      toast.success("Logout realizado com sucesso!");
      navigate("/welcome");
    } catch (error: unknown) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      setSession(null);
      setUser(null);
      const translatedMessage = formatAuthErrorForUser(error);
      toast.error(translatedMessage || "Erro ao fazer logout");
      navigate("/welcome");
    }
  }, [user, navigate]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const redirectUrl = getPasswordRecoveryRedirectUrl();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast.success("E-mail de recuperação enviado!");
      return { error: null };
    } catch (error: unknown) {
      const translatedMessage = formatAuthErrorForUser(error);
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
      const translatedMessage = formatAuthErrorForUser(error);
      toast.error(translatedMessage || "Erro ao reenviar confirmação");
      return { error: error as Error };
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      resendEmailConfirmation,
    }),
    [user, session, loading, signUp, signIn, signOut, resetPassword, resendEmailConfirmation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- Context pattern: Provider + hook in same file
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
