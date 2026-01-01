'use client';

import type { FormEvent, MouseEvent } from 'react';
import { useCallback } from '@/hooks/useCallback';
import { useEffect } from '@/hooks/useEffect';
import { useMemo } from '@/hooks/useMemo';
import { useRef } from '@/hooks/useRef';
import { useState } from '@/hooks/useState';
import { useRouter } from 'next/navigation';
import { registerUserAction } from '@/actions/auth/register';
import { signInUserAction } from '@/actions/auth/sign-in';
import { persistSupabaseSession } from '@/actions/auth/persist-session';
import { playSfx } from '@/lib/audio/sfx';
import { encodeStateParam } from '@/lib/utils';
import { showGlobalLoader, GLOBAL_LOADER_MIN_MS } from '@/lib/transition/globalLoaderBus';
import { safeParseRegisterInput, safeParseSignInInput } from '@/lib/validation/auth';
import type { AuthMode } from '@/types/auth';
import type { UseSignInPageResult } from '@/types/sign-in';
import type { IrisHandle } from '@/app/components/ui/IrisTransition';

export function useSignInPage(): UseSignInPageResult {
  const router = useRouter();
  const irisRef = useRef<IrisHandle | null>(null);
  const navigationTriggeredRef = useRef(false);
  const loaderDelayRef = useRef<number | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerModalMessage, setRegisterModalMessage] = useState('');

  const heading = useMemo(
    () => (authMode === 'sign-in' ? 'Sign in to AlgoHub' : 'Create your AlgoHub account'),
    [authMode],
  );

  const description = useMemo(
    () =>
      authMode === 'sign-in'
        ? 'Access your saved lessons, track progress, and pick up right where you left off.'
        : 'Start fresh with a new AlgoHub account to save progress, earn badges, and unlock exclusive lessons.',
    [authMode],
  );

  const maskEmail = useCallback((email: string) => email.replace(/(.{2}).+(@.+)/, '$1•••$2'), []);

  useEffect(() => () => {
    if (loaderDelayRef.current !== null) {
      clearTimeout(loaderDelayRef.current);
      loaderDelayRef.current = null;
    }
  }, []);

  const scheduleGlobalNavigation = useCallback(
    (targetHref: string, options?: { loaderAlreadyVisible?: boolean }) => {
      if (typeof window === 'undefined') {
        router.push(targetHref);
        return;
      }
      if (!options?.loaderAlreadyVisible) {
        showGlobalLoader();
      }
      if (loaderDelayRef.current !== null) {
        clearTimeout(loaderDelayRef.current);
      }
      loaderDelayRef.current = window.setTimeout(() => {
        router.push(targetHref);
        loaderDelayRef.current = null;
      }, GLOBAL_LOADER_MIN_MS);
    },
    [router],
  );

  const handleButtonHover = useCallback(() => {
    playSfx('/gun_sfx.mp3', 0.6);
  }, []);

  const handleAuthModeChange = useCallback(
    (mode: AuthMode) => {
      if (authMode === mode) return;
      setStatusMessage(null);
      setShowRegisterModal(false);
      setAuthMode(mode);
      playSfx('/button_click.mp3', 0.55);
    },
    [authMode],
  );

  const handleRegisterModalDismiss = useCallback(() => {
    playSfx('/button_click.mp3', 0.55);
    setShowRegisterModal(false);
  }, []);

  const handleRegisterModalContentClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  const handleBackHome = useCallback(() => {
    playSfx('/button_click.mp3', 0.6);
    router.push('/');
  }, [router]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;

      setShowRegisterModal(false);

      const formElement = event.currentTarget;
      const formData = new FormData(formElement);
      const email = (formData.get('email') as string | null) ?? '';
      const password = (formData.get('password') as string | null) ?? '';
      const displayName = (formData.get('display-name') as string | null) ?? '';

      let cleanedEmail = '';
      let cleanedPassword = '';
      let cleanedDisplayName = '';

      if (authMode === 'register') {
        const parsed = safeParseRegisterInput({ email, password, displayName });
        if (!parsed.success) {
          setStatusMessage(parsed.message);
          return;
        }
        cleanedEmail = parsed.data.email;
        cleanedPassword = parsed.data.password;
        cleanedDisplayName = parsed.data.displayName;

        const confirmPassword = (formData.get('confirm-password') as string | null) ?? '';
        if (cleanedPassword !== confirmPassword) {
          setStatusMessage("Those passwords don't match yet. Double-check and try again.");
          return;
        }
      } else {
        const parsed = safeParseSignInInput({ email, password });
        if (!parsed.success) {
          setStatusMessage(parsed.message);
          return;
        }
        cleanedEmail = parsed.data.email;
        cleanedPassword = parsed.data.password;
      }

      setIsSubmitting(true);
      setStatusMessage(authMode === 'sign-in' ? 'Checking your credentials...' : 'Creating your AlgoHub account...');

      try {
        if (authMode === 'register') {
          const result = await registerUserAction({
            email: cleanedEmail,
            password: cleanedPassword,
            displayName: cleanedDisplayName,
          });
          setStatusMessage(result.message);
          if (result.success) {
            setRegisterModalMessage(result.message || 'Check your inbox to confirm your account.');
            setShowRegisterModal(true);
            formElement.reset();
          }
        } else {
          const result = await signInUserAction({
            email: cleanedEmail,
            password: cleanedPassword,
          });
          setStatusMessage(result.message);
          if (result.success) {
            if (result.session?.access_token && result.session.refresh_token) {
              const sessionResult = await persistSupabaseSession({
                accessToken: result.session.access_token,
                refreshToken: result.session.refresh_token,
              });
              if (sessionResult.error) {
                console.error('Failed to persist Supabase session', sessionResult.error);
              }
            } else {
              console.warn('Missing Supabase session tokens in sign-in result');
            }

            const profileName = result.profile?.displayName ?? result.email ?? maskEmail(cleanedEmail);

            const profilePayload = result.profile ?? null;
            const authPayload = result.authUser ?? null;
            const params = new URLSearchParams();
            if (authPayload) {
              params.set('auth', encodeStateParam(authPayload));
            }
            if (profilePayload) {
              params.set('profile', encodeStateParam(profilePayload));
            }
            const destinationPath = result.profile?.role === 'admin' ? '/admin' : '/';
            const targetHref = params.toString() ? `${destinationPath}?${params.toString()}` : destinationPath;

            const redirectMessage = result.profile?.role === 'admin'
              ? `Welcome back, ${profileName}! Redirecting you to the admin dashboard...`
              : `Welcome back, ${profileName}! Redirecting you to the hub...`;

            setStatusMessage(result.message || redirectMessage);

            const navigateToHub = (loaderVisible: boolean) => {
              if (navigationTriggeredRef.current) return;
              navigationTriggeredRef.current = true;
              scheduleGlobalNavigation(targetHref, loaderVisible ? { loaderAlreadyVisible: true } : undefined);
            };

            const controller = irisRef.current;
            if (controller) {
              controller.start({
                mode: 'close',
                durationMs: 650,
                showLoaderOnClose: true,
                onDone: () => navigateToHub(true),
              });
              window.setTimeout(() => navigateToHub(false), 1000);
            } else {
              navigateToHub(false);
            }
          }
        }
      } catch (error) {
        console.error('Failed to submit auth form', error);
        setStatusMessage('We hit a snag talking to the server. Please try again in a moment.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [authMode, isSubmitting, maskEmail, scheduleGlobalNavigation],
  );

  return {
    authMode,
    heading,
    description,
    isSubmitting,
    statusMessage,
    showRegisterModal,
    registerModalMessage,
    irisRef,
    handleSubmit,
    handleBackHome,
    handleButtonHover,
    handleAuthModeChange,
    handleRegisterModalDismiss,
    handleRegisterModalContentClick,
  } satisfies UseSignInPageResult;
}
