import { describe, it, expect } from 'vitest';
import {
  ADMIN_REQUIRED_PERMISSION_KEYS,
  assignmentsFromMatrix,
  emptyRolePermissionMatrix,
  isPermissionGranted,
  matrixEquals,
  matrixFromRolePermissionRows,
  togglePermission,
} from './rolePermissionsMatrix';

describe('rolePermissionsMatrix', () => {
  it('matrixFromRolePermissionRows agrupa por papel', () => {
    const matrix = matrixFromRolePermissionRows([
      { role: 'gestor', permission_key: 'reports.read' },
      { role: 'gestor', permission_key: 'reports.update_status' },
      { role: 'admin', permission_key: 'users.read' },
    ]);
    expect(isPermissionGranted(matrix, 'gestor', 'reports.read')).toBe(true);
    expect(isPermissionGranted(matrix, 'gestor', 'users.read')).toBe(false);
    expect(isPermissionGranted(matrix, 'admin', 'users.read')).toBe(true);
  });

  it('assignmentsFromMatrix é inverso de matrixFromRolePermissionRows', () => {
    const matrix = matrixFromRolePermissionRows([
      { role: 'assessor', permission_key: 'triage.refer_commission' },
    ]);
    const rows = assignmentsFromMatrix(matrix);
    expect(rows).toContainEqual({
      role: 'assessor',
      permission_key: 'triage.refer_commission',
    });
  });

  it('togglePermission concede e revoga', () => {
    const base = emptyRolePermissionMatrix();
    const granted = togglePermission(base, 'vereador', 'reports.read', true);
    expect(isPermissionGranted(granted, 'vereador', 'reports.read')).toBe(true);

    const revoked = togglePermission(granted, 'vereador', 'reports.read', false);
    expect(isPermissionGranted(revoked, 'vereador', 'reports.read')).toBe(false);
  });

  it('não remove permissões obrigatórias do admin', () => {
    const matrix = matrixFromRolePermissionRows(
      ADMIN_REQUIRED_PERMISSION_KEYS.map((permission_key) => ({
        role: 'admin' as const,
        permission_key,
      })),
    );
    const next = togglePermission(matrix, 'admin', 'users.read', false);
    expect(isPermissionGranted(next, 'admin', 'users.read')).toBe(true);
    expect(matrixEquals(matrix, next)).toBe(true);
  });

  it('matrixEquals detecta diferenças', () => {
    const a = matrixFromRolePermissionRows([
      { role: 'gestor', permission_key: 'reports.read' },
    ]);
    const b = togglePermission(a, 'gestor', 'reports.update_status', true);
    expect(matrixEquals(a, b)).toBe(false);
    expect(matrixEquals(a, a)).toBe(true);
  });
});
