import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { AdminProviders } from "@/components/admin/AdminProviders";
import { toast } from "sonner";

interface ProtectedAdminOnlyRouteProps {
  children: ReactNode;
}

export const ProtectedAdminOnlyRoute = ({ children }: ProtectedAdminOnlyRouteProps) => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useUserRole();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Acesso negado", {
        description: "Esta área é restrita para administradores.",
      });
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return <AdminProviders>{children}</AdminProviders>;
};
