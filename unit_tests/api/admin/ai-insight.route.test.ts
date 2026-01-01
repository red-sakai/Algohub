import { makeSupabaseClient } from '../../_utils/supabaseQueryMock';

jest.mock('@/lib/supabase/serviceClient', () => ({
  getServiceSupabase: jest.fn(),
}));

jest.mock('@/lib/ai', () => ({
  generateAdminInsight: jest.fn(async () => 'All systems nominal.\n- Students steady\n- Achievements rising\n- Add a weekly challenge\n- Highlight top learners'),
}));

function getMockedServiceClient() {
  return jest.requireMock('@/lib/supabase/serviceClient') as {
    getServiceSupabase: jest.Mock;
  };
}

function getMockedAi() {
  return jest.requireMock('@/lib/ai') as {
    generateAdminInsight: jest.Mock;
  };
}

describe('GET /api/admin/ai-insight', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns insight + metrics (200) and sets ETag', async () => {
    const { getServiceSupabase } = getMockedServiceClient();
    const { generateAdminInsight } = getMockedAi();

    getServiceSupabase.mockReturnValue(
      makeSupabaseClient({
        countUsersStudent: 10,
        countUsersStudentSince7d: 2,
        countUsersStudentSince30d: 5,
        countAchievements: 100,
        countAchievementsSince7d: 12,
        countAchievementsSince30d: 30,
      }),
    );

    const { GET } = await import('@/app/api/admin/ai-insight/route');
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBeTruthy();

    const body = await res.json();
    expect(body.data.metrics.studentsTotal).toBe(10);
    expect(typeof body.data.insight).toBe('string');
    expect(generateAdminInsight).toHaveBeenCalledTimes(1);
  });

  it('returns 500 if analytics query fails', async () => {
    const { getServiceSupabase } = getMockedServiceClient();

    // Force countRows to throw by returning an error on the awaited query.
    const client = makeSupabaseClient({});
    // Override the first users count query to reject with error.
    (client.from as jest.Mock).mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          then: (ok: (value: { count: number | null; error: { message?: string } | null }) => unknown) =>
            ok({ count: null, error: { message: 'analytics down' } }),
        }),
      }),
    }));

    getServiceSupabase.mockReturnValue(client);

    const { GET } = await import('@/app/api/admin/ai-insight/route');
    const res = await GET();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/analytics down|Unable to load analytics/);
  });
});
