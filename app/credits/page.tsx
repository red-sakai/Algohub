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
import Image from 'next/image';

type Contributor = {
  id: string;
  name: string;
  roles: string[];
  bio: string;
  focus: string;
  favoriteStack: string;
  funFact: string;
  location: string;
  heroImage: string;
  avatarImage: string | null;
  avatarAccent: string;
  heroOverlay: string;
  chipStyle: string;
  statStyle: string;
  personaIcon: string;
  quote: string;
  stats: Array<{ label: string; value: string }>;
  socials: Array<{ platform: 'github' | 'linkedin'; url: string }>;
};

const CONTRIBUTORS: Contributor[] = [
  {
    id: 'jhered',
    name: 'Jhered Miguel Republica',
    roles: ['Frontend Developer', 'Backend Developer', 'Game Developer'],
    bio: 'Leads the product experience end-to-end, wiring our Supabase backend to the playful UI layers and prototyping new AlgoHub game loops.',
    focus: 'Ship-ready builds, multiplayer sync, and high-fidelity UI polish.',
    favoriteStack: 'Next.js · Supabase · Three.js · GSAP',
    funFact: 'Obsessed with tiny hover effects and bullet casings—nothing ships without flair.',
    location: 'Pasig, PH',
    heroImage: '/credits/jhered-bg.jpeg',
    avatarImage: '/credits/jhered.jpg',
    avatarAccent: 'from-sky-500 to-indigo-500',
    heroOverlay: 'bg-gradient-to-b from-sky-900/5 via-indigo-950/55 to-slate-950/85',
    chipStyle: 'bg-sky-400/25 text-white ring-1 ring-sky-200/40',
    statStyle: 'bg-sky-500/10 ring-1 ring-sky-300/35 shadow-[0_8px_20px_rgba(14,165,233,0.25)]',
    personaIcon: '⚡️',
    quote: '“Keep shipping, even if it means polishing hover states at 3 AM.”',
    stats: [
      { label: 'Deploys', value: '42' },
      { label: 'Mini-games', value: '15' },
      { label: 'Commits', value: '1.2k' },
    ],
    socials: [
      { platform: 'github', url: 'https://github.com/red-sakai' },
      { platform: 'linkedin', url: 'https://www.linkedin.com/in/jrepublica/' },
    ],
  },
  {
    id: 'ezekiel',
    name: 'Ezekiel Bustamante',
    roles: ['Game Developer'],
    bio: 'Codes the moment-to-moment gameplay, tunes physics, and keeps every puzzle, race, and mini-challenge feeling snappy across devices.',
    focus: 'Gameplay feel, physics tuning, and performance profiling.',
    favoriteStack: 'Three.js · Cannon-es · Zustand · Vite playgrounds',
    funFact: 'Keeps a notebook of “juicy” interactions and recreates them in AlgoHub.',
    location: 'Rizal, PH',
    heroImage: '/r3f/textures/hero-bg-2.jpg',
    avatarImage: '/contributors/ezekiel.jpg',
    avatarAccent: 'from-emerald-500 to-lime-500',
    heroOverlay: 'bg-gradient-to-b from-emerald-900/10 via-emerald-900/55 to-slate-950/85',
    chipStyle: 'bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-300/40',
    statStyle: 'bg-emerald-500/10 ring-1 ring-emerald-300/30 shadow-[0_8px_20px_rgba(16,185,129,0.25)]',
    personaIcon: '🎯',
    quote: '“Frame-perfect inputs and buttery easing—that’s the bar.”',
    stats: [
      { label: 'Game loops', value: '24' },
      { label: 'Physics patches', value: '58' },
      { label: 'FPS budget', value: '120Hz' },
    ],
    socials: [
      { platform: 'github', url: 'https://github.com/defzeke' },
      { platform: 'linkedin', url: 'https://www.linkedin.com/in/ezekiel-bustamante-166493353/' },
    ],
  },
  {
    id: 'carl-melvin',
    name: 'Carl Melvin Erosa',
    roles: ['UI/UX', 'Project Manager'],
    bio: 'Owns the visual language and delivery timeline, aligning mockups, accessibility goals, and milestone drops for each AlgoHub release.',
    focus: 'Design systems, user interviews, and shipping on time.',
    favoriteStack: 'Figma · Notion · Tailwind · Supabase dashboards',
    funFact: 'Collects keyboard switches and tests layouts on each one for “typing ergonomics.”',
    location: 'Pasig, PH',
    heroImage: '/credits/carl-bg.png',
    avatarImage: '/credits/carl.jpg',
    avatarAccent: 'from-pink-500 to-orange-400',
    heroOverlay: 'bg-gradient-to-b from-rose-900/10 via-fuchsia-900/55 to-slate-950/85',
    chipStyle: 'bg-rose-400/25 text-rose-50 ring-1 ring-rose-300/40',
    statStyle: 'bg-rose-500/10 ring-1 ring-rose-300/30 shadow-[0_8px_20px_rgba(244,114,182,0.25)]',
    personaIcon: '🎨',
    quote: '“Pixels, people, and project timelines can all align beautifully.”',
    stats: [
      { label: 'Sprints', value: '18' },
      { label: 'Wireframes', value: '120+' },
      { label: 'Stand-ups', value: '∞' },
    ],
    socials: [
      { platform: 'github', url: 'https://github.com/CarlErosa' },
      { platform: 'linkedin', url: 'https://www.linkedin.com/in/carl-melvin-erosa-4805b4304/' },
    ],
  },
  {
    id: 'carl-blancaflor',
    name: 'Carl Blancaflor',
    roles: ['Game Developer'],
    bio: 'Designs challenge pacing, rewards, and delightful polish passes that make AlgoHub feel like a proper game hub instead of a static course.',
    focus: 'Level design, reward systems, and easter eggs.',
    favoriteStack: 'React Three Fiber · Supabase functions · Blender',
    funFact: 'Hides Morse code hints throughout the hub for players to discover.',
    location: 'Laguna, PH',
    heroImage: '/r3f/textures/hero-bg-4.jpg',
    avatarImage: '/contributors/carl-blancaflor.jpg',
    avatarAccent: 'from-amber-500 to-rose-500',
    heroOverlay: 'bg-gradient-to-b from-amber-900/10 via-orange-900/55 to-slate-950/85',
    chipStyle: 'bg-amber-400/25 text-amber-50 ring-1 ring-amber-300/40',
    statStyle: 'bg-amber-500/10 ring-1 ring-amber-300/30 shadow-[0_8px_20px_rgba(251,191,36,0.25)]',
    personaIcon: '🚀',
    quote: '“Hide secrets everywhere. Curiosity turns learners into explorers.”',
    stats: [
      { label: 'Rewards', value: '64' },
      { label: 'Easter eggs', value: '12' },
      { label: 'Quests', value: '20' },
    ],
    socials: [
      { platform: 'github', url: 'https://github.com/Carlthegreatt' },
      { platform: 'linkedin', url: 'https://www.linkedin.com/in/carl-blancaflor-013881323/' },
    ],
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
              <div className="mt-2 flex flex-wrap gap-2">
                {contributor.roles.map((role) => (
                  <span key={role} className="inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/75 ring-1 ring-white/15">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          ))}
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
