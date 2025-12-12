import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const translateError = (message: string): string => {
  const translations: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos",
    "Email not confirmed": "E-mail não confirmado. Verifique sua caixa de entrada",
    "User already registered": "Este e-mail já está cadastrado",
    "Password should be at least 6 characters": "A senha deve ter no mínimo 6 caracteres",
    "Invalid email": "E-mail inválido",
    "Email rate limit exceeded": "Muitas tentativas. Aguarde alguns minutos",
    "Signup requires a valid password": "Senha inválida",
    "Unable to validate email address": "Não foi possível validar o e-mail",
    "signup_disabled": "Cadastro desabilitado pelo administrador",
    "email_exists": "Este e-mail já está cadastrado",
  };
  return translations[message] || message;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ data: { user: User | null } | null; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
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
      
      // Only check onboarding status for sign in events from login page
      // Not for fresh signups which now have their own flow
      if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
        setTimeout(() => {
          checkOnboardingStatus(session?.user?.id);
        }, 0);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async (userId: string | undefined) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_interests')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (!error && (!data || data.length === 0)) {
      navigate('/onboarding');
    } else {
      navigate('/ia');
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
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

      if (error) throw error;
      
      toast.success("Conta criada com sucesso!");
      return { data: { user: data.user }, error: null };
    } catch (error: any) {
      const translatedMessage = translateError(error.message);
      toast.error(translatedMessage || "Erro ao criar conta");
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success("Login realizado com sucesso!");
      return { error: null };
    } catch (error: any) {
      const translatedMessage = translateError(error.message);
      toast.error(translatedMessage || "Erro ao fazer login");
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso!");
      navigate('/login');
    } catch (error: any) {
      const translatedMessage = translateError(error.message);
      toast.error(translatedMessage || "Erro ao fazer logout");
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      toast.success("E-mail de recuperação enviado!");
      return { error: null };
    } catch (error: any) {
      const translatedMessage = translateError(error.message);
      toast.error(translatedMessage || "Erro ao enviar e-mail");
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
