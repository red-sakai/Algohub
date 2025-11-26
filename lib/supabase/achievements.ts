import type { SupabaseClient } from '@supabase/supabase-js';

const DUPLICATE_ROW_CODE = '23505';
const NO_ROWS_ERROR_CODE = 'PGRST116';

export type GrantAchievementResult = {
  success: boolean;
  alreadyUnlocked?: boolean;
  skipped?: boolean;
};

export async function grantAchievementBySlug(
  supabase: SupabaseClient,
  userId: string,
  slug: string,
): Promise<GrantAchievementResult> {
  if (!userId || !slug) {
    return { success: false, skipped: true } satisfies GrantAchievementResult;
  }

  const { data: achievementRow, error: achievementError } = await supabase
    .from('achievements')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (achievementError) {
    console.error('[grantAchievementBySlug] Failed to locate achievement', { slug, achievementError });
    return { success: false } satisfies GrantAchievementResult;
  }

  const achievementId = achievementRow?.id;
  if (!achievementId) {
    console.warn('[grantAchievementBySlug] Missing achievement ID for slug', slug);
    return { success: false, skipped: true } satisfies GrantAchievementResult;
  }

  const { data: existingLink, error: existingError } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .maybeSingle();

  const existingErrorCode = (existingError as { code?: string } | null)?.code;
  if (existingError && existingErrorCode !== NO_ROWS_ERROR_CODE) {
    console.error('[grantAchievementBySlug] Failed to check existing link', existingError);
    return { success: false } satisfies GrantAchievementResult;
  }

  if (existingLink) {
    return { success: true, alreadyUnlocked: true } satisfies GrantAchievementResult;
  }

  const { error: insertError } = await supabase.from('user_achievements').insert({
    user_id: userId,
    achievement_id: achievementId,
  });

  if (insertError) {
    const insertCode = (insertError as { code?: string } | null)?.code;
    if (insertCode === DUPLICATE_ROW_CODE) {
      return { success: true, alreadyUnlocked: true } satisfies GrantAchievementResult;
    }
    console.error('[grantAchievementBySlug] Failed to insert achievement link', insertError);
    return { success: false } satisfies GrantAchievementResult;
  }

  return { success: true } satisfies GrantAchievementResult;
}
