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
import { consumeSkipNextAuthModal, consumeSkipNextIrisOpen, setIrisPoint } from '@/lib/transition/transitionBus';
import { LANDING_GRADIENT, PROFILE_GRADIENT, useSlideTransition } from '@/app/components/ui/SlideTransition';
import { decodeStateParam, encodeStateParam } from '@/lib/utils';
import type { AuthUserSummary, UserProfile } from '@/types/auth';
import type { UseHomePageResult } from '@/types/home';
import type { IrisHandle } from '@/app/components/ui/IrisTransition';

const BOUNCE_DURATION = 450;
const FALL_DURATION = 4000;
const ROLL_IN_DURATION = 1600;

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

  const [authUser, setAuthUser] = useState<AuthUserSummary | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
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

  const [skipIrisOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return consumeSkipNextIrisOpen();
  });

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

  useEffect(() => () => clearLogoTimeouts(), [clearLogoTimeouts]);
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

  const triggerLogoShine = useCallback(() => {
    playSfx('/anime_shine.mp3', 0.7);
    logoShineTweenRef.current?.kill();
    logoShineTweenRef.current = null;
    setIsLogoShining(true);
    setLogoShineCycle((prev) => prev + 1);
  }, []);

  const handleLogoClick = useCallback(() => {
    if (showAuthModal) return;
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
  }, [clearLogoTimeouts, scheduleLogoTimeout, showAuthModal]);

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
        router.push('/sign-in');
        transitioningRef.current = false;
        return;
      }

      iris.start({
        x,
        y,
        durationMs: 650,
        onDone: () => {
          setShowLoader(true);
          setTimeout(() => {
            router.push('/sign-in');
            setTimeout(() => {
              setShowLoader(false);
              transitioningRef.current = false;
            }, 200);
          }, 2400);
        },
      });
    },
    [router],
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

      irisRef.current?.start({
        x,
        y,
        durationMs: 650,
        onDone: () => {
          setShowLoader(true);
          setTimeout(() => {
            router.push('/learn');
            setTimeout(() => {
              transitioningRef.current = false;
              setShowLoader(false);
            }, 200);
          }, 2400);
        },
      });
    },
    [router],
  );

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
    showLoader,
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
    handleSignInSelect,
    handleContinueAsGuest,
    handleButtonHover,
    handleProfileToggle,
    handleProfileView,
    handleLogoClick,
    handleStartClick,
  } satisfies UseHomePageResult;
}
