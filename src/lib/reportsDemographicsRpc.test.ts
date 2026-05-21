import { describe, expect, it, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

describe('callGetReportsWithDemographics', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('faz fallback sem p_status quando PostgREST retorna PGRST202 ou PGRST203', async () => {
    const { callGetReportsWithDemographics } = await import('@/lib/reportsDemographicsRpc');

    rpcMock
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST203', message: 'ambiguous' },
      })
      .mockResolvedValueOnce({ data: { total: 5 }, error: null });

    const result = await callGetReportsWithDemographics({
      p_gender: null,
      p_race: null,
      p_social_class: null,
      p_age_group: null,
      p_report_type: 'urban',
      p_start_date: null,
      p_end_date: null,
      p_categories: null,
      p_status: 'pending',
    });

    expect(result.data).toEqual({ total: 5 });
    expect(result.statusFilterInRpc).toBe(false);
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock.mock.calls[1][1]).not.toHaveProperty('p_status');
  });
});
