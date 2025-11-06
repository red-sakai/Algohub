"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getGlobalAudio } from "../ui/audioSingleton";
import { getGameAudio } from "../ui/gameAudio";
import CameraCaptureModal from "../ui/CameraCaptureModal";
import LicenseCardModal from "../ui/LicenseCardModal";

type Game = {
  id: string;
  title: string;
  desc: string;
  colorFrom: string;
  colorTo: string;
  track: { title: string; src: string };
};

const GAMES: Game[] = [
  {
    id: "sorting-sprint",
    title: "Sorting Sprint",
    desc: "Race through arrays with quick pivots and perfect merges.",
    colorFrom: "from-fuchsia-500",
    colorTo: "to-rose-500",
    track: { title: "AlgoHub Theme", src: "/audio/algohub-theme.mp3" },
  },
  {
    id: "graph-quest",
    title: "Graph Quest",
    desc: "Traverse nodes, conquer paths, and unlock secrets.",
    colorFrom: "from-emerald-500",
    colorTo: "to-teal-500",
    track: { title: "Ambient Loop", src: "/audio/ambient-loop.mp3" },
  },
  {
    id: "dp-dungeon",
    title: "DP Dungeon",
    desc: "Plan your moves and optimize every choice.",
    colorFrom: "from-sky-500",
    colorTo: "to-indigo-500",
    track: { title: "AlgoHub Theme", src: "/audio/algohub-theme.mp3" },
  },
  {
    id: "tree-trek",
    title: "Tree Trek",
    desc: "Balance, traverse, and grow your skills.",
    colorFrom: "from-amber-500",
    colorTo: "to-orange-500",
    track: { title: "Ambient Loop", src: "/audio/ambient-loop.mp3" },
  },
];

export default function GameScroller() {
  const items = useMemo(() => GAMES, []);
  const [active, setActive] = useState(0);
  const lastPlayedRef = useRef<number | null>(null);
  const pausedPlayerPrevRef = useRef(false);
  const globalAudioPlayHandlerRef = useRef<EventListener | null>(null);
  const [showCam, setShowCam] = useState(false);
  const [licensePhoto, setLicensePhoto] = useState<string | null>(null);
  const [showLicense, setShowLicense] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop game audio
  try { getGameAudio().pause(); } catch {}
      // Remove global player play handler
      const ga = getGlobalAudio();
      if (globalAudioPlayHandlerRef.current) {
        ga.removeEventListener("play", globalAudioPlayHandlerRef.current);
        globalAudioPlayHandlerRef.current = null;
      }
      // Optionally resume global player if it was paused by us
      if (pausedPlayerPrevRef.current) {
        try { ga.play().catch(() => {}); } catch {}
        pausedPlayerPrevRef.current = false;
      }
    };
  }, []);

  const ensureGlobalPlayerPaused = () => {
    const ga = getGlobalAudio();
    if (!ga.paused) {
      pausedPlayerPrevRef.current = true;
      try { ga.pause(); } catch {}
    }
    // While game audio is active, force-pause the global player if it tries to play
    if (!globalAudioPlayHandlerRef.current) {
      const handler: EventListener = () => {
        // If game audio is playing, immediately pause global audio
        const a = getGameAudio();
        if (!a.paused) {
          try { ga.pause(); } catch {}
        }
      };
      ga.addEventListener("play", handler);
      globalAudioPlayHandlerRef.current = handler;
    }
  };

  const playForIndex = (idx: number, opts?: { fromNav?: boolean }) => {
    const fromNav = opts?.fromNav === true;
    const g = items[idx];
    if (!g) return;
    // For the first game, trigger the camera capture flow instead of immediate audio
    if (g.id === "sorting-sprint") {
      // When navigating with Prev/Next, don't open the camera automatically.
      if (fromNav) return;
      setShowCam(true);
      return;
    }
    ensureGlobalPlayerPaused();
    const a = getGameAudio();
    a.loop = true;
    a.volume = 0.8;
    a.src = g.track.src;
    a.currentTime = 0;
    a.play().catch(() => {});
    lastPlayedRef.current = idx;
  };

  const go = (dir: 1 | -1) => {
    setActive((i) => {
      const nxt = Math.max(0, Math.min(items.length - 1, i + dir));
      // Only play on user-initiated navigation
      playForIndex(nxt, { fromNav: true });
      return nxt;
    });
  };
  const goTo = (idx: number) => {
    const nxt = Math.max(0, Math.min(items.length - 1, idx));
    setActive(nxt);
    playForIndex(nxt, { fromNav: true });
  };

  return (
    <section className="relative z-10 h-[100dvh] w-full overflow-hidden">
      {/* Slides track */}
      <div
        className="h-full w-full will-change-transform"
        style={{
          transform: `translate3d(0, ${-active * 100}dvh, 0)`,
          transition: "transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {items.map((g, i) => (
          <div key={g.id} className="relative h-[100dvh] w-full">
            <div className={`absolute inset-0 bg-gradient-to-br ${g.colorFrom} ${g.colorTo} opacity-90`} />
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10 flex h-full w-full items-center justify-center p-6 text-center drop-shadow-lg">
              <div className="mx-auto max-w-3xl">
                <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">{g.title}</h2>
                <p className="mx-auto mt-3 max-w-prose text-base text-white/90 sm:text-lg md:text-xl">{g.desc}</p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/25">
                  <span className="h-2 w-2 rounded-full bg-green-300" />
                  {i === active ? "Now Playing Theme" : "Tap Next/Prev"}
                </div>
                <div className="mt-5 flex items-center justify-center">
                  <button
                    onClick={() => playForIndex(i)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-base font-extrabold tracking-wide text-white shadow-[0_8px_0_0_rgb(2,132,199)] ring-1 ring-white/20 transition-all duration-200 hover:translate-y-[1px] hover:shadow-[0_6px_0_0_rgb(2,132,199)] hover:scale-[1.02] active:translate-y-[3px] active:shadow-[0_3px_0_0_rgb(2,132,199)]"
                    aria-label={`Play ${g.title}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play
                  </button>
                </div>
                {g.id === "sorting-sprint" && licensePhoto && (
                  <div className="mt-4 text-center text-xs text-white/80">License photo saved.</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prev/Next controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex items-center justify-center gap-4 sm:bottom-8">
        <button
          onClick={() => go(-1)}
          disabled={active === 0}
          className="pointer-events-auto inline-grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/20 backdrop-blur-md transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-black/60"
          aria-label="Previous game"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <div className="pointer-events-auto select-none rounded-full bg-black/40 px-3 py-1 text-sm font-semibold ring-1 ring-white/20 text-white/90">
          {active + 1} / {items.length}
        </div>
        <button
          onClick={() => go(1)}
          disabled={active === items.length - 1}
          className="pointer-events-auto inline-grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/20 backdrop-blur-md transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-black/60"
          aria-label="Next game"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
        </button>
      </div>

      {/* Optional dot indicators */}
      <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`pointer-events-auto h-2.5 w-2.5 rounded-full ring-1 ring-white/25 transition ${i === active ? "bg-white" : "bg-white/40 hover:bg-white/60"}`}
            aria-label={`Go to game ${i + 1}`}
          />
        ))}
      </div>

      {/* Camera modal for first game */}
      <CameraCaptureModal
        active={showCam}
        onClose={() => setShowCam(false)}
        onCaptured={(dataUrl) => {
          setLicensePhoto(dataUrl);
          setShowCam(false);
          setShowLicense(true);
        }}
      />

      {/* License card modal after capture */}
      <LicenseCardModal
        active={showLicense}
        photoDataUrl={licensePhoto || ""}
        onClose={() => setShowLicense(false)}
        onSave={() => {
          // After saving the license, begin the game's audio
          const firstIdx = items.findIndex((g) => g.id === "sorting-sprint");
          if (firstIdx >= 0) {
            ensureGlobalPlayerPaused();
            const a = getGameAudio();
            a.loop = true;
            a.volume = 0.8;
            a.src = items[firstIdx].track.src;
            a.currentTime = 0;
            a.play().catch(() => {});
            lastPlayedRef.current = firstIdx;
          }
          setShowLicense(false);
        }}
      />
    </section>
  );
}
