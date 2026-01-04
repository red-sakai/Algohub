'use client';

import { Suspense, useEffect, useRef } from 'react';
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createPortal } from 'react-dom';
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

function formatAchievementSlug(slug: string): string {
  return slug.toUpperCase();
}

const achievementIconFallbacks: Record<string, string> = {
  default: '[badge]',
  speed_runner: '[speed]',
  garage_champion: '[garage]',
  puzzle_master: '[puzzle]',
  'six-sev': '[67]',
  'welcome-to-algohub': '[welcome]',
  'stacking-em-queues': '[stack]',
  'gday-sir': '[gday]',
};

const achievementIconDefaultImages: Record<string, string> = {
  'coffee-break': '/achievements/critical-migration/coffee-break.png',
  'maintenance-window-master': '/achievements/critical-migration/maintenance-window-master.png',
  'plenty-of-headroom': '/achievements/critical-migration/plenty-of-headroom.png',
};

function AchievementIcon({
  entry,
  size = 'large',
}: {
  entry: UserAchievement;
  size?: 'small' | 'large';
}) {
  const icon = entry.achievement.icon ?? achievementIconDefaultImages[entry.achievement.slug] ?? null;
  const fallback = achievementIconFallbacks[entry.achievement.slug] ?? achievementIconFallbacks.default;
  const isRemote = typeof icon === 'string' && /^https?:\/\//i.test(icon);
  const dimension = size === 'small' ? 72 : 128;
  const containerClass = size === 'small'
    ? 'h-16 w-16 rounded-2xl bg-white/12 ring-1 ring-white/20'
    : 'h-28 w-28 rounded-[2.25rem] bg-white/10 ring-1 ring-white/20';
  const imageWrapperClass = `${containerClass} overflow-hidden bg-slate-950/20 p-2 flex items-center justify-center`;
  const fallbackTextClass = size === 'small' ? 'text-base' : 'text-2xl';

  if (!icon) {
    return (
      <span className={`${imageWrapperClass} ${fallbackTextClass} font-semibold text-white/80`}>{fallback}</span>
    );
  }

  return (
    <span className={imageWrapperClass}>
      <Image
        src={icon}
        alt={`${entry.achievement.title} icon`}
        width={dimension}
        height={dimension}
        className="h-full w-full rounded-2xl object-contain"
        unoptimized={isRemote}
        draggable={false}
      />
    </span>
  );
}

function AchievementDetailsModal({
  achievement,
  isOpen,
  onClose,
}: {
  achievement: UserAchievement;
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (typeof document === 'undefined') {
    return null;
  }

  const overlayStateClass = isOpen
    ? 'pointer-events-auto opacity-100 backdrop-blur-md'
    : 'pointer-events-none opacity-0 backdrop-blur-none';
  const dialogStateClass = isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0';

  return createPortal(
    <div
      className={`fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 px-4 transition-[opacity,backdrop-filter] duration-[240ms] ease-out ${overlayStateClass}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className={`relative w-full max-w-lg rounded-3xl bg-slate-950/90 p-6 text-white shadow-[0_28px_60px_rgba(2,6,23,0.65)] ring-1 ring-white/15 transition-all duration-[240ms] ease-out sm:p-8 ${dialogStateClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="cursor-target absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label="Close achievement details"
        >
          <span className="text-xl" aria-hidden>
            &times;
          </span>
        </button>
        <div className="flex flex-col items-center gap-6 text-center">
          <AchievementIcon entry={achievement} />
          <div className="flex flex-col items-center gap-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/60">Achievement</p>
            <h2 id="achievement-modal-title" className="text-2xl font-semibold text-white">
              {achievement.achievement.title}
            </h2>
            {achievement.achievement.description && (
              <p className="max-w-md text-sm text-white/75">
                {achievement.achievement.description}
              </p>
            )}
          </div>
          <div className="flex w-full flex-col gap-3 rounded-2xl bg-white/5 px-5 py-4 text-left text-sm text-white/80 ring-1 ring-white/15">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Unlocked on</span>
              <span className="text-base font-semibold text-white">
                {formatDate(achievement.unlockedAt, { dateStyle: 'full', timeStyle: 'short' })}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Achievement ID</span>
              <span className="font-mono text-sm text-white/85">{achievement.achievementId}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Slug</span>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
                {formatAchievementSlug(achievement.achievement.slug)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
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
    activeAchievement,
    isAchievementModalOpen,
    isAvatarUpdating,
    avatarUploadError,
    handleBackToLanding,
    handleSignOut,
    handleAchievementSelect,
    handleAchievementModalClose,
    handleAvatarUpload,
    handleAvatarRemove,
  } = useProfilePage();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const isRemoveAvatarDisabled = isAvatarUpdating || !currentProfile?.avatarUrl;

  const handleAvatarButtonClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleAvatarUpload(file);
      event.target.value = '';
    }
  };

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
           className="pointer-events-none absolute inset-0 z-0 h-full w-full"
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
           className="pointer-events-none absolute inset-0 z-0 h-full w-full"
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
         className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      />
      <BackgroundDoodles />

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-10">
        {activeAchievement && (
          <AchievementDetailsModal
            achievement={activeAchievement}
            isOpen={isAchievementModalOpen}
            onClose={handleAchievementModalClose}
          />
        )}
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-center gap-3 sm:items-center">
              {currentProfile?.avatarUrl ? (
                <Image
                  src={currentProfile.avatarUrl}
                  alt={currentProfile.displayName ?? 'Profile avatar'}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full border-2 border-white/60 object-cover shadow-[0_12px_28px_rgba(15,23,42,0.45)]"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-900/70 text-3xl font-extrabold uppercase text-white shadow-[0_12px_28px_rgba(15,23,42,0.45)]">
                  {(currentProfile?.displayName ?? currentAuth.email ?? 'A').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col gap-2 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start sm:flex-nowrap flex-nowrap">
                  <button
                    type="button"
                    onClick={handleAvatarButtonClick}
                    disabled={isAvatarUpdating}
                    className="cursor-target inline-flex items-center justify-center rounded-full bg-white/15 px-3.5 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-70 whitespace-nowrap"
                  >
                    {isAvatarUpdating ? 'Saving...' : 'Change avatar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAvatarRemove()}
                    disabled={isRemoveAvatarDisabled}
                    className={`cursor-target inline-flex items-center justify-center rounded-full px-3.5 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.18em] transition whitespace-nowrap disabled:cursor-not-allowed ${
                      isRemoveAvatarDisabled
                        ? 'bg-white/15 text-white/50 opacity-75'
                        : 'bg-rose-500/80 text-white hover:bg-rose-500/90'
                    }`}
                  >
                    {isAvatarUpdating ? 'Saving...' : 'Remove avatar'}
                  </button>
                </div>
                {avatarUploadError && (
                  <p className="max-w-[16rem] text-center text-xs font-medium text-rose-200 sm:text-left" aria-live="polite">
                    {avatarUploadError}
                  </p>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>
            <div className="text-center sm:text-left">
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
                  <AchievementIcon entry={entry} size="small" />
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

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {achievements.length === 0 && (
              <div className="col-span-full rounded-3xl border border-dashed border-white/30 bg-white/5 px-6 py-10 text-center text-sm text-white/70">
                No achievements earned yet. Dive into AlgoHub&apos;s challenges to unlock your first trophy!
              </div>
            )}
            {achievements.map((entry) => (
              <button
                key={entry.achievementId}
                type="button"
                onClick={() => handleAchievementSelect(entry)}
                className="cursor-target group relative flex h-full flex-col items-center gap-5 overflow-hidden rounded-3xl bg-white/10 p-6 text-white text-center shadow-[0_18px_45px_rgba(15,23,42,0.45)] ring-1 ring-white/20 backdrop-blur-2xl transition duration-300 ease-out hover:bg-white/14 hover:shadow-[0_22px_55px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/8 via-white/4 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <AchievementIcon entry={entry} />
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/60">Achievement</p>
                  <h3 className="text-lg font-semibold text-white">{entry.achievement.title}</h3>
                  <p className="max-w-[18rem] text-xs text-white/75">{entry.achievement.description}</p>
                </div>
                <footer className="mt-auto flex w-full flex-col items-center gap-2 text-[0.65rem] uppercase tracking-[0.22em] text-white/60">
                  <span>Unlocked {formatDate(entry.unlockedAt, { dateStyle: 'medium' })}</span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-white/85">{formatAchievementSlug(entry.achievement.slug)}</span>
                </footer>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
