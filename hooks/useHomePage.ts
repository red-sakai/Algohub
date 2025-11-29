'use client';

import { startTransition } from 'react';
import { useCallback } from '@/hooks/useCallback';
import { useEffect } from '@/hooks/useEffect';
import { useMemo } from '@/hooks/useMemo';
import { useRef } from '@/hooks/useRef';
import { useState } from '@/hooks/useState';
import { useRouter, useSearchParams } from 'next/navigation';
import { gsap } from 'gsap';
import { playSfx } from '@/lib/audio/sfx';
import { loadLandingSession } from '@/actions/auth/load-landing-session';
import { showGlobalLoader, hideGlobalLoader, GLOBAL_LOADER_MIN_MS } from '@/lib/transition/globalLoaderBus';
import { consumeSkipNextAuthModal, consumeSkipNextIrisOpen, setIrisPoint } from '@/lib/transition/transitionBus';
import { CREDITS_GRADIENT, LANDING_GRADIENT, PROFILE_GRADIENT, useSlideTransition } from '@/app/components/ui/SlideTransition';
import { decodeStateParam, encodeStateParam } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { AuthUserSummary, UserProfile } from '@/types/auth';
import type { AchievementToastState, UseHomePageResult } from '@/types/home';
import type { IrisHandle } from '@/app/components/ui/IrisTransition';

const BOUNCE_DURATION = 450;
const FALL_DURATION = 4000;
const ROLL_IN_DURATION = 1600;
const ACHIEVEMENT_TOAST_VISIBLE_MS = 6000;
const ACHIEVEMENT_TOAST_EXIT_MS = 260;
const SIX_SEV_SLUG = 'six-sev';
const SIX_SEV_TARGET_CLICKS = 67;
const SIX_SEV_ICON_FALLBACK = '/achievements/67.png';

type AchievementRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string | null;
};

type SixSevDefinition = {
  id: string;
  title: string;
  description: string;
  icon: string | null;
};

export function useHomePage(): UseHomePageResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slideTransition = useSlideTransition();

  const irisRef = useRef<IrisHandle | null>(null);
  const profileButtonRef = useRef<HTMLButtonElement | null>(null);
  const profilePanelRef = useRef<HTMLDivElement | null>(null);
  const defaultLogoRef = useRef<HTMLImageElement | null>(null);
  const logoShineRef = useRef<HTMLImageElement | null>(null);
  const profileHrefRef = useRef<string>('/profile');
  const rollTweenRef = useRef<gsap.core.Tween | null>(null);
  const logoShineTweenRef = useRef<gsap.core.Timeline | null>(null);
  const animationTimeoutsRef = useRef<number[]>([]);
  const logoLockRef = useRef(false);
  const lastParamsRef = useRef<string | null>(null);
  const transitioningRef = useRef(false);
  const loaderDelayTimeoutRef = useRef<number | null>(null);
  const logoClickCountRef = useRef(0);
  const lastSixSevAttemptRef = useRef(0);
  const pendingSixSevUnlockRef = useRef(false);
  const unlockingSixSevRef = useRef(false);
  const sixSevDefinitionRef = useRef<SixSevDefinition | null>(null);
  const hasSixSevAchievementRef = useRef(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const achievementSeenRef = useRef<Set<string>>(new Set());

  const [authUser, setAuthUser] = useState<AuthUserSummary | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [defaultLogoAnimation, setDefaultLogoAnimation] = useState<'idle' | 'rollIn' | 'hidden'>('idle');
  const [bulletStage, setBulletStage] = useState<'hidden' | 'bounce' | 'fall'>('hidden');
  const [bulletCycle, setBulletCycle] = useState(0);
  const [logoEntryDirection, setLogoEntryDirection] = useState<'left' | 'right'>('left');
  const [isShaking, setIsShaking] = useState(false);
  const [isLogoShining, setIsLogoShining] = useState(false);
  const [logoShineCycle, setLogoShineCycle] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return !consumeSkipNextAuthModal();
  });
  const [achievementToast, setAchievementToast] = useState<AchievementToastState | null>(null);
  const [isAchievementToastExiting, setIsAchievementToastExiting] = useState(false);

  const [skipIrisOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return consumeSkipNextIrisOpen();
  });

  useEffect(() => {
    hideGlobalLoader();
  }, []);

  const clearLogoTimeouts = useCallback(() => {
    animationTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    animationTimeoutsRef.current = [];
  }, []);

  const teardownTweens = useCallback(() => {
    rollTweenRef.current?.kill();
    rollTweenRef.current = null;
    logoShineTweenRef.current?.kill();
    logoShineTweenRef.current = null;
  }, []);

  const scheduleLogoTimeout = useCallback((fn: () => void, delay: number) => {
    if (typeof window === 'undefined') {
      return -1;
    }
    const id = window.setTimeout(fn, delay);
    animationTimeoutsRef.current.push(id);
    return id;
  }, []);

  const clearToastTimeout = useCallback(() => {
    if (toastTimeoutRef.current !== null) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  }, []);

  const pushAchievementToast = useCallback(
    (payload: AchievementToastState, options?: { celebrate?: boolean }) => {
      clearToastTimeout();
      setIsAchievementToastExiting(false);
      setAchievementToast(payload);
      if (options?.celebrate) {
        playSfx('/achievements/achievement_sfx.mp3', 0.85);
      }
    },
    [clearToastTimeout],
  );

  useEffect(() => () => clearLogoTimeouts(), [clearLogoTimeouts]);
  useEffect(
    () => () => {
      if (loaderDelayTimeoutRef.current !== null) {
        clearTimeout(loaderDelayTimeoutRef.current);
        loaderDelayTimeoutRef.current = null;
      }
    },
    [],
  );
  useEffect(() => () => clearToastTimeout(), [clearToastTimeout]);
  useEffect(() => teardownTweens, [teardownTweens]);

  useEffect(() => {
    if (!showAuthModal) return;
    if (typeof window === 'undefined') return;
    const { body } = document;
    const original = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = original;
    };
  }, [showAuthModal]);

  const handleButtonHover = useCallback(() => {
    playSfx('/gun_sfx.mp3', 0.6);
  }, []);

  const handleContinueAsGuest = useCallback(() => {
    playSfx('/button_click.mp3', 0.6);
    setShowAuthModal(false);
  }, []);

  const dismissAchievementToast = useCallback(() => {
    if (!achievementToast) {
      return;
    }
    clearToastTimeout();
    setIsAchievementToastExiting(true);
    if (typeof window === 'undefined') {
      setAchievementToast(null);
      setIsAchievementToastExiting(false);
      return;
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setAchievementToast(null);
      setIsAchievementToastExiting(false);
      toastTimeoutRef.current = null;
    }, ACHIEVEMENT_TOAST_EXIT_MS);
  }, [achievementToast, clearToastTimeout]);

  useEffect(() => {
    if (!achievementToast) {
      setIsAchievementToastExiting(false);
      clearToastTimeout();
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    setIsAchievementToastExiting(false);
    clearToastTimeout();
    toastTimeoutRef.current = window.setTimeout(() => {
      dismissAchievementToast();
    }, ACHIEVEMENT_TOAST_VISIBLE_MS);
    return () => {
      clearToastTimeout();
    };
  }, [achievementToast, clearToastTimeout, dismissAchievementToast]);

  const triggerLogoShine = useCallback(() => {
    playSfx('/anime_shine.mp3', 0.7);
    logoShineTweenRef.current?.kill();
    logoShineTweenRef.current = null;
    setIsLogoShining(true);
    setLogoShineCycle((prev) => prev + 1);
  }, []);

  const fetchSixSevDefinition = useCallback(async (): Promise<SixSevDefinition> => {
    if (sixSevDefinitionRef.current) {
      return sixSevDefinitionRef.current;
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('achievements')
      .select('id, title, description, icon')
      .eq('slug', SIX_SEV_SLUG)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data?.id) {
      throw new Error('Six Sev- achievement is not configured in Supabase.');
    }

    const definition: SixSevDefinition = {
      id: data.id,
      title: data.title ?? 'Six Sev-',
      description: data.description ?? `Click the AlgoHub logo ${SIX_SEV_TARGET_CLICKS} times.`,
      icon: data.icon ?? null,
    };

    sixSevDefinitionRef.current = definition;
    return definition;
  }, []);

  const attemptSixSevUnlock = useCallback(
    async (clickCount: number) => {
      lastSixSevAttemptRef.current = clickCount;

      if (hasSixSevAchievementRef.current || unlockingSixSevRef.current) {
        return;
      }

      if (!authUser) {
        pendingSixSevUnlockRef.current = true;
        pushAchievementToast({
          title: 'Sign in to claim Six Sev-',
          description: 'You found the secret! Sign in so we can add it to your profile.',
          icon: SIX_SEV_ICON_FALLBACK,
          tone: 'info',
        });
        return;
      }

      pendingSixSevUnlockRef.current = false;
      unlockingSixSevRef.current = true;

      try {
        const definition = await fetchSixSevDefinition();
        const supabase = getSupabaseClient();

        const { data: existingLink, error: existingError } = await supabase
          .from('user_achievements')
          .select('unlocked_at')
          .eq('user_id', authUser.id)
          .eq('achievement_id', definition.id)
          .maybeSingle();

        const existingErrorCode = (existingError as { code?: string } | null)?.code;

        if (existingError && existingErrorCode !== 'PGRST116') {
          throw existingError;
        }

        const icon = definition.icon ?? SIX_SEV_ICON_FALLBACK;

        if (existingLink) {
          hasSixSevAchievementRef.current = true;
          achievementSeenRef.current.add(definition.id);
          pushAchievementToast({
            title: `${definition.title} already unlocked`,
            description: 'You already claimed this trophy. Nice work!',
            icon,
            tone: 'info',
          });
          return;
        }

        const { error: insertError } = await supabase.from('user_achievements').insert({
          user_id: authUser.id,
          achievement_id: definition.id,
        });

        if (insertError) {
          throw insertError;
        }

        hasSixSevAchievementRef.current = true;
        achievementSeenRef.current.add(definition.id);
        pushAchievementToast(
          {
            title: `${definition.title} unlocked!`,
            description: `You clicked the AlgoHub logo ${SIX_SEV_TARGET_CLICKS} times.`,
            icon,
            tone: 'success',
          },
          { celebrate: true },
        );
        triggerLogoShine();
      } catch (error) {
        console.error('[HomePage] Failed to unlock Six Sev achievement', error);
        pushAchievementToast({
          title: 'Achievement hiccup',
          description: "We couldn't record Six Sev- just now. Try again in a moment.",
          icon: SIX_SEV_ICON_FALLBACK,
          tone: 'error',
        });
      } finally {
        unlockingSixSevRef.current = false;
      }
    },
    [authUser, fetchSixSevDefinition, pushAchievementToast, triggerLogoShine],
  );

  const handleLogoClick = useCallback(() => {
    if (showAuthModal) return;

    const nextClickCount = logoClickCountRef.current + 1;
    logoClickCountRef.current = nextClickCount;

    if (
      !hasSixSevAchievementRef.current &&
      nextClickCount >= SIX_SEV_TARGET_CLICKS &&
      nextClickCount > lastSixSevAttemptRef.current
    ) {
      void attemptSixSevUnlock(nextClickCount);
    }

    if (logoLockRef.current) return;
    logoLockRef.current = true;
    clearLogoTimeouts();
    setIsShaking(false);
    setIsLogoShining(false);
    logoShineTweenRef.current?.kill();
    logoShineTweenRef.current = null;
    playSfx('/gun_shot_sfx.mp3', 0.8);
    playSfx('/algohub_falling.mp3', 0.8);
    setFlashOpacity(1);
    setIsFlashing(true);
    scheduleLogoTimeout(() => setFlashOpacity(0), 420);
    scheduleLogoTimeout(() => {
      setIsFlashing(false);
      setFlashOpacity(0);
    }, 1200);
    setBulletCycle((prev) => prev + 1);
    setBulletStage('bounce');
    setDefaultLogoAnimation('hidden');
    scheduleLogoTimeout(() => setBulletStage('fall'), BOUNCE_DURATION);
    scheduleLogoTimeout(() => setIsShaking(true), FALL_DURATION);
    scheduleLogoTimeout(() => setIsShaking(false), FALL_DURATION + 1000);

    const rollInStartDelay = BOUNCE_DURATION + FALL_DURATION;

    scheduleLogoTimeout(() => {
      setBulletStage('hidden');
      scheduleLogoTimeout(() => setLogoEntryDirection(Math.random() > 0.5 ? 'left' : 'right'), 16);
      scheduleLogoTimeout(() => setDefaultLogoAnimation('rollIn'), 32);
    }, rollInStartDelay);

    scheduleLogoTimeout(() => {
      setDefaultLogoAnimation('idle');
      logoLockRef.current = false;
      clearLogoTimeouts();
      setIsShaking(false);
      setIsLogoShining(false);
      logoShineTweenRef.current?.kill();
      logoShineTweenRef.current = null;
    }, rollInStartDelay + ROLL_IN_DURATION + 200);
  }, [attemptSixSevUnlock, clearLogoTimeouts, scheduleLogoTimeout, showAuthModal]);

  const scheduleGlobalNavigation = useCallback(
    (path: string, options?: { loaderAlreadyVisible?: boolean }) => {
      if (typeof window === 'undefined') {
        router.push(path);
        transitioningRef.current = false;
        return;
      }
      if (!options?.loaderAlreadyVisible) {
        showGlobalLoader();
      }
      if (loaderDelayTimeoutRef.current !== null) {
        clearTimeout(loaderDelayTimeoutRef.current);
      }
      loaderDelayTimeoutRef.current = window.setTimeout(() => {
        router.push(path);
        transitioningRef.current = false;
        loaderDelayTimeoutRef.current = null;
      }, GLOBAL_LOADER_MIN_MS);
    },
    [router],
  );

  const handleSignInSelect = useCallback<UseHomePageResult['handleSignInSelect']>(
    (event) => {
      playSfx('/button_click.mp3', 0.6);

      event.currentTarget.dispatchEvent(
        new MouseEvent('mouseleave', {
          bubbles: true,
          relatedTarget: event.currentTarget.ownerDocument?.body ?? null,
        }),
      );

      setShowAuthModal(false);

      if (transitioningRef.current) return;
      transitioningRef.current = true;

      event.preventDefault();

      let { clientX: x, clientY: y } = event;
      if (typeof x !== 'number' || typeof y !== 'number' || (x === 0 && y === 0)) {
        const rect = event.currentTarget.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }

      setIrisPoint(x, y);

      const iris = irisRef.current;
      if (!iris) {
        scheduleGlobalNavigation('/sign-in');
        return;
      }

      let navTriggered = false;
      let fallbackId: number | null = null;

      const startNavigation = () => {
        if (navTriggered) {
          return;
        }
        navTriggered = true;
        if (fallbackId !== null) {
          clearTimeout(fallbackId);
          fallbackId = null;
        }
        scheduleGlobalNavigation('/sign-in', { loaderAlreadyVisible: true });
      };

      iris.start({
        x,
        y,
        durationMs: 650,
        showLoaderOnClose: true,
        onDone: startNavigation,
      });

      fallbackId = window.setTimeout(startNavigation, 900);
    },
    [scheduleGlobalNavigation],
  );

  const handleProfileToggle = useCallback(() => {
    playSfx('/button_click.mp3', 0.5);
    setIsProfilePanelOpen((prev) => !prev);
  }, []);

  const handleProfileView = useCallback<UseHomePageResult['handleProfileView']>(
    (event) => {
      event.preventDefault();
      playSfx('/button_click.mp3', 0.55);
      setIsProfilePanelOpen(false);
      if (transitioningRef.current) return;
      transitioningRef.current = true;
      slideTransition.start({
        origin: 'right',
        fromGradient: LANDING_GRADIENT,
        toGradient: PROFILE_GRADIENT,
        onCovered: () => {
          router.push(profileHrefRef.current);
        },
        onDone: () => {
          transitioningRef.current = false;
        },
      });
    },
    [router, slideTransition],
  );

  const handleCreditsClick = useCallback<UseHomePageResult['handleCreditsClick']>(
    (event) => {
      event.preventDefault();
      playSfx('/button_click.mp3', 0.55);
      if (transitioningRef.current) return;
      transitioningRef.current = true;
      slideTransition.start({
        origin: 'left',
        fromGradient: LANDING_GRADIENT,
        toGradient: CREDITS_GRADIENT,
        onCovered: () => {
          router.push('/credits');
        },
        onDone: () => {
          transitioningRef.current = false;
        },
      });
    },
    [router, slideTransition],
  );

  const handleStartClick = useCallback<UseHomePageResult['handleStartClick']>(
    (event) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      playSfx('/button_click.mp3', 0.6);
      if (transitioningRef.current) return;
      transitioningRef.current = true;

      let { clientX: x, clientY: y } = event;
      if (typeof x !== 'number' || typeof y !== 'number' || (x === 0 && y === 0)) {
        const rect = event.currentTarget.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }

      setIrisPoint(x, y);

      const controller = irisRef.current;
      if (controller) {
        let loaderTriggered = false;
        let fallbackId: number | null = null;

        const triggerLoader = (loaderVisible: boolean) => {
          if (loaderTriggered) {
            return;
          }
          loaderTriggered = true;
          if (fallbackId !== null) {
            clearTimeout(fallbackId);
            fallbackId = null;
          }
          scheduleGlobalNavigation('/learn', loaderVisible ? { loaderAlreadyVisible: true } : undefined);
        };

        controller.start({
          x,
          y,
          durationMs: 650,
          showLoaderOnClose: true,
          onDone: () => triggerLoader(true),
        });

        fallbackId = window.setTimeout(() => triggerLoader(false), 900);
      } else {
        scheduleGlobalNavigation('/learn');
      }
    },
    [scheduleGlobalNavigation],
  );

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      router.replace('/admin');
    }
  }, [router, userProfile?.role]);

  useEffect(() => {
    if (!searchParams) return;
    const serialized = searchParams.toString();
    if (!serialized || serialized === lastParamsRef.current) return;
    lastParamsRef.current = serialized;

    const authEncoded = searchParams.get('auth');
    const profileEncoded = searchParams.get('profile');
    if (!authEncoded && !profileEncoded) return;

    const decodedAuth = authEncoded ? decodeStateParam<AuthUserSummary>(authEncoded) : null;
    const decodedProfile = profileEncoded ? decodeStateParam<UserProfile>(profileEncoded) : null;

    startTransition(() => {
      setAuthUser(decodedAuth);
      setUserProfile(decodedProfile);
      setShowAuthModal(false);
      setIsProfilePanelOpen(false);
    });

    router.replace('/', { scroll: false });
    lastParamsRef.current = null;
  }, [router, searchParams]);

  useEffect(() => {
    if (authUser) return;
    let isActive = true;

    const loadSession = async () => {
      const result = await loadLandingSession();
      if (!isActive) return;
      if (!result.authSummary) return;

      startTransition(() => {
        setAuthUser(result.authSummary);
        setUserProfile(result.profile);
        setShowAuthModal(false);
        setIsProfilePanelOpen(false);
      });
    };

    loadSession().catch((error) => {
      if (!isActive) return;
      console.error('Failed to restore Supabase session', error);
    });

    return () => {
      isActive = false;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) {
      hasSixSevAchievementRef.current = false;
      pendingSixSevUnlockRef.current = false;
      return;
    }

    let isMounted = true;

    const primeAchievementState = async () => {
      try {
        const definition = await fetchSixSevDefinition();
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', authUser.id)
          .eq('achievement_id', definition.id)
          .maybeSingle();
        const errorCode = (error as { code?: string } | null)?.code;
        if (error && errorCode !== 'PGRST116') {
          console.error('[HomePage] Failed to read Six Sev status', error);
          return;
        }
        if (!isMounted) return;
        hasSixSevAchievementRef.current = Boolean(data);
      } catch (error) {
        if (!isMounted) return;
        console.error('[HomePage] Failed to prime Six Sev achievement', error);
      }
    };

    primeAchievementState().catch((error) => {
      console.error('[HomePage] Unexpected Six Sev prime failure', error);
    });

    return () => {
      isMounted = false;
    };
  }, [authUser, fetchSixSevDefinition]);

  useEffect(() => {
    if (!authUser) {
      achievementSeenRef.current.clear();
      return;
    }
    if (!pendingSixSevUnlockRef.current) {
      return;
    }
    if (hasSixSevAchievementRef.current) {
      pendingSixSevUnlockRef.current = false;
      return;
    }
    const targetCount = Math.max(logoClickCountRef.current, SIX_SEV_TARGET_CLICKS);
    void attemptSixSevUnlock(targetCount);
  }, [authUser, attemptSixSevUnlock]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    let isMounted = true;
    const supabase = getSupabaseClient();

    const primeAchievements = async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at, achievements (id, slug, title, description, icon)')
        .eq('user_id', authUser.id)
        .order('unlocked_at', { ascending: true });

      if (error) {
        console.error('[HomePage] Failed to load user achievements', error);
        return;
      }

      const seen = achievementSeenRef.current;
      const now = Date.now();
      const recentWindowMs = 12_000;
      let latestToast: AchievementToastState | null = null;

      for (const row of data ?? []) {
        const achievementDataRaw = Array.isArray(row.achievements) ? row.achievements[0] : row.achievements;
        const achievement = achievementDataRaw as AchievementRecord | null;
        if (!achievement?.id) {
          continue;
        }
        if (seen.has(achievement.id)) {
          continue;
        }
        seen.add(achievement.id);

        if (!row.unlocked_at) {
          continue;
        }

        const unlockedAtTime = Date.parse(row.unlocked_at);
        if (Number.isNaN(unlockedAtTime)) {
          continue;
        }
        if (now - unlockedAtTime > recentWindowMs) {
          continue;
        }

        latestToast = {
          title: `${achievement.title ?? 'Achievement unlocked!'}`,
          description: achievement.description ?? undefined,
          icon: achievement.icon,
          tone: 'success',
        } satisfies AchievementToastState;
      }

      if (latestToast && isMounted) {
        pushAchievementToast(latestToast, { celebrate: true });
      }
    };

    primeAchievements().catch((error) => {
      console.error('[HomePage] Unexpected failure priming achievements', error);
    });

    return () => {
      isMounted = false;
    };
  }, [authUser, pushAchievementToast]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`user_achievements:${authUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${authUser.id}`,
        },
        async (payload) => {
          const newRow = (payload.new ?? {}) as { achievement_id?: unknown; unlocked_at?: unknown };
          const achievementId = typeof newRow.achievement_id === 'string' ? newRow.achievement_id : null;
          if (!achievementId) {
            return;
          }
          if (achievementSeenRef.current.has(achievementId)) {
            return;
          }

          const { data, error } = await supabase
            .from('achievements')
            .select('id, slug, title, description, icon')
            .eq('id', achievementId)
            .maybeSingle();

          if (error || !data?.id) {
            console.error('[HomePage] Failed to resolve inserted achievement', error ?? new Error('Missing achievement record'));
            return;
          }

          achievementSeenRef.current.add(data.id);
          pushAchievementToast(
            {
              title: `${data.title ?? 'Achievement unlocked!'}`,
              description: data.description ?? undefined,
              icon: data.icon ?? null,
              tone: 'success',
            },
            { celebrate: true },
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, pushAchievementToast]);

  useEffect(() => {
    if (!isProfilePanelOpen) return;

    const handleEvent = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (profilePanelRef.current?.contains(target)) return;
      if (profileButtonRef.current?.contains(target)) return;
      setIsProfilePanelOpen(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfilePanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleEvent);
    document.addEventListener('touchstart', handleEvent);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleEvent);
      document.removeEventListener('touchstart', handleEvent);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isProfilePanelOpen]);

  useEffect(() => {
    const target = defaultLogoRef.current;
    if (!target) return;

    if (defaultLogoAnimation === 'hidden') {
      rollTweenRef.current?.kill();
      gsap.set(target, { opacity: 0 });
      return;
    }

    if (defaultLogoAnimation !== 'rollIn') {
      return;
    }

    rollTweenRef.current?.kill();

    const fromX = logoEntryDirection === 'left' ? '-135vw' : '135vw';
    const fromY = logoEntryDirection === 'left' ? '14vh' : '-14vh';
    const fromRotation = logoEntryDirection === 'left' ? -900 : 900;

    const tween = gsap.fromTo(
      target,
      {
        opacity: 0,
        x: fromX,
        y: fromY,
        rotation: fromRotation,
        scale: 0.85,
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: ROLL_IN_DURATION / 1000,
        ease: 'expo.out',
      },
    );
    tween.eventCallback('onComplete', triggerLogoShine);
    rollTweenRef.current = tween;

    return () => {
      tween.eventCallback('onComplete', null);
      rollTweenRef.current?.kill();
    };
  }, [defaultLogoAnimation, logoEntryDirection, triggerLogoShine]);

  useEffect(() => {
    if (!isLogoShining || !logoShineRef.current) {
      return;
    }

    const element = logoShineRef.current;
    logoShineTweenRef.current?.kill();

    const timeline = gsap.timeline({
      onComplete: () => {
        if (logoShineTweenRef.current === timeline) {
          logoShineTweenRef.current = null;
        }
        setIsLogoShining(false);
      },
    });

    timeline.set(element, {
      opacity: 0,
      xPercent: -50,
      yPercent: -50,
      scale: 1,
      filter: 'brightness(1.28) saturate(0) drop-shadow(0 0 0.55rem rgba(255,255,255,0.78))',
    });

    timeline.to(element, { opacity: 1, duration: 0.22, ease: 'power1.out' });
    timeline.to(element, { opacity: 1, duration: 0.55, ease: 'none' });
    timeline.to(element, { opacity: 0, duration: 1.1, ease: 'power2.out' });

    logoShineTweenRef.current = timeline;

    return () => {
      if (logoShineTweenRef.current === timeline) {
        logoShineTweenRef.current = null;
      }
      timeline.kill();
    };
  }, [isLogoShining, logoShineCycle]);

  const profileHref = useMemo(() => {
    if (!authUser) {
      profileHrefRef.current = '/profile';
      return '/profile';
    }
    const params = new URLSearchParams();
    params.set('auth', encodeStateParam(authUser));
    if (userProfile) {
      params.set('profile', encodeStateParam(userProfile));
    }
    const value = `/profile?${params.toString()}`;
    profileHrefRef.current = value;
    return value;
  }, [authUser, userProfile]);

  const defaultLogoAnimationValue = useMemo(() => {
    if (defaultLogoAnimation === 'idle') return 'logoFloat 8s ease-in-out infinite';
    return 'none';
  }, [defaultLogoAnimation]);

  const bulletAnimationValue = useMemo(() => {
    if (bulletStage === 'bounce') return 'logoBounce 450ms ease-out forwards';
    if (bulletStage === 'fall') return 'logoFall 4s cubic-bezier(0.25, 0.82, 0.25, 1) forwards';
    return 'none';
  }, [bulletStage]);

  const defaultLogoOpacity = defaultLogoAnimation === 'hidden' ? 0 : 1;
  const defaultLogoOpacityTransition =
    defaultLogoAnimation === 'hidden'
      ? 'opacity 120ms ease-in'
      : defaultLogoAnimation === 'rollIn'
      ? 'opacity 60ms ease-in'
      : 'opacity 200ms ease-out';

  const userInitial = useMemo(() => {
    const fromProfile = userProfile?.displayName?.charAt(0).toUpperCase();
    if (fromProfile) return fromProfile;
    const fromEmail = authUser?.email?.charAt(0).toUpperCase();
    if (fromEmail) return fromEmail;
    return 'A';
  }, [authUser, userProfile]);

  const isBulletVisible = bulletStage !== 'hidden';

  return {
    authUser,
    userProfile,
    userInitial,
    profileHref,
    isProfilePanelOpen,
    profileButtonRef,
    profilePanelRef,
    irisRef,
    defaultLogoRef,
    logoShineRef,
    showAuthModal,
    skipIrisOpen,
    isShaking,
    isFlashing,
    flashOpacity,
    isLogoShining,
    isBulletVisible,
    bulletCycle,
    logoShineCycle,
    defaultLogoOpacity,
    defaultLogoAnimationValue,
    defaultLogoOpacityTransition,
    bulletAnimationValue,
    achievementToast,
    isAchievementToastExiting,
    dismissAchievementToast,
    handleSignInSelect,
    handleContinueAsGuest,
    handleButtonHover,
    handleProfileToggle,
    handleProfileView,
    handleCreditsClick,
    handleLogoClick,
    handleStartClick,
  } satisfies UseHomePageResult;
}
