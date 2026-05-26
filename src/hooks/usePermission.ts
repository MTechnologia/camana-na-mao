import { useMemo } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import {
  rolesGrantPermission,
  type PermissionKey,
} from "@/lib/permissions";

/**
 * HU-11.3 — Hook canônico de checagem de permissão.
 *
 * Substitui os ~15 flags `canX` espalhados pelo useUserRole por uma chamada
 * uniforme: `usePermission('reports.update_status')`. Os flags antigos
 * continuam funcionando (compatibilidade reversa) — esta API é para novos
 * componentes e migração gradual.
 *
 * Diferencia entre:
 *   - allowed=true             → tem permissão
 *   - allowed=false, loading=true → ainda buscando os roles do usuário
 *   - allowed=false, loading=false → não tem permissão
 *
 * Componentes que querem ocultar UI até a decisão final devem aguardar
 * `loading=false` antes de aplicar a renderização condicional.
 */

export interface UsePermissionResult {
  allowed: boolean;
  loading: boolean;
}

export function usePermission(key: PermissionKey | string): UsePermissionResult {
  const { roles, permissionKeys, loading } = useUserRole();

  const allowed = useMemo(() => {
    if (loading) return false;
    return rolesGrantPermission(roles, key, permissionKeys);
  }, [roles, permissionKeys, key, loading]);

  return { allowed, loading };
}

/**
 * Variante para checar múltiplas permissões de uma vez.
 * Retorna mapa { key: allowed }.
 */
export function usePermissions(
  keys: readonly (PermissionKey | string)[],
): { results: Record<string, boolean>; loading: boolean } {
  const { roles, permissionKeys, loading } = useUserRole();

  const results = useMemo(() => {
    const acc: Record<string, boolean> = {};
    for (const k of keys) {
      acc[k] = loading ? false : rolesGrantPermission(roles, k, permissionKeys);
    }
    return acc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles, permissionKeys, loading, keys.join("|")]);

  return { results, loading };
}
