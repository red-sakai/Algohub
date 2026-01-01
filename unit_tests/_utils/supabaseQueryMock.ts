type ThenableResult<T> = {
  data?: T;
  error?: { message?: string } | null;
  count?: number | null;
};

type PromiseCallbacks<T> = {
  onFulfilled?: ((value: T) => unknown) | null;
  onRejected?: ((reason: unknown) => unknown) | null;
};

type ThenableQuery<T> = {
  eq: (...args: unknown[]) => ThenableQuery<T>;
  gte: (...args: unknown[]) => ThenableQuery<T>;
  order: (...args: unknown[]) => ThenableQuery<T>;
  then: (onFulfilled?: PromiseCallbacks<ThenableResult<T>>['onFulfilled'], onRejected?: PromiseCallbacks<ThenableResult<T>>['onRejected']) => Promise<unknown>;
  catch: (onRejected?: PromiseCallbacks<ThenableResult<T>>['onRejected']) => Promise<unknown>;
  finally: (onFinally?: (() => void) | null) => Promise<ThenableResult<T>>;
};

interface MutableThenableQuery<T> extends ThenableQuery<T> {
  eq: jest.Mock<MutableThenableQuery<T>, unknown[]>;
  gte: jest.Mock<MutableThenableQuery<T>, unknown[]>;
  order: jest.Mock<MutableThenableQuery<T>, unknown[]>;
}

export function makeSupabaseQuery<T>(result: ThenableResult<T>): ThenableQuery<T> {
  const query = {} as MutableThenableQuery<T>;

  query.eq = jest.fn(() => query);
  query.gte = jest.fn(() => query);
  query.order = jest.fn(() => query);
  query.then = (
    onFulfilled?: PromiseCallbacks<ThenableResult<T>>['onFulfilled'],
    onRejected?: PromiseCallbacks<ThenableResult<T>>['onRejected'],
  ) => Promise.resolve(result).then(onFulfilled as never, onRejected as never);
  query.catch = (onRejected?: PromiseCallbacks<ThenableResult<T>>['onRejected']) =>
    Promise.resolve(result).catch(onRejected as never);
  query.finally = (onFinally?: (() => void) | null) => Promise.resolve(result).finally(onFinally ?? undefined);

  return query;
}

export function makeSupabaseClient(stubs: {
  usersSelect?: ThenableResult<unknown>;
  achievementsSelect?: ThenableResult<unknown>;
  countUsersStudent?: number;
  countUsersStudentSince7d?: number;
  countUsersStudentSince30d?: number;
  countAchievements?: number;
  countAchievementsSince7d?: number;
  countAchievementsSince30d?: number;
}) {
  const {
    usersSelect = { data: [], error: null },
    achievementsSelect = { data: [], error: null },
    countUsersStudent = 0,
    countUsersStudentSince7d = 0,
    countUsersStudentSince30d = 0,
    countAchievements = 0,
    countAchievementsSince7d = 0,
    countAchievementsSince30d = 0,
  } = stubs;

  const makeCountQuery = (count: number) => makeSupabaseQuery({ count, error: null });

  let usersSinceCallIndex = 0;
  let achievementsSinceCallIndex = 0;

  // Track per-table chained calls. This is enough for our routes.
  return {
    from: jest.fn((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn((columns: string, options?: unknown) => {
            const opts = typeof options === 'object' && options !== null
              ? (options as { count?: unknown; head?: unknown })
              : undefined;
            if (opts?.count === 'exact' && opts?.head === true) {
              // Admin AI Insight counts call select('*', {count:'exact', head:true})
              // Later chained with eq(role,'student') and/or gte(created_at,...)
              // We dispatch counts based on presence of gte/eq calls via a tiny state machine.
              let sawGte = false;
              let sawRoleStudent = false;
              const query = makeCountQuery(countUsersStudent) as MutableThenableQuery<unknown>;

              query.eq = jest.fn((key: unknown, value: unknown) => {
                if (key === 'role' && value === 'student') sawRoleStudent = true;
                return query;
              });

              query.gte = jest.fn(() => {
                sawGte = true;
                return query;
              });

              query.then = (
                onFulfilled?: PromiseCallbacks<{ count: number | null; error: { message?: string } | null }>['onFulfilled'],
                onRejected?: PromiseCallbacks<{ count: number | null; error: { message?: string } | null }>['onRejected'],
              ) => {
                let count = countUsersStudent;
                if (sawRoleStudent && sawGte) {
                  // We can't distinguish 7d vs 30d from input, but the route calls twice.
                  // We'll consume 7d first, then 30d using a closure counter.
                  const next = usersSinceCallIndex;
                  usersSinceCallIndex += 1;
                  count = next === 0 ? countUsersStudentSince7d : countUsersStudentSince30d;
                }

                return Promise.resolve({ count, error: null }).then(onFulfilled as never, onRejected as never);
              };

              return query;
            }

            // Student growth route selects created_at and orders.
            // Student growth route selects created_at and orders.
            return makeSupabaseQuery(usersSelect);
          }),
          eq: jest.fn(() => makeSupabaseQuery(usersSelect)),
          order: jest.fn(() => makeSupabaseQuery(usersSelect)),
        };
      }

      if (table === 'user_achievements') {
        return {
          select: jest.fn((columns: string, options?: unknown) => {
            const opts = typeof options === 'object' && options !== null
              ? (options as { count?: unknown; head?: unknown })
              : undefined;
            if (opts?.count === 'exact' && opts?.head === true) {
              let sawGte = false;
              const query = makeCountQuery(countAchievements) as MutableThenableQuery<unknown>;

              query.eq = jest.fn(() => query);

              query.gte = jest.fn(() => {
                sawGte = true;
                return query;
              });

              query.then = (
                onFulfilled?: PromiseCallbacks<{ count: number | null; error: { message?: string } | null }>['onFulfilled'],
                onRejected?: PromiseCallbacks<{ count: number | null; error: { message?: string } | null }>['onRejected'],
              ) => {
                let count = countAchievements;
                if (sawGte) {
                  const next = achievementsSinceCallIndex;
                  achievementsSinceCallIndex += 1;
                  count = next === 0 ? countAchievementsSince7d : countAchievementsSince30d;
                }
                return Promise.resolve({ count, error: null }).then(onFulfilled as never, onRejected as never);
              };

              return query;
            }

            // Achievements gained route selects unlocked_at and orders.
            return makeSupabaseQuery(achievementsSelect);
          }),
          order: jest.fn(() => makeSupabaseQuery(achievementsSelect)),
        };
      }

      return {
        select: jest.fn(() => makeSupabaseQuery({ data: [], error: null })),
      };
    }),
  };
}
