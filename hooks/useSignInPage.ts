'use client';

import type { FormEvent, MouseEvent } from 'react';
import { useCallback } from '@/hooks/useCallback';
import { useMemo } from '@/hooks/useMemo';
import { useRef } from '@/hooks/useRef';
import { useState } from '@/hooks/useState';
import { useRouter } from 'next/navigation';
import { registerUserAction } from '@/actions/auth/register';
import { signInUserAction } from '@/actions/auth/sign-in';
import { persistSupabaseSession } from '@/actions/auth/persist-session';
import { playSfx } from '@/lib/audio/sfx';
import { encodeStateParam } from '@/lib/utils';
import type { AuthMode } from '@/types/auth';
import type { UseSignInPageResult } from '@/types/sign-in';
import type { IrisHandle } from '@/app/components/ui/IrisTransition';

export function useSignInPage(): UseSignInPageResult {
  const router = useRouter();
  const irisRef = useRef<IrisHandle | null>(null);
  const navigationTriggeredRef = useRef(false);
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerModalMessage, setRegisterModalMessage] = useState('');
  const [showLoader, setShowLoader] = useState(false);

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
      const email = ((formData.get('email') as string | null) ?? '').trim();
      const password = (formData.get('password') as string | null) ?? '';
      const displayName = ((formData.get('display-name') as string | null) ?? '').trim();

      if (!email || !password) {
        setStatusMessage('Please provide both an email and password to continue.');
        return;
      }

      if (authMode === 'register') {
        if (!displayName) {
          setStatusMessage('Add a display name so we can personalize your profile.');
          return;
        }

        const confirmPassword = (formData.get('confirm-password') as string | null) ?? '';
        if (password !== confirmPassword) {
          setStatusMessage("Those passwords don't match yet. Double-check and try again.");
          return;
        }
      }

      setIsSubmitting(true);
      setStatusMessage(authMode === 'sign-in' ? 'Checking your credentials...' : 'Creating your AlgoHub account...');

      try {
        if (authMode === 'register') {
          const result = await registerUserAction({ email, password, displayName });
          setStatusMessage(result.message);
          if (result.success) {
            setRegisterModalMessage(result.message || 'Check your inbox to confirm your account.');
            setShowRegisterModal(true);
            formElement.reset();
          }
        } else {
          const result = await signInUserAction({ email, password });
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

            const profileName = result.profile?.displayName ?? result.email ?? maskEmail(email);
            setStatusMessage(result.message || `Welcome back, ${profileName}! Redirecting you to the hub...`);

            const profilePayload = result.profile ?? null;
            const authPayload = result.authUser ?? null;
            const params = new URLSearchParams();
            if (authPayload) {
              params.set('auth', encodeStateParam(authPayload));
            }
            if (profilePayload) {
              params.set('profile', encodeStateParam(profilePayload));
            }
            const targetHref = params.toString() ? `/?${params.toString()}` : '/';

            const navigateToHub = () => {
              if (navigationTriggeredRef.current) return;
              navigationTriggeredRef.current = true;
              setShowLoader(true);
              router.push(targetHref);
            };

            const controller = irisRef.current;
            if (controller) {
              controller.start({
                mode: 'close',
                durationMs: 650,
                onDone: navigateToHub,
              });
              window.setTimeout(navigateToHub, 1000);
            } else {
              navigateToHub();
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
    [authMode, isSubmitting, maskEmail, router],
  );

  return {
    authMode,
    heading,
    description,
    isSubmitting,
    statusMessage,
    showRegisterModal,
    registerModalMessage,
    showLoader,
    irisRef,
    handleSubmit,
    handleBackHome,
    handleButtonHover,
    handleAuthModeChange,
    handleRegisterModalDismiss,
    handleRegisterModalContentClick,
  } satisfies UseSignInPageResult;
}
