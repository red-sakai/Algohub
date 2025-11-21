'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { AuthUserSummary, UserProfile } from '@/types/auth';
import type { LandingSessionResult, LandingSessionRow } from '@/types/home';

const allowedRoles: UserProfile['role'][] = ['student', 'instructor', 'admin'];

function mapProfile(row: LandingSessionRow): UserProfile {
  const normalizedRole = allowedRoles.includes((row.role ?? '') as UserProfile['role'])
    ? (row.role as UserProfile['role'])
    : 'student';

  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: normalizedRole,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies UserProfile;
}

export async function loadLandingSession(): Promise<LandingSessionResult> {
  try {
    const supabase = getSupabaseClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session || !sessionData.session.user) {
      if (sessionError) {
        console.error('Failed to read Supabase session', sessionError);
      }
      return {
        authSummary: null,
        profile: null,
      } satisfies LandingSessionResult;
    }

    const user = sessionData.session.user;

    const authSummary: AuthUserSummary = {
      id: user.id,
      email: user.email,
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      phone: user.phone ?? null,
    } satisfies AuthUserSummary;

    const { data: profileRow, error: profileError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, role, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Failed to fetch profile for session user', profileError);
    }

    const profile = profileRow ? mapProfile(profileRow as LandingSessionRow) : null;

    return {
      authSummary,
      profile,
    } satisfies LandingSessionResult;
  } catch (error) {
    console.error('Failed to load landing session', error);
    return {
      authSummary: null,
      profile: null,
    } satisfies LandingSessionResult;
  }
}
