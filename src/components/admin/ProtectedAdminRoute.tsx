import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

export const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const navigate = useNavigate();
  const { isAdmin, isGestor, loading } = useUserRole();

  useEffect(() => {
    if (!loading && !isAdmin && !isGestor) {
      toast.error('Acesso negado', {
        description: 'Você não tem permissão para acessar esta área.',
      });
      navigate('/');
    }
  }, [isAdmin, isGestor, loading, navigate]);

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

  if (!isAdmin && !isGestor) {
    return null;
  }

  return <>{children}</>;
};
