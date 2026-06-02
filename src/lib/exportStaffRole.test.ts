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

  it('retorna gestor para o próprio flag isGestor', () => {
    // Regressão "gestor sem relatório": o flag direto do gestor TEM de mapear
    // para 'gestor' (senão a role efetiva fica null e o cap zera).
    expect(
      effectiveExportRole({
        isAdmin: false,
        isGestor: true,
        isAssessor: false,
        isVereador: false,
      }),
    ).toBe('gestor');
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

  it('admin tem precedência sobre gestor quando ambos os flags estão ativos', () => {
    expect(
      effectiveExportRole({
        isAdmin: true,
        isGestor: true,
        isAssessor: false,
        isVereador: false,
      }),
    ).toBe('admin');
  });

  it('retorna null quando não há nenhuma role staff (sem permissão de export)', () => {
    expect(
      effectiveExportRole({
        isAdmin: false,
        isGestor: false,
        isAssessor: false,
        isVereador: false,
      }),
    ).toBeNull();
  });
});
