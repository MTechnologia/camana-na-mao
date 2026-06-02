import { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAutoConfirmedEmailPending } from "@/lib/emailConfirmationGuard";

interface ProtectedRouteProps {
  children?: ReactNode;
}

/**
 * Protege rotas que exigem usuário logado.
 * Redireciona para /welcome se não houver user nem session.
 * Use como <Route element={<ProtectedRoute />}> e coloque as rotas protegidas como filhos,
 * ou use <ProtectedRoute><Page /></ProtectedRoute> em cada rota.
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user && !session) {
    return <Navigate to="/welcome" replace state={{ from: location.pathname }} />;
  }

  const isEmailConfirmed =
    Boolean(user?.email_confirmed_at) && !isAutoConfirmedEmailPending(user?.email);
  if (user && !isEmailConfirmed) {
    return (
      <Navigate
        to="/confirmar-email"
        replace
        state={{ email: user.email, from: location.pathname }}
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
