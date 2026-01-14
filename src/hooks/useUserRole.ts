import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole =
  | 'admin'
  | 'gestor'
  | 'vereador'
  | 'assessor'
  | 'cidadao'
  | 'cidadao_engajado';

export const useUserRole = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGestor, setIsGestor] = useState(false);
  const [isVereador, setIsVereador] = useState(false);
  const [isAssessor, setIsAssessor] = useState(false);
  const [isCidadao, setIsCidadao] = useState(false);
  const [isCidadaoEngajado, setIsCidadaoEngajado] = useState(false);

  useEffect(() => {
    fetchUserRoles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserRoles();
      } else if (event === 'SIGNED_OUT') {
        setRoles([]);
        setIsAdmin(false);
        setIsGestor(false);
        setIsVereador(false);
        setIsAssessor(false);
        setIsCidadao(false);
        setIsCidadaoEngajado(false);
      }
    });

    return () => subscription.unsubscribe();
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
      setIsCidadaoEngajado(userRoles.includes('cidadao_engajado'));
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: UserRole) => roles.includes(role);

  // RBAC (baseado na matriz de permissões)
  const canAccessAdvancedAnalytics = isAdmin || isGestor || isAssessor;
  const canExportData = isAdmin || isGestor || isVereador || isAssessor;

  const canReferToCouncilMember = isAdmin || isGestor || isCidadaoEngajado;
  const canViewDashboards = isAdmin || isGestor || isCidadaoEngajado;
  const canCreateDashboards = isAdmin || isGestor || isCidadaoEngajado;
  const canManageDashboards = isAdmin || isGestor;

  // Cidadão "puro" (sem permissões adicionais)
  const isBasicCitizen = isCidadao && !isCidadaoEngajado && roles.length === 1;

  return {
    roles,
    loading,
    isAdmin,
    isGestor,
    isVereador,
    isAssessor,
    isCidadao,
    isCidadaoEngajado,
    hasRole,
    canAccessAdvancedAnalytics,
    canExportData,
    canReferToCouncilMember,
    canViewDashboards,
    canCreateDashboards,
    canManageDashboards,
    isBasicCitizen,
    refetch: fetchUserRoles,
  };
};
