"use client";

import type { MouseEvent } from 'react';
import { useCallback } from '@/hooks/useCallback';
import { useEffect } from '@/hooks/useEffect';
import { useMemo } from '@/hooks/useMemo';
import { useRef } from '@/hooks/useRef';
import { useState } from '@/hooks/useState';
import { useRouter, useSearchParams } from 'next/navigation';
import { LANDING_GRADIENT, PROFILE_GRADIENT, useSlideTransition } from '@/app/components/ui/SlideTransition';
import { playSfx } from '@/lib/audio/sfx';
import { setSkipNextAuthModal, setSkipNextIrisOpen } from '@/lib/transition/transitionBus';
import { fetchProfileData } from '@/actions/profile/fetch-profile-data';
import { signOutUser } from '@/actions/auth/sign-out';
import { decodeStateParam } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { AuthUserSummary, UserProfile } from '@/types/auth';
import type { UserAchievement } from '@/types/achievements';
import type { ProfileRow, UseProfilePageResult } from '@/types/profile';

const PROFILE_ROLES: ReadonlyArray<UserProfile['role']> = ['student', 'instructor', 'admin'];
const AVATAR_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET ?? 'avatars';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function mapProfileRow(row: ProfileRow): UserProfile {
  const normalizedRole = PROFILE_ROLES.includes((row.role ?? '') as UserProfile['role'])
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

function validateAvatarFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Please select an image file (PNG, JPG, or WebP).';
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return 'Image must be 5MB or smaller.';
  }
  return null;
}

function deriveAvatarPath(userId: string, file: File): string {
  const extFromName = file.name.includes('.') ? file.name.split('.').pop() ?? '' : '';
  const extFromType = file.type.includes('/') ? file.type.split('/').pop() ?? '' : '';
  const extension = (extFromName || extFromType || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${userId}/avatar-${timestamp}-${random}.${extension}`;
}

function extractAvatarStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/i);
    return match ? decodeURIComponent(match[1]) : null;
  } catch (error) {
    console.warn('[useProfilePage] Failed to parse avatar storage path', error);
    return null;
  }
}

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
  const [activeAchievement, setActiveAchievement] = useState<UserAchievement | null>(null);
  const [isAchievementModalOpen, setAchievementModalOpen] = useState(false);
  const [isAvatarUpdating, setIsAvatarUpdating] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const modalCloseTimerRef = useRef<number | null>(null);
  const ACHIEVEMENT_MODAL_EXIT_MS = 240;

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

  useEffect(() => {
    if (currentProfile?.role === 'admin') {
      router.replace('/admin');
    }
  }, [currentProfile?.role, router]);

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

  const handleAchievementSelect = useCallback((achievement: UserAchievement) => {
    if (modalCloseTimerRef.current) {
      window.clearTimeout(modalCloseTimerRef.current);
      modalCloseTimerRef.current = null;
    }
    setActiveAchievement(achievement);
    setAchievementModalOpen(true);
  }, []);

  const handleAchievementModalClose = useCallback(() => {
    if (modalCloseTimerRef.current) {
      window.clearTimeout(modalCloseTimerRef.current);
      modalCloseTimerRef.current = null;
    }
    setAchievementModalOpen(false);
    modalCloseTimerRef.current = window.setTimeout(() => {
      setActiveAchievement(null);
      modalCloseTimerRef.current = null;
    }, ACHIEVEMENT_MODAL_EXIT_MS);
  }, []);

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

  useEffect(() => () => {
    if (modalCloseTimerRef.current) {
      window.clearTimeout(modalCloseTimerRef.current);
      modalCloseTimerRef.current = null;
    }
  }, []);

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!file) {
      setAvatarError('Please choose an image to upload.');
      return;
    }
    if (!currentAuth?.id) {
      setAvatarError('You need to be signed in to change your avatar.');
      return;
    }

    const validationMessage = validateAvatarFile(file);
    if (validationMessage) {
      setAvatarError(validationMessage);
      return;
    }

    const supabase = getSupabaseClient();
    const path = deriveAvatarPath(currentAuth.id, file);
    setIsAvatarUpdating(true);
    setAvatarError(null);

    try {
      const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || 'image/png',
        upsert: true,
      });

      if (uploadError) {
        console.error('[useProfilePage] Avatar upload failed', uploadError);
        throw new Error('We could not upload that image. Try a different file.');
      }

      const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) {
        throw new Error('Uploaded image is missing a public URL. Please try again.');
      }

      const { data: updatedRow, error: profileError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', currentAuth.id)
        .select('id, display_name, avatar_url, role, created_at, updated_at')
        .maybeSingle();

      if (profileError || !updatedRow) {
        console.error('[useProfilePage] Failed to persist avatar reference', profileError);
        throw new Error('Avatar uploaded, but we could not update your profile. Please try again.');
      }

      setProfile(mapProfileRow(updatedRow as ProfileRow));
    } catch (error) {
      console.error('[useProfilePage] Unable to update avatar', error);
      setAvatarError(error instanceof Error ? error.message : 'Failed to update avatar. Please try again.');
    } finally {
      setIsAvatarUpdating(false);
    }
  }, [currentAuth?.id]);

  const handleAvatarRemove = useCallback(async () => {
    if (!currentAuth?.id) {
      setAvatarError('You need to be signed in to remove your avatar.');
      return;
    }
    if (!currentProfile?.avatarUrl) {
      setAvatarError('No avatar to remove.');
      return;
    }

    const supabase = getSupabaseClient();
    const previousPath = extractAvatarStoragePath(currentProfile.avatarUrl);
    setIsAvatarUpdating(true);
    setAvatarError(null);

    try {
      const { data: updatedRow, error: profileError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', currentAuth.id)
        .select('id, display_name, avatar_url, role, created_at, updated_at')
        .maybeSingle();

      if (profileError || !updatedRow) {
        console.error('[useProfilePage] Failed to clear avatar reference', profileError);
        throw new Error('We could not remove your avatar right now. Please try again.');
      }

      setProfile(mapProfileRow(updatedRow as ProfileRow));

      if (previousPath) {
        const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
        if (removeError) {
          console.warn('[useProfilePage] Avatar file cleanup failed', removeError);
        }
      }
    } catch (error) {
      console.error('[useProfilePage] Unable to remove avatar', error);
      setAvatarError(error instanceof Error ? error.message : 'Failed to remove avatar. Please try again.');
    } finally {
      setIsAvatarUpdating(false);
    }
  }, [currentAuth?.id, currentProfile?.avatarUrl]);

  return {
    isLoading,
    isSigningOut,
    errorMessage,
    currentAuth,
    currentProfile,
    achievements,
    activeAchievement,
    isAchievementModalOpen,
    isAvatarUpdating,
    avatarUploadError: avatarError,
    handleBackToLanding,
    handleSignOut,
    handleAchievementSelect,
    handleAchievementModalClose,
    handleAvatarUpload,
    handleAvatarRemove,
  } satisfies UseProfilePageResult;
}

export { useProfilePage };
export default useProfilePage;
