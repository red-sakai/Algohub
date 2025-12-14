import type { SupabaseClient } from '@supabase/supabase-js';

type MaybeAuthError = {
  message?: string;
  status?: number;
  name?: string;
  code?: string;
} | Error | null | undefined;

const REFRESH_TOKEN_MESSAGE = 'invalid refresh token';

function isInvalidRefreshTokenError(error: MaybeAuthError): boolean {
  if (!error) {
    return false;
  }

  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  const code = typeof (error as { code?: string }).code === 'string' ? (error as { code: string }).code.toLowerCase() : '';

  return (
    code === 'invalid_refresh_token' ||
    message.includes(REFRESH_TOKEN_MESSAGE) ||
    message.includes('refresh token not found')
  );
}

export async function clearStaleSupabaseSession(
  supabase: SupabaseClient,
  error: MaybeAuthError,
  context?: string,
): Promise<boolean> {
  if (!isInvalidRefreshTokenError(error)) {
    return false;
  }

  const contextLabel = context ? ` (${context})` : '';
  console.warn(`[SupabaseSession] Clearing stale session${contextLabel} after invalid refresh token.`);

  try {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) {
      console.error(`[SupabaseSession] Failed to clear stale session${contextLabel}`, signOutError);
    }
  } catch (signOutError) {
    console.error(`[SupabaseSession] Unexpected error clearing stale session${contextLabel}`, signOutError);
  }

  return true;
}
