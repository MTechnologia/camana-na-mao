import { describe, expect, it } from 'vitest';
import { resolveUrbanReportResponsible } from '@/lib/urbanReportReferralPersistence';
import { reportCommissionKey } from '@/lib/reportCommissionReferrals';

describe('resolveUrbanReportResponsible', () => {
  it('prioriza encaminhamento temático e expõe vereador do council_member_referrals', () => {
    const reportId = 'r1';
    const commissionByKey = new Map([
      [reportCommissionKey('urban_reports', reportId), { id: 'c1', name: 'Comissão A' }],
    ]);
    const councilByReportId = new Map([
      [
        reportId,
        {
          referralId: 'ref1',
          commissionId: 'c2',
          commissionName: 'Comissão B',
          councillorId: 'v1',
          councillorName: 'Vereador X',
          referredAt: '2026-05-26T00:00:00Z',
          matchScore: 80,
          note: null,
        },
      ],
    ]);

    const out = resolveUrbanReportResponsible(
      reportId,
      commissionByKey,
      councilByReportId,
      new Map(),
    );

    expect(out.responsibleId).toBe('c1');
    expect(out.responsibleName).toBe('Comissão A');
    expect(out.councilMemberName).toBe('Vereador X');
  });

  it('usa comissão do encaminhamento a vereador quando não há temático', () => {
    const reportId = 'r2';
    const councilByReportId = new Map([
      [
        reportId,
        {
          referralId: 'ref2',
          commissionId: 'c9',
          commissionName: 'Mobilidade',
          councillorId: 'v2',
          councillorName: 'Maria',
          referredAt: '2026-05-26T00:00:00Z',
          matchScore: 70,
          note: 'teste',
        },
      ],
    ]);

    const out = resolveUrbanReportResponsible(
      reportId,
      new Map(),
      councilByReportId,
      new Map(),
    );

    expect(out.responsibleId).toBe('c9');
    expect(out.responsibleName).toBe('Mobilidade');
    expect(out.councilMemberName).toBe('Maria');
  });
});
