import { makeSupabaseClient } from '../../_utils/supabaseQueryMock';

jest.mock('@/lib/supabase/serviceClient', () => ({
  getServiceSupabase: jest.fn(),
}));

function getMockedServiceClient() {
  return jest.requireMock('@/lib/supabase/serviceClient') as {
    getServiceSupabase: jest.Mock;
  };
}

describe('GET /api/admin/achievements-gained', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns empty timeline when no achievements', async () => {
    const { getServiceSupabase } = getMockedServiceClient();
    getServiceSupabase.mockReturnValue(makeSupabaseClient({ achievementsSelect: { data: [], error: null } }));

    const { GET } = await import('@/app/api/admin/achievements-gained/route');
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.totalUnlocked).toBe(0);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it('returns 400 when supabase query errors', async () => {
    const { getServiceSupabase } = getMockedServiceClient();
    getServiceSupabase.mockReturnValue(
      makeSupabaseClient({ achievementsSelect: { data: null, error: { message: 'nope' } } }),
    );

    const { GET } = await import('@/app/api/admin/achievements-gained/route');
    const res = await GET();

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'nope' });
  });
});
