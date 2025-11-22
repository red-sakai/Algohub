"use client";

import type { MouseEvent } from 'react';
import { useCallback } from '@/hooks/useCallback';
import { useEffect } from '@/hooks/useEffect';
import { useMemo } from '@/hooks/useMemo';
import { useState } from '@/hooks/useState';
import { useRouter, useSearchParams } from 'next/navigation';
import { LANDING_GRADIENT, PROFILE_GRADIENT, useSlideTransition } from '@/app/components/ui/SlideTransition';
import { playSfx } from '@/lib/audio/sfx';
import { setSkipNextAuthModal, setSkipNextIrisOpen } from '@/lib/transition/transitionBus';
import { fetchProfileData } from '@/actions/profile/fetch-profile-data';
import { signOutUser } from '@/actions/auth/sign-out';
import { decodeStateParam } from '@/lib/utils';
import type { AuthUserSummary, UserProfile } from '@/types/auth';
import type { UserAchievement } from '@/types/achievements';
import type { UseProfilePageResult } from '@/types/profile';

function useProfilePage(): UseProfilePageResult {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slideTransition = useSlideTransition();
  const [authSummary, setAuthSummary] = useState<AuthUserSummary | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const decodedAuthFromQuery = useMemo(() => {
    const authParam = searchParams?.get('auth');
    if (!authParam) return null;
    try {
      return decodeStateParam<AuthUserSummary>(authParam);
    } catch (error) {
      console.error('Failed to decode auth param', error);
      return null;
    }
  }, [searchParams]);

  const decodedProfileFromQuery = useMemo(() => {
    const profileParam = searchParams?.get('profile');
    if (!profileParam) return null;
    try {
      return decodeStateParam<UserProfile>(profileParam);
    } catch (error) {
      console.error('Failed to decode profile param', error);
      return null;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!slideTransition.isRunning()) {
      slideTransition.setGradient(PROFILE_GRADIENT);
    }
  }, [slideTransition]);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      setIsLoading(true);
      const result = await fetchProfileData();
      if (!isActive) return;
      setAuthSummary(result.authSummary);
      setProfile(result.profile);
      setAchievements(result.achievements);
      setErrorMessage(result.errorMessage ?? null);
      setIsLoading(false);
    };

    loadProfile().catch((error) => {
      if (!isActive) return;
      console.error('Failed to load profile view', error);
      setErrorMessage('We hit a snag loading your profile. Try refreshing the page.');
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const currentAuth = useMemo(
    () => authSummary ?? decodedAuthFromQuery,
    [authSummary, decodedAuthFromQuery],
  );

  const currentProfile = useMemo(
    () => profile ?? decodedProfileFromQuery,
    [profile, decodedProfileFromQuery],
  );

  const handleBackToLanding = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    playSfx('/button_click.mp3', 0.55);
    setSkipNextIrisOpen();
    setSkipNextAuthModal();
    slideTransition.start({
      origin: 'left',
      fromGradient: PROFILE_GRADIENT,
      toGradient: LANDING_GRADIENT,
      onCovered: () => {
        router.push('/');
      },
    });
  }, [router, slideTransition]);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    const result = await signOutUser();
    if (result.error) {
      setErrorMessage(result.error);
      setIsSigningOut(false);
      return;
    }
    playSfx('/button_click.mp3', 0.55);
    setSkipNextIrisOpen();
    setSkipNextAuthModal();
    slideTransition.start({
      origin: 'left',
      fromGradient: PROFILE_GRADIENT,
      toGradient: LANDING_GRADIENT,
      onCovered: () => {
        router.push('/');
      },
      onDone: () => {
        setIsSigningOut(false);
      },
    });
  }, [isSigningOut, router, slideTransition]);

  return {
    isLoading,
    isSigningOut,
    errorMessage,
    currentAuth,
    currentProfile,
    achievements,
    handleBackToLanding,
    handleSignOut,
  } satisfies UseProfilePageResult;
}

export { useProfilePage };
export default useProfilePage;
