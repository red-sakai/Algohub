import { signInUserAction } from '@/actions/auth/sign-in';
import { registerUserAction } from '@/actions/auth/register';

describe('auth server actions (validation)', () => {
  it('signInUserAction rejects invalid email', async () => {
    const res = await signInUserAction({ email: 'not-an-email', password: 'x' });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/valid email/i);
  });

  it('registerUserAction rejects missing displayName', async () => {
    const res = await registerUserAction({ email: 'a@b.com', password: 'x', displayName: '   ' });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/display name/i);
  });
});
