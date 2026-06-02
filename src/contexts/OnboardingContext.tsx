import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingContextType {
  showTutorial: boolean;
  isFirstAccess: boolean;
  isLoading: boolean;
  triggerTutorial: () => void;
  completeTutorial: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY_VISITOR = "hasCompletedOnboarding";

function getOnboardingStorageKey(userId: string | undefined): string {
  return userId ? `onboarding_done_${userId}` : STORAGE_KEY_VISITOR;
}

/** Remove do localStorage a chave de onboarding do usuário. Chamar ao excluir a conta para que, ao recadastrar, o onboarding apareça. */
export function clearOnboardingStorageForUser(userId: string): void {
  try {
    localStorage.removeItem(getOnboardingStorageKey(userId));
  } catch {
    // ignore
  }
}

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const currentUserId = user?.id;

    const checkOnboardingStatus = async () => {
      setIsLoading(true);
      const storageKey = getOnboardingStorageKey(currentUserId);

      // Enquanto o auth está carregando, não decidir pelo localStorage do visitante
      if (authLoading) {
        setIsLoading(false);
        return;
      }

      // Usuário logado: prioridade no banco. Fallback no localStorage por usuário.
      if (user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("onboarding_completed_at")
            .eq("id", user.id)
            .maybeSingle();

          // Ignorar resultado se o efeito já rodou de novo (outro user)
          if (currentUserId !== user?.id) return;

          if (profileError) {
            console.error("Error fetching onboarding status:", profileError);
            const hasCompletedOnboarding = localStorage.getItem(storageKey);
            setIsFirstAccess(!hasCompletedOnboarding);
            setShowTutorial(!hasCompletedOnboarding);
          } else {
            // Só o tutorial na Home conta como "onboarding concluído" (não os interesses do cadastro)
            const hasCompletedTutorial = !!profile?.onboarding_completed_at;
            if (import.meta.env.DEV) {
              console.log("[Onboarding]", {
                userId: user.id,
                onboarding_completed_at: profile?.onboarding_completed_at ?? null,
                hasCompletedTutorial,
                willShowTutorial: !hasCompletedTutorial,
              });
            }
            setIsFirstAccess(!hasCompletedTutorial);
            setShowTutorial(!hasCompletedTutorial);
            if (hasCompletedTutorial) {
              localStorage.setItem(storageKey, "true");
            } else {
              localStorage.removeItem(storageKey);
              localStorage.removeItem(STORAGE_KEY_VISITOR);
            }
          }
        } catch (err) {
          console.error("Error checking onboarding:", err);
          if (currentUserId === user?.id) {
            const hasCompletedOnboarding = localStorage.getItem(storageKey);
            setIsFirstAccess(!hasCompletedOnboarding);
            setShowTutorial(!hasCompletedOnboarding);
          }
        }
      } else {
        const hasCompletedOnboarding = localStorage.getItem(STORAGE_KEY_VISITOR);
        setIsFirstAccess(!hasCompletedOnboarding);
        setShowTutorial(!hasCompletedOnboarding);
      }

      if (currentUserId === user?.id) {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, authLoading]);

  const triggerTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const completeTutorial = useCallback(async () => {
    const storageKey = getOnboardingStorageKey(user?.id);
    localStorage.setItem(storageKey, "true");
    setIsFirstAccess(false);
    setShowTutorial(false);

    if (user) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq("id", user.id);

        if (error) {
          console.error("Error saving onboarding status to DB:", error);
        }
      } catch (err) {
        console.error("Error persisting onboarding completion:", err);
      }
    }
  }, [user]);

  const value = useMemo(
    () => ({
      showTutorial,
      isFirstAccess,
      isLoading,
      triggerTutorial,
      completeTutorial,
    }),
    [showTutorial, isFirstAccess, isLoading, triggerTutorial, completeTutorial],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- Context pattern: Provider + hook
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};
