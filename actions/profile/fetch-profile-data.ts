'use client';

import type { AuthUserSummary, UserProfile } from '@/types/auth';
import type { UserAchievement } from '@/types/achievements';
import type { ProfileAchievementRow, ProfileDataResponse, ProfileRow } from '@/types/profile';
import { getSupabaseClient } from '@/lib/supabase/client';

const allowedRoles: UserProfile['role'][] = ['student', 'instructor', 'admin'];

function mapProfileRow(row: ProfileRow): UserProfile {
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
  };
}

function normalizeAchievementRow(input: unknown): ProfileAchievementRow | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  const rawAchievement = candidate.achievements;
  const achievement = Array.isArray(rawAchievement) ? rawAchievement[0] : rawAchievement;

  if (!achievement || typeof achievement !== 'object') {
    return null;
  }

  const achievementRecord = achievement as Record<string, unknown>;

  const achievementId = typeof candidate.achievement_id === 'string' ? candidate.achievement_id : null;
  const unlockedAt = typeof candidate.unlocked_at === 'string' ? candidate.unlocked_at : null;
  const id = typeof achievementRecord.id === 'string' ? achievementRecord.id : null;
  const slug = typeof achievementRecord.slug === 'string' ? achievementRecord.slug : null;
  const title = typeof achievementRecord.title === 'string' ? achievementRecord.title : null;
  const description = typeof achievementRecord.description === 'string' ? achievementRecord.description : null;
  const createdAt = typeof achievementRecord.created_at === 'string' ? achievementRecord.created_at : null;
  const icon = typeof achievementRecord.icon === 'string' ? achievementRecord.icon : null;

  if (!achievementId || !unlockedAt || !id || !slug || !title || !description || !createdAt) {
    return null;
  }

  return {
    achievement_id: achievementId,
    unlocked_at: unlockedAt,
    achievements: {
      id,
      slug,
      title,
      description,
      icon,
      created_at: createdAt,
    },
  } satisfies ProfileAchievementRow;
}

export async function fetchProfileData(): Promise<ProfileDataResponse> {
  try {
    const supabase = getSupabaseClient();

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Failed to read Supabase session', sessionError);
      return {
        authSummary: null,
        profile: null,
        achievements: [],
        errorMessage: "We couldn't verify your session. Try signing in again.",
      } satisfies ProfileDataResponse;
    }

    const session = sessionData.session;
    if (!session || !session.user) {
      return {
        authSummary: null,
        profile: null,
        achievements: [],
      } satisfies ProfileDataResponse;
    }

    const user = session.user;
    const summary: AuthUserSummary = {
      id: user.id,
      email: user.email,
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      phone: user.phone ?? null,
    };

    const { data: profileRow, error: profileError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, role, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    let profile: UserProfile | null = null;
    if (profileRow && !profileError) {
      profile = mapProfileRow(profileRow as ProfileRow);
    } else if (profileError && profileError.code !== 'PGRST116') {
      console.error('Failed to fetch profile for session user', profileError);
    }

    const { data: achievementRows, error: achievementError } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at, achievements (id, slug, title, description, icon, created_at)')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false });

    let achievements: UserAchievement[] = [];
    if (achievementRows && !achievementError) {
      const normalizedRows = (Array.isArray(achievementRows) ? achievementRows : [])
        .map(normalizeAchievementRow)
        .filter(
          (
            row,
          ): row is ProfileAchievementRow & {
            achievements: NonNullable<ProfileAchievementRow['achievements']>;
          } => Boolean(row && row.achievements),
        );

      achievements = normalizedRows.map((row) => ({
        userId: user.id,
        achievementId: row.achievement_id,
        unlockedAt: row.unlocked_at,
        achievement: {
          id: row.achievements.id,
          slug: row.achievements.slug,
          title: row.achievements.title,
          description: row.achievements.description,
          icon: row.achievements.icon,
          createdAt: row.achievements.created_at,
        },
      }));
    } else if (achievementError) {
      console.error('Failed to fetch achievements', achievementError);
    }

    return {
      authSummary: summary,
      profile,
      achievements,
    } satisfies ProfileDataResponse;
  } catch (error) {
    console.error('Failed to load profile view', error);
    return {
      authSummary: null,
      profile: null,
      achievements: [],
      errorMessage: 'We hit a snag loading your profile. Try refreshing the page.',
    } satisfies ProfileDataResponse;
  }
}
