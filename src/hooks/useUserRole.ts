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

      let userRoles: UserRole[] = [];

      // Prefer direct table read (fast + typed), but fall back to RPC if RLS blocks it.
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!error) {
        userRoles = (data || []).map((r) => r.role as UserRole);
      } else {
        console.warn('[RBAC] Could not read public.user_roles directly; falling back to get_user_roles()', error);

        const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_roles', {
          _user_id: user.id,
        });

        if (rpcError) throw rpcError;

        userRoles = (rpcData || []).map((r) => r as UserRole);
      }

      // Safety net: if roles are empty (misconfigured DB/migrations), assume default citizen to avoid UI "no permissions".
      if (userRoles.length === 0) userRoles = ['cidadao'];
      
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
  const canExportData = isAdmin || isGestor;

  const canReferToCouncilMember = isAdmin || isGestor || isCidadaoEngajado;
  const canViewDashboards = isAdmin || isGestor || isCidadaoEngajado;
  const canCreateDashboards = isAdmin || isGestor || isCidadaoEngajado;
  const canManageDashboards = isAdmin || isGestor;

  const canRespondManifests = isAdmin || isGestor;
  const canManageTriage = isAdmin || isGestor;
  const canManageUsers = isAdmin;
  const canConfigureSystem = isAdmin;
  const canViewAuditLogs = isAdmin;

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
    canRespondManifests,
    canManageTriage,
    canManageUsers,
    canConfigureSystem,
    canViewAuditLogs,
    refetch: fetchUserRoles,
  };
};
