import { describe, expect, it } from 'vitest';
import { effectiveExportRole } from '@/lib/exportStaffRole';

describe('effectiveExportRole', () => {
  it('retorna admin para administrador', () => {
    expect(
      effectiveExportRole({
        isAdmin: true,
        isGestor: false,
        isAssessor: false,
        isVereador: false,
      }),
    ).toBe('admin');
  });

  it('retorna gestor para assessor e vereador', () => {
    expect(
      effectiveExportRole({
        isAdmin: false,
        isGestor: false,
        isAssessor: true,
        isVereador: false,
      }),
    ).toBe('gestor');
    expect(
      effectiveExportRole({
        isAdmin: false,
        isGestor: false,
        isAssessor: false,
        isVereador: true,
      }),
    ).toBe('gestor');
  });
});
