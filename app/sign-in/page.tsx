'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSignInPage } from '@/hooks/useSignInPage';
import type { AuthMode } from '@/types/auth';
import Squares from '../components/ui/Squares';
import BackgroundDoodles from '../components/sections/BackgroundDoodles';
import TargetCursor from '../components/ui/TargetCursor';
import IrisOpenOnMount from '../components/ui/IrisOpenOnMount';
import IrisTransition from '../components/ui/IrisTransition';
import LoadingOverlay from '../components/ui/LoadingOverlay';

export default function SignInPage() {
  const {
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
  } = useSignInPage();

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-sky-500 to-green-300 text-white">
      <TargetCursor spinDuration={2} hideDefaultCursor parallaxOn />
      <Squares
        speed={0.5}
        squareSize={40}
        direction="diagonal"
        borderColor="#ffffff22"
        hoverFillColor="#ffffff"
        className="pointer-events-none fixed inset-0 z-0"
      />
      <BackgroundDoodles />

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-md rounded-3xl bg-white/12 px-8 py-9 text-center shadow-[0_18px_45px_rgba(0,0,0,0.45)] ring-1 ring-white/25 backdrop-blur-2xl sm:px-9 sm:py-10">
          <div className="flex flex-col items-center gap-5">
            <div className="relative inline-flex items-center overflow-hidden rounded-full bg-white/12 p-1.5 ring-1 ring-white/15">
              <div className="relative z-10 isolate flex items-center gap-0 rounded-full bg-black/40 p-1 backdrop-blur-sm">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 -z-10 rounded-full bg-sky-500/90 shadow-[0_10px_30px_rgba(56,189,248,0.45)] ring-1 ring-white/80 transition-all duration-300 ease-out"
                  style={{
                    width: 'calc(50% - 0.25rem)',
                    transform:
                      authMode === 'sign-in'
                        ? 'translateX(0.25rem)'
                        : 'translateX(calc(100% + 0.25rem))',
                    opacity: 0.97,
                  }}
                />
                {['sign-in', 'register'].map((mode) => {
                  const typed = mode as AuthMode;
                  const isActive = authMode === typed;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleAuthModeChange(typed)}
                      className={`relative px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-200 ${
                        isActive ? 'text-sky-100' : 'text-white/60 hover:text-white/85'
                      }`}
                    >
                      {mode === 'sign-in' ? 'Sign In' : 'Register'}
                    </button>
                  );
                })}
              </div>
            </div>
            <Image src="/algohub-transparent.png" alt="AlgoHub" width={160} height={160} priority className="h-28 w-28 drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]" />
            <h1 className="text-3xl font-extrabold tracking-tight">{heading}</h1>
            <p className="max-w-sm text-sm text-white/85">{description}</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            {authMode === 'register' && (
              <div>
                <label htmlFor="display-name" className="text-xs font-semibold uppercase tracking-wide text-white/75">
                  Display Name
                </label>
                <input
                  id="display-name"
                  name="display-name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="AlgoAce"
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/60 shadow-[0_6px_18px_rgba(15,23,42,0.22)] backdrop-blur-md focus:border-white focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-white/75">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/60 shadow-[0_6px_18px_rgba(15,23,42,0.22)] backdrop-blur-md focus:border-white focus:outline-none focus:ring-2 focus:ring-white/80"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-white/75">
                {authMode === 'sign-in' ? 'Password' : 'Create Password'}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/60 shadow-[0_6px_18px_rgba(15,23,42,0.22)] backdrop-blur-md focus:border-white focus:outline-none focus:ring-2 focus:ring-white/80"
              />
            </div>
            {authMode === 'register' && (
              <div>
                <label htmlFor="confirm-password" className="text-xs font-semibold uppercase tracking-wide text-white/75">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/60 shadow-[0_6px_18px_rgba(15,23,42,0.22)] backdrop-blur-md focus:border-white focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>
            )}
            <button
              type="submit"
              onMouseEnter={handleButtonHover}
              className="cursor-target inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold tracking-wide shadow-[0_10px_0_0_rgb(2,132,199)] transition-all duration-200 hover:translate-y-[1px] hover:shadow-[0_8px_0_0_rgb(2,132,199)] hover:scale-[1.01] active:translate-y-[3px] active:shadow-[0_5px_0_0_rgb(2,132,199)] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? authMode === 'sign-in'
                  ? 'Signing In...'
                  : 'Registering...'
                : authMode === 'sign-in'
                ? 'Sign In'
                : 'Register'}
            </button>
          </form>

          <div className="mt-4 space-y-3 text-center text-sm text-white/80">
            {statusMessage && <p className="text-xs text-white/70">{statusMessage}</p>}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
              <button
                type="button"
                onClick={handleBackHome}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-all duration-200 hover:bg-white/18"
              >
                Back to Landing
              </button>
              <Link href="/learn" className="text-xs font-semibold uppercase tracking-wide text-white/70 underline-offset-4 hover:underline">
                Explore the roadmap instead
              </Link>
            </div>
          </div>
        </div>
      </section>
      {showRegisterModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
          onClick={handleRegisterModalDismiss}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white/15 p-6 text-center shadow-[0_25px_60px_rgba(15,23,42,0.6)] ring-1 ring-white/30 backdrop-blur-2xl sm:p-8"
            onClick={handleRegisterModalContentClick}
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-500/45 via-sky-400/25 to-emerald-400/30" />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 shadow-[0_12px_30px_rgba(56,189,248,0.35)] ring-1 ring-white/40">
              <span className="text-3xl font-black text-white">✉️</span>
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">Almost there!</h2>
            <p className="mt-2 text-sm text-white/85">{registerModalMessage}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/60">Check your inbox to finish signing up</p>
            <div className="mt-6 flex items-center justify-center">
              <button
                type="button"
                onClick={handleRegisterModalDismiss}
                className="inline-flex items-center justify-center rounded-full bg-white/18 px-6 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:bg-white/28"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      <LoadingOverlay active={showLoader} />
      <IrisTransition ref={irisRef} />
      <IrisOpenOnMount />
    </main>
  );
}
