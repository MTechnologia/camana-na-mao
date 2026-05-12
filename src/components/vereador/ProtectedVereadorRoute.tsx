import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useGabineteVereador } from '@/hooks/useGabineteVereador';

interface ProtectedVereadorRouteProps {
  children: ReactNode;
}

export const ProtectedVereadorRoute = ({ children }: ProtectedVereadorRouteProps) => {
  const navigate = useNavigate();
  const { loading, canViewGabinete } = useGabineteVereador();

  useEffect(() => {
    if (!loading && !canViewGabinete) {
      toast.error('Acesso negado', {
        description: 'Esta área é restrita a vereadores e assessores vinculados a um gabinete.',
      });
      navigate('/');
    }
  }, [canViewGabinete, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando gabinete...</p>
        </div>
      </div>
    );
  }

  if (!canViewGabinete) {
    return null;
  }

  return <>{children}</>;
};
