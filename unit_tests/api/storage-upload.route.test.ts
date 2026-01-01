import { POST } from '@/app/api/storage/upload/route';

describe('POST /api/storage/upload', () => {
  it('400 when dataUrl is missing', async () => {
    const req = new Request('http://localhost/api/storage/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toEqual({ error: 'Missing dataUrl' });
  });
});
