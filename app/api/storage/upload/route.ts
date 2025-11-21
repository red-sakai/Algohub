import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/serviceClient';
import { createStoragePath } from '@/lib/supabase/uploadImage';
import { assertServiceKeyConfigured, resolveStorageBucket } from '@/lib/supabase/storageConfig';

type UploadPayload = {
  dataUrl?: string;
  folder?: string;
  makePublic?: boolean;
};

type BufferResult = {
  buffer: Buffer;
  contentType: string;
};

function dataUrlToBuffer(dataUrl: string): BufferResult {
  const [meta, base64] = dataUrl.split(',');
  if (!meta || !base64) {
    throw new Error('Invalid data URL payload');
  }
  const match = /data:(.*?);base64/.exec(meta);
  const contentType = match?.[1] || 'image/png';
  const buffer = Buffer.from(base64, 'base64');
  return { buffer, contentType };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as UploadPayload;
    if (!payload?.dataUrl || typeof payload.dataUrl !== 'string') {
      return NextResponse.json({ error: 'Missing dataUrl' }, { status: 400 });
    }

    try {
      assertServiceKeyConfigured();
    } catch (error) {
      console.error('[UploadImageRoute] Missing Supabase service key; unable to bypass storage RLS');
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }

    const bucket = resolveStorageBucket();
    const { buffer, contentType } = dataUrlToBuffer(payload.dataUrl);
    const { path } = createStoragePath(contentType, payload.folder);

    const supabase = getServiceSupabase();
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    });

    if (error) {
      console.error('[UploadImageRoute] Supabase upload failed', error);
      return NextResponse.json({ error: error.message ?? 'Upload failed' }, { status: 400 });
    }

    let publicUrl: string | undefined;
    if (payload.makePublic) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      publicUrl = data.publicUrl;
    }

    return NextResponse.json({ path, publicUrl });
  } catch (error) {
    console.error('[UploadImageRoute] Unexpected failure', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
