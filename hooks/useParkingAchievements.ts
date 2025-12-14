'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { clearStaleSupabaseSession } from '@/lib/supabase/sessionCleanup';
import { grantAchievementBySlug } from '@/lib/supabase/achievements';

type ParkingAchievementsOptions = {
  stackingSlug: string;
  greetingSlug: string;
  logPrefix?: string;
};

type ParkingAchievementsResult = {
  markQueueVisit: () => void;
  markStackVisit: () => void;
  markInteractionComplete: () => void;
};

export function useParkingAchievements(options: ParkingAchievementsOptions): ParkingAchievementsResult {
  const { stackingSlug, greetingSlug, logPrefix = '[ParkingScene]' } = options;
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const queueMarkerVisitedRef = useRef(false);
  const stackMarkerVisitedRef = useRef(false);
  const stackingAchievementInFlightRef = useRef(false);
  const stackingAchievementUnlockedRef = useRef(false);
  const gdayAchievementInFlightRef = useRef(false);
  const gdayAchievementUnlockedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const primeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) {
          return;
        }
        if (error) {
          const handled = await clearStaleSupabaseSession(supabase, error, `${logPrefix} primeSession`);
          if (!handled) {
            console.error(`${logPrefix} Failed to read Supabase session`, error);
          }
          setCurrentUserId(null);
          return;
        }
        setCurrentUserId(data?.session?.user?.id ?? null);
      } catch (sessionError: unknown) {
        if (!isMounted) {
          return;
        }
        const handled = await clearStaleSupabaseSession(supabase, sessionError as Error, `${logPrefix} primeSession`);
        if (!handled) {
          console.error(`${logPrefix} Unexpected Supabase session failure`, sessionError);
        }
        setCurrentUserId(null);
      }
    };

    primeSession().catch((error) => {
      console.error(`${logPrefix} Unhandled Supabase session error`, error);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      setCurrentUserId(session?.user?.id ?? null);
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase, logPrefix]);

  useEffect(() => {
    if (!currentUserId) {
      queueMarkerVisitedRef.current = false;
      stackMarkerVisitedRef.current = false;
      stackingAchievementUnlockedRef.current = false;
      stackingAchievementInFlightRef.current = false;
      gdayAchievementUnlockedRef.current = false;
      gdayAchievementInFlightRef.current = false;
    }
  }, [currentUserId]);

  const maybeAwardStackingAchievement = useCallback(async () => {
    if (!currentUserId) {
      return;
    }
    if (stackingAchievementUnlockedRef.current) {
      return;
    }
    if (!queueMarkerVisitedRef.current || !stackMarkerVisitedRef.current) {
      return;
    }
    if (stackingAchievementInFlightRef.current) {
      return;
    }
    stackingAchievementInFlightRef.current = true;
    try {
      const result = await grantAchievementBySlug(supabase, currentUserId, stackingSlug);
      if (result.success || result.alreadyUnlocked) {
        stackingAchievementUnlockedRef.current = true;
      } else {
        console.warn(`${logPrefix} Unable to grant stacking achievement`, result);
      }
    } catch (error) {
      console.error(`${logPrefix} Failed to grant stacking achievement`, error);
    } finally {
      stackingAchievementInFlightRef.current = false;
    }
  }, [currentUserId, stackingSlug, supabase, logPrefix]);

  const maybeAwardGdayAchievement = useCallback(async () => {
    if (!currentUserId) {
      return;
    }
    if (gdayAchievementUnlockedRef.current || gdayAchievementInFlightRef.current) {
      return;
    }
    gdayAchievementInFlightRef.current = true;
    try {
      const result = await grantAchievementBySlug(supabase, currentUserId, greetingSlug);
      if (result.success || result.alreadyUnlocked) {
        gdayAchievementUnlockedRef.current = true;
      } else {
        console.warn(`${logPrefix} Unable to grant greeting achievement`, result);
      }
    } catch (error) {
      console.error(`${logPrefix} Failed to grant greeting achievement`, error);
    } finally {
      gdayAchievementInFlightRef.current = false;
    }
  }, [currentUserId, greetingSlug, supabase, logPrefix]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }
    void maybeAwardStackingAchievement();
  }, [currentUserId, maybeAwardStackingAchievement]);

  const markQueueVisit = useCallback(() => {
    queueMarkerVisitedRef.current = true;
    void maybeAwardStackingAchievement();
  }, [maybeAwardStackingAchievement]);

  const markStackVisit = useCallback(() => {
    stackMarkerVisitedRef.current = true;
    void maybeAwardStackingAchievement();
  }, [maybeAwardStackingAchievement]);

  const markInteractionComplete = useCallback(() => {
    void maybeAwardGdayAchievement();
  }, [maybeAwardGdayAchievement]);

  return {
    markQueueVisit,
    markStackVisit,
    markInteractionComplete,
  };
}
