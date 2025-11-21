'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { PersistSessionParams, PersistSessionResult } from '@/types/sign-in';

export async function persistSupabaseSession({ accessToken, refreshToken }: PersistSessionParams): Promise<PersistSessionResult> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error('Failed to persist Supabase session', error);
      return { error: "We couldn't update your session. Try again in a moment." } satisfies PersistSessionResult;
    }

    return {} satisfies PersistSessionResult;
  } catch (error) {
    console.error('Unexpected error while persisting Supabase session', error);
    return { error: "We couldn't update your session. Try again in a moment." } satisfies PersistSessionResult;
  }
}
