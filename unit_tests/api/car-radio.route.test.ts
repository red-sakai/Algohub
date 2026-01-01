import { GET } from '@/app/api/car-radio/route';

describe('GET /api/car-radio', () => {
  it('returns an array of tracks (or empty array)', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);

    // If tracks exist, they should have the expected shape
    for (const t of data) {
      expect(typeof t.title).toBe('string');
      expect(typeof t.src).toBe('string');
    }
  });
});
