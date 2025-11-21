import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/serviceClient';
import { assertServiceKeyConfigured, resolveStorageBucket } from '@/lib/supabase/storageConfig';

type SignPayload = {
  path?: string;
  expiresInSeconds?: number;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SignPayload;
    const objectPath = typeof payload?.path === 'string' ? payload.path.trim() : '';
    if (!objectPath) {
      return NextResponse.json({ error: 'Missing storage object path' }, { status: 400 });
    }

    try {
      assertServiceKeyConfigured();
    } catch (error) {
      console.error('[SignImageRoute] Missing Supabase service key; cannot sign URL');
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }

    const bucket = resolveStorageBucket();
    const supabase = getServiceSupabase();
    const expiresInSeconds = Number.isFinite(payload?.expiresInSeconds)
      ? (payload?.expiresInSeconds as number)
      : 60 * 60;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.error('[SignImageRoute] Failed to sign storage URL', error);
      return NextResponse.json({ error: error?.message ?? 'Failed to sign URL' }, { status: 400 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    console.error('[SignImageRoute] Unexpected failure', error);
    return NextResponse.json({ error: 'Failed to sign storage URL' }, { status: 500 });
  }
}
