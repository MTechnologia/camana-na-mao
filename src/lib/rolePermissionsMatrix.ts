import type { UserRole } from '@/hooks/useUserRole';
import { ALL_ROLES, PERMISSIONS, type PermissionDefinition } from '@/lib/permissions';

export type RolePermissionRow = {
  role: UserRole;
  permission_key: string;
};

export type RolePermissionMatrix = Record<UserRole, Set<string>>;

/** Permissões que o papel admin não pode remover (evita lockout). */
export const ADMIN_REQUIRED_PERMISSION_KEYS = [
  'users.read',
  'users.invite',
  'users.update_role',
  'users.suspend',
  'users.delete',
  'users.link_gabinete',
  'users.manage_permissions',
  'system.configure',
  'system.view_audit_logs',
  'system.moderate_services',
] as const;

export function emptyRolePermissionMatrix(): RolePermissionMatrix {
  return Object.fromEntries(ALL_ROLES.map((r) => [r, new Set<string>()])) as RolePermissionMatrix;
}

export function matrixFromRolePermissionRows(rows: RolePermissionRow[]): RolePermissionMatrix {
  const matrix = emptyRolePermissionMatrix();
  for (const row of rows) {
    if (!ALL_ROLES.includes(row.role)) continue;
    matrix[row.role].add(row.permission_key);
  }
  return matrix;
}

export function assignmentsFromMatrix(matrix: RolePermissionMatrix): RolePermissionRow[] {
  const out: RolePermissionRow[] = [];
  for (const role of ALL_ROLES) {
    for (const permission_key of matrix[role]) {
      out.push({ role, permission_key });
    }
  }
  return out;
}

export function isPermissionGranted(
  matrix: RolePermissionMatrix,
  role: UserRole,
  permissionKey: string,
): boolean {
  return matrix[role]?.has(permissionKey) ?? false;
}

export function togglePermission(
  matrix: RolePermissionMatrix,
  role: UserRole,
  permissionKey: string,
  granted: boolean,
): RolePermissionMatrix {
  const next = emptyRolePermissionMatrix();
  for (const r of ALL_ROLES) {
    next[r] = new Set(matrix[r]);
  }
  if (granted) {
    next[role].add(permissionKey);
  } else {
    if (
      role === 'admin'
      && (ADMIN_REQUIRED_PERMISSION_KEYS as readonly string[]).includes(permissionKey)
    ) {
      return matrix;
    }
    next[role].delete(permissionKey);
  }
  return next;
}

export function matrixEquals(a: RolePermissionMatrix, b: RolePermissionMatrix): boolean {
  for (const role of ALL_ROLES) {
    const sa = a[role];
    const sb = b[role];
    if (sa.size !== sb.size) return false;
    for (const k of sa) {
      if (!sb.has(k)) return false;
    }
  }
  return true;
}

export function defaultMatrixFromCatalog(): RolePermissionMatrix {
  const matrix = emptyRolePermissionMatrix();
  for (const p of PERMISSIONS) {
    for (const role of p.roles) {
      matrix[role].add(p.key);
    }
  }
  return matrix;
}

export function catalogPermissionKeys(): string[] {
  return PERMISSIONS.map((p) => p.key);
}

export function permissionsGroupedByDomain(): Record<string, PermissionDefinition[]> {
  const acc: Record<string, PermissionDefinition[]> = {};
  for (const p of PERMISSIONS) {
    if (!acc[p.domain]) acc[p.domain] = [];
    acc[p.domain].push(p);
  }
  return acc;
}
