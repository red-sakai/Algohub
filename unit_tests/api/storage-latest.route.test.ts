import { POST } from '@/app/api/storage/latest/route';

jest.mock('@/lib/supabase/serviceClient', () => ({
  getServiceSupabase: jest.fn(),
}));

jest.mock('@/lib/supabase/storageConfig', () => ({
  assertServiceKeyConfigured: jest.fn(),
  resolveStorageBucket: jest.fn(() => 'test-bucket'),
}));

const { getServiceSupabase } = jest.requireMock('@/lib/supabase/serviceClient') as {
  getServiceSupabase: jest.Mock;
};

describe('POST /api/storage/latest', () => {
  beforeEach(() => {
    jest.resetModules();
    getServiceSupabase.mockReset();
  });

  it('returns null path when list is empty', async () => {
    getServiceSupabase.mockReturnValue({
      storage: {
        from: () => ({
          list: async () => ({ data: [], error: null }),
        }),
      },
    });

    const req = new Request('http://localhost/api/storage/latest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ folder: 'license_cards', limit: 5 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ path: null });
  });

  it('returns newest non-hidden file path when available', async () => {
    getServiceSupabase.mockReturnValue({
      storage: {
        from: () => ({
          list: async () => ({
            data: [{ name: '.DS_Store' }, { name: 'new.png' }],
            error: null,
          }),
        }),
      },
    });

    const req = new Request('http://localhost/api/storage/latest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ folder: '/license_cards/' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ path: 'license_cards/new.png' });
  });
});
