import type { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import type { PermissionKey } from "@/lib/permissions";

/**
 * HU-11.3 — Componente que envolve filhos e os exibe apenas se o usuário
 * tem a permissão indicada.
 *
 * Uso:
 *   <PermissionGate permission="users.invite">
 *     <Button>Convidar usuário</Button>
 *   </PermissionGate>
 *
 *   <PermissionGate
 *     permission="users.invite"
 *     fallback={<p>Sem permissão.</p>}
 *   >
 *     <UserInviteForm />
 *   </PermissionGate>
 *
 * Por padrão NÃO renderiza nada durante o loading do useUserRole — assim
 * evita flicker (mostrar e esconder). Use `showWhileLoading` para skeleton.
 */

interface PermissionGateProps {
  permission: PermissionKey | string;
  children: ReactNode;
  /** Renderizado quando a permissão é negada (default: null). */
  fallback?: ReactNode;
  /** Renderizado enquanto o role é carregado (default: null). */
  loadingFallback?: ReactNode;
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
  loadingFallback = null,
}: PermissionGateProps) {
  const { allowed, loading } = usePermission(permission);

  if (loading) return <>{loadingFallback}</>;
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
