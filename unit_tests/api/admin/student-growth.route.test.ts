import { makeSupabaseClient } from '../../_utils/supabaseQueryMock';

jest.mock('@/lib/supabase/serviceClient', () => ({
  getServiceSupabase: jest.fn(),
}));

function getMockedServiceClient() {
  return jest.requireMock('@/lib/supabase/serviceClient') as {
    getServiceSupabase: jest.Mock;
  };
}

describe('GET /api/admin/student-growth', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns empty timeline when no students', async () => {
    const { getServiceSupabase } = getMockedServiceClient();
    getServiceSupabase.mockReturnValue(makeSupabaseClient({ usersSelect: { data: [], error: null } }));

    const { GET } = await import('@/app/api/admin/student-growth/route');
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.totalStudents).toBe(0);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it('returns 400 when supabase query errors', async () => {
    const { getServiceSupabase } = getMockedServiceClient();
    getServiceSupabase.mockReturnValue(
      makeSupabaseClient({ usersSelect: { data: null, error: { message: 'boom' } } }),
    );

    const { GET } = await import('@/app/api/admin/student-growth/route');
    const res = await GET();

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'boom' });
  });
});
