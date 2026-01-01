import { GET } from '@/app/api/audio/route';

describe('GET /api/audio', () => {
  it('returns an array of tracks (or empty array)', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
