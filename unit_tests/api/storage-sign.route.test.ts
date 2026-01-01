import { POST } from '@/app/api/storage/sign/route';

describe('POST /api/storage/sign', () => {
  it('400 when path is missing', async () => {
    const req = new Request('http://localhost/api/storage/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toEqual({ error: 'Missing storage object path' });
  });
});
