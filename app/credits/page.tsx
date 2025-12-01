'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent, KeyboardEvent } from 'react';
import developers from '@/data/developers.json';
import { useCallback } from '@/hooks/useCallback';
import { useEffect } from '@/hooks/useEffect';
import { useRef } from '@/hooks/useRef';
import { useState } from '@/hooks/useState';
import Squares from '../components/ui/Squares';
import BackgroundDoodles from '../components/sections/BackgroundDoodles';
import TargetCursor from '../components/ui/TargetCursor';
import { CREDITS_GRADIENT, LANDING_GRADIENT, useSlideTransition } from '../components/ui/SlideTransition';
import { playSfx } from '@/lib/audio/sfx';
import { setSkipNextAuthModal, setSkipNextIrisOpen } from '@/lib/transition/transitionBus';
import Image from 'next/image';
import type { Contributor } from '@/types/contributors';

const CONTRIBUTORS = developers as Contributor[];

export default function CreditsPage() {
  const router = useRouter();
  const slideTransition = useSlideTransition();
  const isTransitioningRef = useRef(false);
  const [activeContributor, setActiveContributor] = useState<Contributor | null>(null);
  const hideSidebarTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    slideTransition.setGradient(CREDITS_GRADIENT);
  }, [slideTransition]);

  const clearHideSidebarTimeout = useCallback(() => {
    if (hideSidebarTimeoutRef.current !== null) {
      clearTimeout(hideSidebarTimeoutRef.current);
      hideSidebarTimeoutRef.current = null;
    }
  }, []);

  const scheduleHideSidebar = useCallback(() => {
    clearHideSidebarTimeout();
    if (typeof window === 'undefined') {
      setActiveContributor(null);
      return;
    }
    hideSidebarTimeoutRef.current = window.setTimeout(() => {
      setActiveContributor(null);
      hideSidebarTimeoutRef.current = null;
    }, 140);
  }, [clearHideSidebarTimeout]);

  useEffect(() => () => clearHideSidebarTimeout(), [clearHideSidebarTimeout]);

  const handleBackToLanding = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (isTransitioningRef.current) {
        return;
      }
      isTransitioningRef.current = true;
      playSfx('/button_click.mp3', 0.55);
      setSkipNextIrisOpen();
      setSkipNextAuthModal();
      slideTransition.start({
        origin: 'right',
        fromGradient: CREDITS_GRADIENT,
        toGradient: LANDING_GRADIENT,
        onCovered: () => {
          router.push('/');
        },
        onDone: () => {
          isTransitioningRef.current = false;
        },
      });
    },
    [router, slideTransition],
  );

  const handleCardEnter = useCallback(
    (contributor: Contributor) => {
      clearHideSidebarTimeout();
      setActiveContributor(contributor);
    },
    [clearHideSidebarTimeout],
  );

  const handleCardKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, contributor: Contributor) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleCardEnter(contributor);
      }
    },
    [handleCardEnter],
  );

  const handleCardLeave = useCallback(() => {
    scheduleHideSidebar();
  }, [scheduleHideSidebar]);

  const handleSidebarEnter = useCallback(() => {
    clearHideSidebarTimeout();
  }, [clearHideSidebarTimeout]);

  const handleSidebarLeave = useCallback(() => {
    scheduleHideSidebar();
  }, [scheduleHideSidebar]);

  const sidebarVisible = Boolean(activeContributor);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-transparent text-white">
      <div className="absolute left-4 top-4 z-20 flex">
        <Link
          href="/"
          onClick={handleBackToLanding}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white ring-1 ring-white/25 transition-all duration-200 hover:bg-white/25"
        >
          Back to Landing
        </Link>
      </div>
      <TargetCursor spinDuration={2} hideDefaultCursor parallaxOn />
      <Squares
        speed={0.4}
        squareSize={48}
        direction="diagonal"
        borderColor="#ffffff18"
        hoverFillColor="#ffffff"
        className="pointer-events-none fixed inset-0 z-0"
      />
      <BackgroundDoodles />

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 ring-1 ring-white/20">
            Algohub Team
          </span>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Credits</h1>
          <p className="mx-auto max-w-2xl text-base text-white/80 sm:text-lg">
            AlgoHub is built with care by a small team of developers who love blending games and learning.
          </p>
        </div>

        <div className="mt-10 grid w-full gap-6 sm:grid-cols-2">
          {CONTRIBUTORS.map((contributor) => {
            const isActive = activeContributor?.id === contributor.id;

            return (
              <div
                key={contributor.id}
                className={`group relative overflow-hidden rounded-[2rem] border border-white/12 bg-white/8 p-6 text-left shadow-[0_18px_55px_rgba(15,23,42,0.45)] backdrop-blur-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                  isActive ? 'ring-2 ring-white/70 bg-white/15 shadow-[0_25px_65px_rgba(15,23,42,0.55)]' : 'hover:-translate-y-1 hover:bg-white/12'
                }`}
                onMouseEnter={() => handleCardEnter(contributor)}
                onMouseLeave={handleCardLeave}
                onFocus={() => handleCardEnter(contributor)}
                onBlur={handleCardLeave}
                onClick={() => handleCardEnter(contributor)}
                onKeyDown={(event) => handleCardKeyDown(event, contributor)}
                tabIndex={0}
                role="button"
                aria-pressed={isActive}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-80"
                  style={{
                    backgroundImage: `linear-gradient(125deg, rgba(2,6,23,0.4), rgba(2,6,23,0.9)), url(${contributor.heroImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <span className={`pointer-events-none absolute -right-10 top-1/2 h-32 w-32 -translate-y-1/2 blur-3xl opacity-60 transition duration-500 group-hover:opacity-90 bg-gradient-to-br ${contributor.avatarAccent}`} />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-white/60">Featured Dev</p>
                    <p className="mt-2 text-xl font-semibold text-white">{contributor.name}</p>
                    <p className="text-sm text-white/70">{contributor.location}</p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-lg">
                    {contributor.personaIcon}
                  </span>
                </div>

                <div className="relative mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 p-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                    {contributor.avatarImage ? (
                      <Image
                        src={contributor.avatarImage}
                        alt={`${contributor.name} avatar`}
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-base font-black text-white">
                        {contributor.name
                          .split(' ')
                          .map((chunk) => chunk[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-white/60">Focus</p>
                    <p className="text-sm text-white/85">{contributor.focus}</p>
                  </div>
                </div>

                <div className="relative mt-4 flex flex-wrap gap-2">
                  {contributor.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-white/75 ring-1 ring-white/15"
                    >
                      {role}
                    </span>
                  ))}
                </div>

                <div className="relative mt-6 flex items-center justify-between text-[0.62rem] font-semibold uppercase tracking-[0.35em] text-white/70">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-transform duration-300 group-hover:translate-x-1">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-xs uppercase tracking-[0.3em] text-white/60">
          In compliance with the Data Structures and Algorithms course of Engr. Lorico
        </p>
      </section>

      <aside
        className={`fixed inset-y-0 right-0 z-30 w-full max-w-xl bg-slate-950/95 text-left text-white shadow-[0_25px_65px_rgba(2,6,23,0.75)] ring-1 ring-white/10 backdrop-blur-2xl transition-transform duration-[420ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] sm:max-w-2xl ${
          sidebarVisible ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        aria-hidden={!sidebarVisible}
      >
        {activeContributor && (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="relative h-60 overflow-hidden">
              <Image
                src={activeContributor.heroImage}
                alt="Profile backdrop"
                fill
                className="object-cover"
                sizes="100vw"
                quality={95}
                priority
              />
              <div className={`absolute inset-0 ${activeContributor.heroOverlay}`} />
              <div className="absolute right-6 top-6 flex flex-col items-end gap-2 text-right">
                <span className="inline-flex items-center justify-center rounded-2xl bg-white/20 px-3 py-1 text-base">
                  {activeContributor.personaIcon}
                </span>
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.3em] text-white/70">
                  Vibe Check
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 px-8 pb-6">
                <div className="flex items-end gap-4">
                  <div className="relative h-24 w-24 rounded-[1.75rem] shadow-lg ring-4 ring-white/25 overflow-hidden">
                    {activeContributor.avatarImage ? (
                      <Image
                        src={activeContributor.avatarImage}
                        alt={`${activeContributor.name} avatar`}
                        width={192}
                        height={192}
                        className="h-full w-full object-cover"
                        quality={95}
                        priority
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${activeContributor.avatarAccent} text-white text-4xl font-black`}
                      >
                        {activeContributor.name
                          .split(' ')
                          .map((chunk) => chunk[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">AlgoHub Developer</p>
                    <h2 className="text-3xl font-black leading-tight text-white drop-shadow-sm">{activeContributor.name}</h2>
                    <p className="text-sm text-white/80">{activeContributor.location}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeContributor.roles.map((role) => (
                        <span
                          key={role}
                          className={`inline-flex items-center rounded-full px-3 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.24em] ${activeContributor.chipStyle}`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-b border-white/10 bg-white/5 px-6 py-4 text-center text-white">
              {activeContributor.stats.map((stat) => (
                <div key={stat.label} className={`rounded-2xl p-3 ${activeContributor.statStyle}`}>
                  <p className="text-lg font-black">{stat.value}</p>
                  <p className="text-[0.6rem] uppercase tracking-[0.3em] text-white/60">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-8 py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">Focus</p>
                <p className="mt-2 text-base text-white/90">{activeContributor.focus}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">Bio</p>
                <p className="mt-2 text-base text-white/85">{activeContributor.bio}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/55">Favorite stack</p>
                  <p className="mt-2 text-sm text-white/90">{activeContributor.favoriteStack}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/55">Fun fact</p>
                  <p className="mt-2 text-sm text-white/90">{activeContributor.funFact}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/55">Quote</p>
                <p className="mt-2 text-base italic text-white/90">{activeContributor.quote}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 border-t border-white/10 px-8 py-5 text-center">
              <span className="text-xs uppercase tracking-[0.4em] text-white/60">Find me</span>
              <div className="flex gap-3">
                {activeContributor.socials.map((social) => (
                  <Link
                    key={social.platform}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/25"
                    aria-label={`${social.platform} profile for ${activeContributor.name}`}
                  >
                    {social.platform === 'github' ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 19c-4.5 1.5-4.5-2.5-6-3m12 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 18 4.77 5.07 5.07 0 0 0 17.91 1S16.73.65 15 2.24a13.38 13.38 0 0 0-6 0C7.27.65 6.09 1 6.09 1A5.07 5.07 0 0 0 6 4.77 5.44 5.44 0 0 0 4.5 8.5c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 10 17.13V21" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3zm-1.5-11.29c-.96 0-1.75-.79-1.75-1.75s.79-1.75 1.75-1.75 1.75.79 1.75 1.75-.79 1.75-1.75 1.75zm13.5 11.29h-3v-5.36c0-1.28-.02-2.94-1.79-2.94-1.79 0-2.06 1.4-2.06 2.85v5.45h-3v-10h2.88v1.37h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.59v5.6z" />
                      </svg>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
