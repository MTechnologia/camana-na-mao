import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { rolesGrantPermission } from '@/lib/permissions';
import { withPoolRetry } from '@/lib/supabaseRetry';
import { withTimeout } from '@/lib/promiseTimeout';

const ROLE_FETCH_TIMEOUT_MS = 12_000;

/** Erros típicos quando o GoTrue não alcança o servidor (Wi‑Fi, VPN, Supabase fora, CORS). */
function isLikelyAuthNetworkFailure(err: unknown): boolean {
  if (err instanceof TypeError) {
    return /fetch|network|load failed|aborted/i.test(err.message);
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = String((err as { message: string }).message).toLowerCase();
    return (
      m.includes('failed to fetch')
      || m.includes('network error')
      || m.includes('load failed')
      || m.includes('fetch')
      || m.includes('aborted')
      || m.includes('timeout')
    );
  }
  return false;
}

/**
 * `getUser()` valida o JWT no servidor; em falha de rede o cliente ainda pode ter sessão em storage.
 * Evita TypeError: Failed to fetch derrubar o fluxo de RBAC na montagem / TOKEN_REFRESHED.
 */
async function getAuthUserResilient(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) return user;
    if (error && isLikelyAuthNetworkFailure(error)) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (import.meta.env.DEV) {
          console.warn(
            '[useUserRole] Auth indisponível (rede). Usando sessão local para carregar perfis.',
            error.message,
          );
        }
        return session.user;
      }
    }
    if (error && import.meta.env.DEV) {
      console.warn('[useUserRole] getUser()', error.message);
    }
    return user ?? null;
  } catch (err) {
    if (isLikelyAuthNetworkFailure(err)) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (import.meta.env.DEV) {
          console.warn(
            '[useUserRole] Auth indisponível (rede). Usando sessão local para carregar perfis.',
          );
        }
        return session.user;
      }
      if (import.meta.env.DEV) {
        console.warn('[useUserRole] Falha de rede ao validar sessão; sem usuário em cache.', err);
      }
      return null;
    }
    throw err;
  }
}

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
  const [permissionKeys, setPermissionKeys] = useState<Set<string>>(new Set());

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
        setPermissionKeys(new Set());
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoles = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setRoles([]);
        setCouncilMemberId(null);
        setPermissionKeys(new Set());
        setIsAdmin(false);
        setIsGestor(false);
        setIsVereador(false);
        setIsAssessor(false);
        setIsCidadao(false);
        setIsCidadaoEngajado(false);
        return;
      }

      const user = (await getAuthUserResilient()) ?? session.user;

      let userRoles: UserRole[] = [];

      // Prefer direct table read (fast + typed), but fall back to RPC if RLS blocks it.
      const [{ data, error }, { data: gabineteLink, error: gabineteError }] = await withTimeout(
        Promise.all([
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
        ]),
        ROLE_FETCH_TIMEOUT_MS,
        'ROLE_FETCH_TIMEOUT',
      );

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

      const { data: permRows, error: permErr } = await withTimeout(
        withPoolRetry(
          () =>
            supabase
              .from('role_permissions')
              .select('permission_key')
              .in('role', userRoles),
          { retries: 1, baseDelayMs: 700 },
        ),
        ROLE_FETCH_TIMEOUT_MS,
        'ROLE_FETCH_TIMEOUT',
      );
      if (permErr) {
        console.warn('[useUserRole] role_permissions', permErr);
        setPermissionKeys(new Set());
      } else {
        setPermissionKeys(
          new Set((permRows ?? []).map((r) => r.permission_key as string)),
        );
      }

      setIsAdmin(userRoles.includes('admin'));
      setIsGestor(userRoles.includes('gestor'));
      setIsVereador(userRoles.includes('vereador'));
      setIsAssessor(userRoles.includes('assessor'));
      setIsCidadao(userRoles.includes('cidadao'));
      setIsCidadaoEngajado(userRoles.includes('cidadao_engajado'));
    } catch (error) {
      if (isLikelyAuthNetworkFailure(error)) {
        if (import.meta.env.DEV) {
          console.warn('[useUserRole] Rede ao carregar perfis; tente atualizar a página.', error);
        }
      } else {
        console.error('[useUserRole] Erro ao carregar perfis:', error);
      }
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
    rolesGrantPermission(roles, 'analytics.view_advanced', permissionKeys);
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
    permissionKeys,
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
