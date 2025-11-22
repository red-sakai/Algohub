'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import BackgroundDoodles from '../components/sections/BackgroundDoodles';
import Squares from '../components/ui/Squares';
import TargetCursor from '../components/ui/TargetCursor';
import { useProfilePage } from '@/hooks/useProfilePage';
import type { UserAchievement } from '@/types/achievements';

function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = {}): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, options);
  } catch (error) {
    console.error('Failed to format date', error);
    return '—';
  }
}

const achievementIconFallbacks: Record<string, string> = {
  speed_runner: '[speed]',
  garage_champion: '[garage]',
  puzzle_master: '[puzzle]',
};

function resolveAchievementIcon(entry: UserAchievement): string {
  return entry.achievement.icon ?? achievementIconFallbacks[entry.achievement.slug] ?? '[badge]';
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const {
    isLoading,
    isSigningOut,
    errorMessage,
    currentAuth,
    currentProfile,
    achievements,
    handleBackToLanding,
    handleSignOut,
  } = useProfilePage();

  if (isLoading) {
    return (
      <main className="relative min-h-[100dvh] overflow-hidden bg-transparent text-white">
        <TargetCursor spinDuration={2} hideDefaultCursor parallaxOn />
        <Squares
          speed={0.35}
          squareSize={32}
          direction="diagonal"
          borderColor="#ffffff12"
          hoverFillColor="#ffffff"
          className="pointer-events-none fixed inset-0 z-0"
        />
        <BackgroundDoodles />
        <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Loading your profile...</h1>
          <p className="mt-3 text-sm text-white/80">Hang tight while we restore your session and fetch your stats.</p>
        </section>
      </main>
    );
  }

  if (!currentAuth) {
    return (
      <main className="relative min-h-[100dvh] bg-transparent text-white">
        <TargetCursor spinDuration={2} hideDefaultCursor parallaxOn />
        <Squares
          speed={0.35}
          squareSize={32}
          direction="diagonal"
          borderColor="#ffffff12"
          hoverFillColor="#ffffff"
          className="pointer-events-none fixed inset-0 z-0"
        />
        <BackgroundDoodles />
        <section className="relative z-10 mx-auto flex min-h-[100dvh] max-w-2xl flex-col items-center justify-center px-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">Profile unavailable</h1>
          <p className="mt-3 max-w-md text-sm text-white/80">
            {errorMessage ?? "We couldn't verify your account details for this page. Sign in again from the landing screen to refresh your session."}
          </p>
          <Link
            href="/"
            prefetch={false}
            onClick={handleBackToLanding}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_0_0_rgb(2,132,199)] transition-all duration-200 hover:translate-y-[1px] hover:shadow-[0_8px_0_0_rgb(2,132,199)]"
          >
            Return to landing
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-transparent text-white">
      <TargetCursor spinDuration={2} hideDefaultCursor parallaxOn />
      <Squares
        speed={0.35}
        squareSize={32}
        direction="diagonal"
        borderColor="#ffffff12"
        hoverFillColor="#ffffff"
        className="pointer-events-none fixed inset-0 z-0"
      />
      <BackgroundDoodles />

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-10">
        <div className="mb-4 flex w-full flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="cursor-target inline-flex items-center justify-center rounded-full bg-rose-500/80 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_0_0_rgba(244,63,94,0.6)] transition-all duration-200 hover:bg-rose-500/90 hover:translate-y-[1px] hover:shadow-[0_8px_0_0_rgba(244,63,94,0.55)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSigningOut ? 'Signing out...' : 'Log out'}
          </button>
          <Link
            href="/"
            prefetch={false}
            onClick={handleBackToLanding}
            className="cursor-target inline-flex items-center justify-center rounded-full bg-white/18 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:bg-white/28"
          >
            Back to landing
          </Link>
        </div>

        <header className="flex flex-col gap-4 rounded-3xl bg-white/12 px-6 py-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.55)] ring-1 ring-white/25 backdrop-blur-2xl sm:px-8 sm:py-9 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {currentProfile?.avatarUrl ? (
              <Image
                src={currentProfile.avatarUrl}
                alt={currentProfile.displayName ?? 'Profile avatar'}
                width={80}
                height={80}
                className="h-20 w-20 rounded-full border-2 border-white/60 object-cover shadow-[0_12px_28px_rgba(15,23,42,0.45)]"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900/70 text-3xl font-extrabold uppercase text-white shadow-[0_12px_28px_rgba(15,23,42,0.45)]">
                {(currentProfile?.displayName ?? currentAuth.email ?? 'A').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">AlgoHub account</p>
              <h1 className="mt-1 text-3xl font-bold">
                {currentProfile?.displayName ?? currentAuth.email ?? 'AlgoHub member'}
              </h1>
              <p className="text-sm text-white/80">{currentAuth.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/75">
            <div className="rounded-2xl bg-white/8 px-4 py-2 ring-1 ring-white/20">
              <p className="uppercase tracking-[0.18em] text-white/60">Joined</p>
              <p className="mt-1 text-sm font-semibold text-white/90">{formatDate(currentAuth.createdAt, { dateStyle: 'medium' })}</p>
            </div>
            <div className="rounded-2xl bg-white/8 px-4 py-2 ring-1 ring-white/20">
              <p className="uppercase tracking-[0.18em] text-white/60">Last sign-in</p>
              <p className="mt-1 text-sm font-semibold text-white/90">{formatDate(currentAuth.lastSignInAt)}</p>
            </div>
            <div className="rounded-2xl bg-white/8 px-4 py-2 ring-1 ring-white/20">
              <p className="uppercase tracking-[0.18em] text-white/60">Role</p>
              <p className="mt-1 text-sm font-semibold text-white/90">{currentProfile?.role ?? 'student'}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl bg-white/12 px-6 py-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.55)] ring-1 ring-white/25 backdrop-blur-2xl sm:px-8 sm:py-8">
            <h2 className="text-xl font-semibold tracking-tight">Account activity</h2>
            <dl className="mt-5 space-y-4 text-sm text-white/80">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <dt className="font-semibold text-white/70">Account ID</dt>
                <dd className="font-mono text-xs sm:text-sm">{currentAuth.id}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <dt className="font-semibold text-white/70">Primary email</dt>
                <dd className="font-medium text-white/90">{currentAuth.email ?? '—'}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <dt className="font-semibold text-white/70">Profile created</dt>
                <dd className="font-medium text-white/90">{formatDate(currentProfile?.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <dt className="font-semibold text-white/70">Profile updated</dt>
                <dd className="font-medium text-white/90">{formatDate(currentProfile?.updatedAt, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
              </div>
            </dl>
          </div>

          <aside className="rounded-3xl bg-white/12 px-6 py-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.55)] ring-1 ring-white/25 backdrop-blur-2xl sm:px-7">
            <h3 className="text-lg font-semibold tracking-tight">Achievement progress</h3>
            <p className="mt-2 text-xs text-white/70">
              {achievements.length > 0
                ? `Unlocked ${achievements.length} achievement${achievements.length === 1 ? '' : 's'}.`
                : "No trophies yet. Play games and complete challenges to earn your first badge!"}
            </p>
            <div className="mt-4 h-[2px] w-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-300"
                style={{
                  width: `${Math.min(achievements.length * 20, 100)}%`,
                  transition: 'width 400ms ease',
                }}
              />
            </div>
            <ul className="mt-5 space-y-3 text-sm text-white/85">
              {achievements.slice(0, 3).map((entry) => (
                <li key={entry.achievementId} className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                  <span className="text-xl">{resolveAchievementIcon(entry)}</span>
                  <div>
                    <p className="font-semibold text-white">{entry.achievement.title}</p>
                    <p className="text-xs text-white/70">Earned {formatDate(entry.unlockedAt, { dateStyle: 'medium' })}</p>
                  </div>
                </li>
              ))}
              {achievements.length === 0 && (
                <li className="rounded-2xl bg-white/10 px-3 py-3 text-xs text-white/70 ring-1 ring-white/15">
                  Explore AlgoHub&apos;s lessons and mini-games to start unlocking achievements.
                </li>
              )}
            </ul>
          </aside>
        </section>

        <section className="rounded-3xl bg-white/12 px-6 py-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.55)] ring-1 ring-white/25 backdrop-blur-2xl sm:px-8 sm:py-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Achievements</h2>
              <p className="text-xs text-white/70">Collect badges by completing milestones across the platform.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/80 ring-1 ring-white/25">
              Total unlocked
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-white">{achievements.length}</span>
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.length === 0 && (
              <div className="col-span-full rounded-3xl border border-dashed border-white/30 bg-white/5 px-6 py-10 text-center text-sm text-white/70">
                No achievements earned yet. Dive into AlgoHub&apos;s challenges to unlock your first trophy!
              </div>
            )}
            {achievements.map((entry) => (
              <article
                key={entry.achievementId}
                className="relative overflow-hidden rounded-3xl bg-white/10 px-5 py-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.45)] ring-1 ring-white/20 backdrop-blur-2xl"
              >
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/8 via-white/4 to-transparent" />
                <div className="flex items-start gap-3">
                  <span className="text-3xl drop-shadow-[0_10px_15px_rgba(15,23,42,0.55)]">{resolveAchievementIcon(entry)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{entry.achievement.title}</h3>
                    <p className="mt-1 text-xs text-white/75">{entry.achievement.description}</p>
                  </div>
                </div>
                <footer className="mt-5 flex items-center justify-between text-[0.65rem] uppercase tracking-[0.22em] text-white/60">
                  <span>Unlocked {formatDate(entry.unlockedAt, { dateStyle: 'medium' })}</span>
                  <span className="rounded-full bg-white/15 px-2 py-1 text-white">{entry.achievement.slug}</span>
                </footer>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
