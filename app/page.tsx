'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import BackgroundDoodles from './components/sections/BackgroundDoodles';
import Squares from './components/ui/Squares';
import TargetCursor from './components/ui/TargetCursor';
import IrisOpenOnMount from './components/ui/IrisOpenOnMount';
import IrisTransition from './components/ui/IrisTransition';
import LoadingOverlay from './components/ui/LoadingOverlay';
import { useHomePage } from '@/hooks/useHomePage';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const {
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
  } = useHomePage();
  return (
    <>
      {authUser && (
        <div className="fixed left-4 top-4 z-[130] flex flex-col items-start gap-3">
          <button
            ref={profileButtonRef}
            type="button"
            onClick={handleProfileToggle}
            className="group inline-flex items-center gap-3 rounded-full bg-white/15 px-3.5 py-2 text-left text-sm text-white shadow-[0_12px_28px_rgba(15,23,42,0.28)] ring-1 ring-white/25 backdrop-blur-xl transition-transform duration-200 hover:scale-[1.02] cursor-target"
            aria-expanded={isProfilePanelOpen}
            aria-haspopup="dialog"
          >
            {userProfile?.avatarUrl ? (
              <Image
                src={userProfile.avatarUrl}
                alt={userProfile.displayName ?? "Profile avatar"}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full border border-white/30 object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600/80 text-sm font-bold uppercase text-white">
                {userInitial}
              </span>
            )}
            <span className="flex flex-col leading-tight">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Signed in</span>
              <span className="text-sm font-semibold text-white/95">
                {userProfile?.displayName ?? authUser.email ?? "AlgoHub Member"}
              </span>
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 text-white/70 transition-transform duration-200 ${
                isProfilePanelOpen ? "rotate-180" : "rotate-0"
              }`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.08 1.04l-4.25 4.25a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {isProfilePanelOpen && (
            <div
              ref={profilePanelRef}
              className="w-[280px] rounded-3xl bg-white/12 p-4 text-sm text-white shadow-[0_18px_45px_rgba(15,23,42,0.55)] ring-1 ring-white/20 backdrop-blur-2xl"
              role="dialog"
              aria-label="Profile overview"
            >
              <div className="flex items-center gap-3">
                {userProfile?.avatarUrl ? (
                  <Image
                    src={userProfile.avatarUrl}
                    alt={userProfile.displayName ?? "Profile avatar"}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full border border-white/40 object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-600/85 text-lg font-bold uppercase text-white">
                    {userInitial}
                  </span>
                )}
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">
                    {userProfile?.displayName ?? authUser.email ?? "AlgoHub Member"}
                  </span>
                  <span className="text-xs uppercase tracking-[0.22em] text-white/60">
                    {userProfile?.role ?? "student"}
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-xs text-white/80">
                <div className="flex justify-between gap-3">
                  <span className="text-white/55">Email</span>
                  <span className="font-medium text-white/90">{authUser.email ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/55">Joined</span>
                  <span className="font-medium text-white/90">
                    {authUser.createdAt ? new Date(authUser.createdAt).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/55">Last sign-in</span>
                  <span className="font-medium text-white/90">
                    {authUser.lastSignInAt ? new Date(authUser.lastSignInAt).toLocaleString() : "—"}
                  </span>
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <div className="flex flex-wrap justify-end gap-2">
                  <Link
                    href={profileHref}
                    prefetch={false}
                    onClick={handleProfileView}
                    className="cursor-target inline-flex items-center justify-center rounded-full bg-white/18 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:bg-white/28"
                  >
                    View profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleProfileToggle}
                    className="cursor-target inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:bg-white/20"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {showAuthModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 backdrop-blur-[6px] px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-gate-title"
            className="w-full max-w-md rounded-3xl bg-white/12 px-7 py-8 text-white shadow-[0_18px_45px_rgba(0,0,0,0.55)] ring-1 ring-white/25 backdrop-blur-2xl sm:px-9 sm:py-9"
          >
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                <Image src="/algohub-transparent.png" alt="AlgoHub" width={72} height={72} priority className="h-14 w-14" />
              </div>
              <h2 id="auth-gate-title" className="text-2xl font-extrabold tracking-tight">Welcome to AlgoHub</h2>
              <p className="mt-2 text-sm text-white/85">
                Sign in to sync your progress across devices, or jump straight in as a guest and explore the hub.
              </p>
              <div className="flex w-full flex-col gap-4">
                <button
                  type="button"
                  onClick={handleSignInSelect}
                  onMouseEnter={handleButtonHover}
                  className="cursor-target inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold tracking-wide shadow-[0_10px_0_0_rgb(2,132,199)] transition-all duration-200 hover:translate-y-[1px] hover:shadow-[0_8px_0_0_rgb(2,132,199)] hover:scale-[1.01] active:translate-y-[3px] active:shadow-[0_5px_0_0_rgb(2,132,199)]"
                >
                  Sign In
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v13.19l4.72-4.72a.75.75 0 1 1 1.06 1.06l-6 6a.75.75 0 0 1-1.06 0l-6-6a.75.75 0 1 1 1.06-1.06l4.72 4.72V4.5A.75.75 0 0 1 12 3.75Z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  onMouseEnter={handleButtonHover}
                  className="cursor-target inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/18 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                >
                  Continue as Guest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <main
        className={`relative min-h-[100dvh] overflow-hidden bg-transparent text-white ${
          isShaking ? "site-shake" : ""
        }`}
      >
      {isFlashing && (
        <div
          className="pointer-events-none fixed inset-0 z-40"
          style={{
            opacity: flashOpacity,
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 32%, rgba(255,255,255,0.85) 48%, rgba(255,255,255,0.55) 70%, rgba(255,255,255,0.1) 100%)",
            backdropFilter: "brightness(1.35)",
            transition: flashOpacity === 1 ? "none" : "opacity 800ms ease-out",
            willChange: "opacity"
          }}
        />
      )}
      <TargetCursor spinDuration={2} hideDefaultCursor parallaxOn />
      {/* animated squares background */}
      <Squares
        speed={0.5}
        squareSize={40}
        direction="diagonal"
        borderColor="#ffffff22"
        hoverFillColor="#ffffff"
        className="pointer-events-none fixed inset-0 z-0"
      />
      {/* decorative background doodles */}
      <BackgroundDoodles />

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col items-center justify-center px-4 sm:px-6 text-center">
        {/* logo - default mark with falling bullet overlay */}
        <div className="mb-6 motion-safe:animate-[popIn_500ms_ease-out_forwards] motion-safe:opacity-0 transition-transform duration-300 will-change-transform">
          <button
            type="button"
            onClick={handleLogoClick}
            onMouseEnter={handleButtonHover}
            className="group relative inline-flex items-center justify-center rounded-[2.75rem] bg-transparent transition-transform duration-300 hover:scale-[1.06] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 cursor-target"
            aria-label="Trigger AlgoHub logo transformation"
          >
            <Image
              ref={defaultLogoRef}
              src="/algohub-transparent.png"
              alt="AlgoHub logo"
              width={360}
              height={360}
              priority
              className="h-auto w-[200px] sm:w-[300px] md:w-[360px] drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
              style={{
                animation: defaultLogoAnimationValue,
                opacity: defaultLogoOpacity,
                transition: defaultLogoOpacityTransition,
                willChange: "transform, opacity"
              }}
              draggable={false}
            />
            {isLogoShining && (
              <Image
                key={logoShineCycle}
                ref={logoShineRef}
                src="/sparkle_gif.gif"
                alt=""
                aria-hidden
                width={360}
                height={360}
                unoptimized
                className="pointer-events-none absolute left-1/2 top-1/2 w-[200px] -translate-x-1/2 -translate-y-1/2 opacity-0 sm:w-[300px] md:w-[360px]"
                style={{
                  filter: "brightness(1.28) saturate(0) drop-shadow(0 0 0.75rem rgba(255,255,255,0.82))",
                  willChange: "opacity",
                  mixBlendMode: "screen",
                }}
              />
            )}
            {isBulletVisible && (
              <div key={bulletCycle} className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Image
                  src="/algohub-bullet.png"
                  alt="AlgoHub bullet logo"
                  width={360}
                  height={360}
                  className="h-auto w-[200px] sm:w-[300px] md:w-[360px] drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
                  style={{
                    animation: bulletAnimationValue,
                    willChange: "transform",
                    transformOrigin: "center"
                  }}
                  draggable={false}
                />
              </div>
            )}
          </button>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-yellow-100 ring-1 ring-white/20 motion-safe:animate-[fadeUp_550ms_ease-out_forwards] motion-safe:[animation-delay:120ms] motion-safe:opacity-0 sm:text-sm">
          Play & Learn
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-300" />
          Gamified DSA
        </span>

        <h1 className="mt-3 text-balance text-3xl font-extrabold leading-snug drop-shadow-sm motion-safe:animate-[fadeUp_600ms_ease-out_forwards] motion-safe:[animation-delay:180ms] motion-safe:opacity-0 sm:text-5xl md:text-6xl [text-shadow:_0_1px_0_rgba(0,0,0,0.12)]">
          ALGO HUB
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-base text-white/90 motion-safe:animate-[fadeUp_650ms_ease-out_forwards] motion-safe:[animation-delay:240ms] motion-safe:opacity-0 sm:text-lg md:text-xl">
          Master algorithms through interactive lessons, mini-games, and bite-sized challenges—all in one hub.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:gap-4 motion-safe:animate-[fadeUp_700ms_ease-out_forwards] motion-safe:[animation-delay:300ms] motion-safe:opacity-0">
          <Link
            href="/learn"
            onClick={handleStartClick}
            onMouseEnter={handleButtonHover}
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-base font-extrabold tracking-wide shadow-[0_10px_0_0_rgb(2,132,199)] transition-all duration-200 hover:translate-y-[1px] hover:shadow-[0_8px_0_0_rgb(2,132,199)] hover:scale-[1.02] active:translate-y-[3px] active:shadow-[0_5px_0_0_rgb(2,132,199)] sm:px-8 sm:py-4 sm:text-xl motion-safe:animate-[fadeUp_700ms_ease-out_forwards] cursor-target"
          >
            START LEARNING
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5">
              <path fillRule="evenodd" d="M3 12a.75.75 0 0 1 .75-.75h13.19l-4.72-4.72a.75.75 0 1 1 1.06-1.06l6 6a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 1 1-1.06-1.06l4.72-4.72H3.75A.75.75 0 0 1 3 12Z" clipRule="evenodd" />
            </svg>
          </Link>
          <Link
            href="#roadmap"
            onMouseEnter={handleButtonHover}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-6 py-3 text-base font-bold text-white ring-1 ring-white/25 transition-all duration-200 hover:bg-white/25 hover:scale-[1.015] sm:px-8 sm:py-4 sm:text-xl cursor-target"
          >
            VIEW ROADMAP
          </Link>
        </div>
      </section>
      {/* Iris transition overlay */}
      <IrisTransition ref={irisRef} />
      {/* Iris open on arrival (plays from saved point when available, otherwise center) */}
      {!skipIrisOpen && <IrisOpenOnMount />}
      {/* 3D loading overlay */}
      <LoadingOverlay active={showLoader} />
    </main>
    </>
  );
}

// BackgroundDoodles is now imported from components
