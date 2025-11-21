import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/serviceClient';
import { assertServiceKeyConfigured, resolveStorageBucket } from '@/lib/supabase/storageConfig';

type LatestPayload = {
  folder?: string;
  limit?: number;
};

function normalizeFolder(input?: string): string {
  const value = input && input.trim().length > 0 ? input.trim() : 'license_cards';
  return value.replace(/^\/+/g, '').replace(/\/+$/g, '');
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LatestPayload | null;
    const folder = normalizeFolder(payload?.folder);
    const limit = Number.isFinite(payload?.limit) && payload && typeof payload.limit === 'number'
      ? Math.max(1, Math.min(64, Math.floor(payload.limit)))
      : 20;

    try {
      assertServiceKeyConfigured();
    } catch (error) {
      console.error('[LatestLicenseRoute] Missing Supabase service key; cannot list objects');
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }

    const bucket = resolveStorageBucket();
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      console.error('[LatestLicenseRoute] Failed to list storage objects', error);
      return NextResponse.json({ error: error.message ?? 'Failed to list storage objects' }, { status: 400 });
    }

    const candidate = data?.find((file) => typeof file.name === 'string' && file.name.length > 0 && !file.name.startsWith('.'));
    return NextResponse.json({ path: candidate ? `${folder}/${candidate.name}` : null });
  } catch (error) {
    console.error('[LatestLicenseRoute] Unexpected failure', error);
    return NextResponse.json({ error: 'Failed to resolve latest license image' }, { status: 500 });
  }
}
