import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { rolesGrantPermission } from '@/lib/permissions';
import { withPoolRetry } from '@/lib/supabaseRetry';

export type UserRole =
  | 'admin'
  | 'gestor'
  | 'vereador'
  | 'assessor'
  | 'cidadao'
  | 'cidadao_engajado';

const ROLE_PRIORITY: UserRole[] = [
  'admin',
  'gestor',
  'vereador',
  'assessor',
  'cidadao_engajado',
  'cidadao',
];

const normalizeSingleRole = (roles: UserRole[]): UserRole[] => {
  const uniqueRoles = Array.from(new Set(roles));
  const normalized = ROLE_PRIORITY.find((role) => uniqueRoles.includes(role));
  return normalized ? [normalized] : [];
};

export const useUserRole = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [councilMemberId, setCouncilMemberId] = useState<string | null>(null);
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
        setCouncilMemberId(null);
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
        setRoles([]);
        setCouncilMemberId(null);
        setLoading(false);
        return;
      }

      let userRoles: UserRole[] = [];

      // Prefer direct table read (fast + typed), but fall back to RPC if RLS blocks it.
      const [{ data, error }, { data: gabineteLink, error: gabineteError }] = await Promise.all([
        withPoolRetry(
          () =>
            supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id),
          { retries: 1, baseDelayMs: 700 },
        ),
        supabase
          .from('vereador_user_links')
          .select('council_member_id')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

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

      userRoles = normalizeSingleRole(userRoles);

      // Safety net: if roles are empty (misconfigured DB/migrations), assume default citizen to avoid UI "no permissions".
      if (userRoles.length === 0) userRoles = ['cidadao'];

      if (gabineteError) {
        console.warn('[RBAC] Could not read public.vereador_user_links directly', gabineteError);
        setCouncilMemberId(null);
      } else {
        setCouncilMemberId(gabineteLink?.council_member_id ?? null);
      }
      
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

  /** Staff institucional — paridade em painéis, análises e exportação (HU-7.1). */
  const canUseStaffPaineis = isAdmin || isGestor || isAssessor || isVereador;

  const canAccessAdvancedAnalytics = canUseStaffPaineis;
  const canExportData = canUseStaffPaineis;

  const canReferToCouncilMember = isAdmin || isGestor || isCidadaoEngajado;
  const canViewDashboards =
    canUseStaffPaineis ||
    isCidadaoEngajado ||
    rolesGrantPermission(roles, 'analytics.view_advanced');
  const canCreateDashboards = canViewDashboards;
  const canManageDashboards = isAdmin || isGestor;

  const canRespondManifests = isAdmin || isGestor;
  const canManageTriage = isAdmin || isGestor;
  const canManageUsers = isAdmin;
  const canConfigureSystem = isAdmin;
  const canViewAuditLogs = isAdmin;
  const canViewGabinete = (isVereador || isAssessor) && Boolean(councilMemberId);
  const canAccessAdminPanel = isAdmin || isGestor || canViewGabinete;
  const canRespondReferrals = (isVereador || isAssessor) && Boolean(councilMemberId);
  const canViewOpenManifests = (isVereador || isAssessor) && Boolean(councilMemberId);
  /** Validação / aprovação de sugestões de correção de equipamentos. */
  const canModerateServiceCorrections = isAdmin;

  return {
    roles,
    loading,
    councilMemberId,
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
    canUseStaffPaineis,
    canViewDashboards,
    canCreateDashboards,
    canManageDashboards,
    canRespondManifests,
    canManageTriage,
    canManageUsers,
    canConfigureSystem,
    canViewAuditLogs,
    canViewGabinete,
    canAccessAdminPanel,
    canRespondReferrals,
    canViewOpenManifests,
    canModerateServiceCorrections,
    refetch: fetchUserRoles,
  };
};
