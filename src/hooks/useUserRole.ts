import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'gestor' | 'vereador' | 'assessor' | 'cidadao';

export const useUserRole = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGestor, setIsGestor] = useState(false);
  const [isVereador, setIsVereador] = useState(false);
  const [isAssessor, setIsAssessor] = useState(false);
  const [isCidadao, setIsCidadao] = useState(false);

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const userRoles = (data || []).map(r => r.role as UserRole);
      setRoles(userRoles);
      setIsAdmin(userRoles.includes('admin'));
      setIsGestor(userRoles.includes('gestor'));
      setIsVereador(userRoles.includes('vereador'));
      setIsAssessor(userRoles.includes('assessor'));
      setIsCidadao(userRoles.includes('cidadao'));
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: UserRole) => roles.includes(role);

  const canAccessAdvancedAnalytics = isAdmin || isGestor || isAssessor;
  const canExportData = isAdmin || isGestor || isVereador || isAssessor;
  const canManageDashboards = isAdmin || isGestor;
  const canViewPublicOnly = isCidadao && roles.length === 1;

  return {
    roles,
    loading,
    isAdmin,
    isGestor,
    isVereador,
    isAssessor,
    isCidadao,
    hasRole,
    canAccessAdvancedAnalytics,
    canExportData,
    canManageDashboards,
    canViewPublicOnly,
    refetch: fetchUserRoles,
  };
};
