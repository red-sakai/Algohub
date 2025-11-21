'use client';

import { getSupabaseClient } from '@/lib/supabase/client';

interface SignOutResult {
  error?: string;
}

export async function signOutUser(): Promise<SignOutResult> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Failed to sign out', error);
      return { error: "We couldn't sign you out. Try again in a moment." };
    }
    return {};
  } catch (error) {
    console.error('Unexpected error signing out', error);
    return { error: "We couldn't sign you out. Try again in a moment." };
  }
}
