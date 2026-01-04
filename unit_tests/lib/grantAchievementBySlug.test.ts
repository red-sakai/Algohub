import { grantAchievementBySlug } from '@/lib/supabase/achievements';

import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseErrorLike = { code?: string; message?: string } | null;

type SupabaseResult<T> = { data: T; error: SupabaseErrorLike };

type AchievementsRow = { id: string; created_at?: string | null };

type QueryBuilder<T> = {
  eq: jest.Mock<QueryBuilder<T>, [column: string, value: unknown], unknown>;
  limit: jest.Mock<QueryBuilder<T>, [count: number], unknown>;
  maybeSingle: jest.Mock<Promise<SupabaseResult<T | null>>, [], unknown>;
};

function makeQueryBuilder<T>(result: SupabaseResult<T | null>): QueryBuilder<T> {
  const builder = {} as QueryBuilder<T>;
  builder.eq = jest.fn<QueryBuilder<T>, [column: string, value: unknown]>(() => builder);
  builder.limit = jest.fn<QueryBuilder<T>, [count: number]>(() => builder);
  builder.maybeSingle = jest.fn<Promise<SupabaseResult<T | null>>, []>(async () => result);
  return builder;
}

describe('grantAchievementBySlug', () => {
  it('grants achievement when not already linked', async () => {
    const achievementsQuery = makeQueryBuilder<AchievementsRow>({
      data: { id: 'achievement-1', created_at: '2025-01-01T00:00:00Z' },
      error: null,
    });

    const linkQuery = makeQueryBuilder<{ achievement_id: string }>({
      data: null,
      error: null,
    });

    const insert = jest.fn<
      Promise<{ error: SupabaseErrorLike }>,
      [row: { user_id: string; achievement_id: string }]
    >(async () => ({ error: null }));

    const achievementsSelect = jest.fn<QueryBuilder<AchievementsRow>, [columns: string]>(() => achievementsQuery);
    const userAchievementsSelect = jest.fn<QueryBuilder<{ achievement_id: string }>, [columns: string]>(() => linkQuery);

    const supabaseLike = {
      from: jest.fn<unknown, [table: string]>((table: string) => {
        if (table === 'achievements') {
          return {
            select: achievementsSelect,
          };
        }
        if (table === 'user_achievements') {
          return {
            select: userAchievementsSelect,
            insert,
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const supabase = supabaseLike as unknown as SupabaseClient;

    const result = await grantAchievementBySlug(supabase, 'user-1', 'stacking-em-queues');

    expect(result.success).toBe(true);
    expect(result.alreadyUnlocked).toBeUndefined();
    expect(achievementsQuery.limit).toHaveBeenCalledWith(1);
    expect(linkQuery.limit).toHaveBeenCalledWith(1);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('returns alreadyUnlocked when link exists', async () => {
    const achievementsQuery = makeQueryBuilder<AchievementsRow>({
      data: { id: 'achievement-1', created_at: '2025-01-01T00:00:00Z' },
      error: null,
    });

    const linkQuery = makeQueryBuilder<{ achievement_id: string }>({
      data: { achievement_id: 'achievement-1' },
      error: null,
    });

    const insert = jest.fn<
      Promise<{ error: SupabaseErrorLike }>,
      [row: { user_id: string; achievement_id: string }]
    >(async () => ({ error: null }));

    const achievementsSelect = jest.fn<QueryBuilder<AchievementsRow>, [columns: string]>(() => achievementsQuery);
    const userAchievementsSelect = jest.fn<QueryBuilder<{ achievement_id: string }>, [columns: string]>(() => linkQuery);

    const supabaseLike = {
      from: jest.fn<unknown, [table: string]>((table: string) => {
        if (table === 'achievements') {
          return {
            select: achievementsSelect,
          };
        }
        if (table === 'user_achievements') {
          return {
            select: userAchievementsSelect,
            insert,
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const supabase = supabaseLike as unknown as SupabaseClient;

    const result = await grantAchievementBySlug(supabase, 'user-1', 'gday-sir');

    expect(result.success).toBe(true);
    expect(result.alreadyUnlocked).toBe(true);
    expect(insert).not.toHaveBeenCalled();
  });
});
