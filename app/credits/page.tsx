'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent, KeyboardEvent } from 'react';
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

type Contributor = {
  id: string;
  name: string;
  roles: string;
  bio: string;
  focus: string;
  favoriteStack: string;
  funFact: string;
};

const CONTRIBUTORS: Contributor[] = [
  {
    id: 'jhered',
    name: 'Jhered Miguel Republica',
    roles: 'Frontend Developer · Backend Developer · Game Developer',
    bio: 'Leads the product experience end-to-end, wiring our Supabase backend to the playful UI layers and prototyping new AlgoHub game loops.',
    focus: 'Ship-ready builds, multiplayer sync, and high-fidelity UI polish.',
    favoriteStack: 'Next.js · Supabase · Zustand · GSAP',
    funFact: 'Obsessed with tiny hover effects and bullet casings—nothing ships without flair.',
  },
  {
    id: 'ezekiel',
    name: 'Ezekiel Bustamante',
    roles: 'Game Developer',
    bio: 'Codes the moment-to-moment gameplay, tunes physics, and keeps every puzzle, race, and mini-challenge feeling snappy across devices.',
    focus: 'Gameplay feel, physics tuning, and performance profiling.',
    favoriteStack: 'Three.js · Cannon-es · Zustand · Vite playgrounds',
    funFact: 'Keeps a notebook of “juicy” interactions and recreates them in AlgoHub.',
  },
  {
    id: 'carl-melvin',
    name: 'Carl Melvin Erosa',
    roles: 'UI/UX · Project Manager',
    bio: 'Owns the visual language and delivery timeline, aligning mockups, accessibility goals, and milestone drops for each AlgoHub release.',
    focus: 'Design systems, user interviews, and shipping on time.',
    favoriteStack: 'Figma · Notion · Tailwind · Supabase dashboards',
    funFact: 'Collects keyboard switches and tests layouts on each one for “typing ergonomics.”',
  },
  {
    id: 'carl-blancaflor',
    name: 'Carl Blancaflor',
    roles: 'Game Developer',
    bio: 'Designs challenge pacing, rewards, and delightful polish passes that make AlgoHub feel like a proper game hub instead of a static course.',
    focus: 'Level design, reward systems, and easter eggs.',
    favoriteStack: 'React Three Fiber · Supabase functions · Blender',
    funFact: 'Hides Morse code hints throughout the hub for players to discover.',
  },
];

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

        <div className="mt-10 grid w-full gap-5 sm:grid-cols-2">
          {CONTRIBUTORS.map((contributor) => (
            <div
              key={contributor.id}
              className="rounded-3xl bg-white/10 p-6 text-left shadow-[0_18px_45px_rgba(15,23,42,0.45)] ring-1 ring-white/15 backdrop-blur-2xl transition-colors duration-200 hover:bg-white/14 focus-within:bg-white/14"
              onMouseEnter={() => handleCardEnter(contributor)}
              onMouseLeave={handleCardLeave}
              onFocus={() => handleCardEnter(contributor)}
              onBlur={handleCardLeave}
              onClick={() => handleCardEnter(contributor)}
              onKeyDown={(event) => handleCardKeyDown(event, contributor)}
              tabIndex={0}
              role="button"
            >
              <p className="text-lg font-semibold text-white">{contributor.name}</p>
              <p className="mt-1 text-sm text-white/70">{contributor.roles}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs uppercase tracking-[0.3em] text-white/60">
          In compliance with the Data Structures and Algorithms course of Engr. Lorico
        </p>
      </section>

      <aside
        className={`fixed inset-y-0 right-0 z-30 w-full max-w-xl bg-slate-950/95 p-0 text-left text-white shadow-[0_25px_65px_rgba(2,6,23,0.75)] ring-1 ring-white/10 backdrop-blur-2xl transition-transform duration-[420ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] sm:max-w-2xl ${
          sidebarVisible ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        aria-hidden={!sidebarVisible}
      >
        {activeContributor && (
          <div className="flex h-full flex-col">
            <div className="relative h-48 bg-gradient-to-br from-sky-600/60 via-purple-500/45 to-emerald-500/45">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.38),transparent)]" />
              <div className="absolute left-8 top-8 flex items-center gap-4">
                <div className="h-20 w-20 rounded-[1.5rem] bg-white/15 ring-2 ring-white/30 flex items-center justify-center text-3xl font-black text-white">
                  {activeContributor.name
                    .split(' ')
                    .map((chunk) => chunk[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">Team Member</p>
                  <h2 className="text-3xl font-black leading-tight text-white drop-shadow">{activeContributor.name}</h2>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/80">{activeContributor.roles}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-6 p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">Focus</p>
                <p className="mt-2 text-base text-white/90">{activeContributor.focus}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">Bio</p>
                <p className="mt-2 text-base text-white/85">{activeContributor.bio}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/05 p-4 ring-1 ring-white/10">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/55">Favorite stack</p>
                  <p className="mt-2 text-sm text-white/90">{activeContributor.favoriteStack}</p>
                </div>
                <div className="rounded-2xl bg-white/05 p-4 ring-1 ring-white/10">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/55">Fun fact</p>
                  <p className="mt-2 text-sm text-white/90">{activeContributor.funFact}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
