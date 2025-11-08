"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getGlobalAudio } from "../ui/audioSingleton";
import { getGameAudio } from "../ui/gameAudio";
import CameraCaptureModal from "../ui/CameraCaptureModal";
import LicenseCardModal from "../ui/LicenseCardModal";
import LoadingOverlay from "../ui/LoadingOverlay";
import IrisTransition, { IrisHandle } from "../ui/IrisTransition";
import { setIrisPoint } from "../ui/transitionBus";
import { uploadImageDataUrl } from "@/lib/supabase/uploadImage";
import { playSfx } from "../ui/sfx";

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
    track: { title: "Pokemon FireRed - Route 1", src: "/audio/Pokemon%20FireRed%20-%20Route%201.mp3" },
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
  const [lastPlayed, setLastPlayed] = useState<number | null>(null);
  const pausedPlayerPrevRef = useRef(false);
  const globalAudioPlayHandlerRef = useRef<EventListener | null>(null);
  // Remember per-slide resume times when user navigates away
  const resumeTimesRef = useRef<Map<number, number>>(new Map());
  const [showCam, setShowCam] = useState(false);
  const [licensePhoto, setLicensePhoto] = useState<string | null>(null);
  const [showLicense, setShowLicense] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const irisRef = useRef<IrisHandle | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Cleanup on unmount (stop game audio only; let global resume naturally on landing page)
  useEffect(() => {
    return () => {
      try { getGameAudio().pause(); } catch {}
      const ga = getGlobalAudio();
      if (globalAudioPlayHandlerRef.current) {
        ga.removeEventListener("play", globalAudioPlayHandlerRef.current);
        globalAudioPlayHandlerRef.current = null;
      }
      // Do not forcibly pause global audio here so landing page MusicPlayer can continue.
      pausedPlayerPrevRef.current = false;
    };
  }, []);

  // Game volume slider state (persisted)
  const GAME_VOL_KEY = "algohub_game_volume_v1";
  const [gameVolume, setGameVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 0.8;
    try { const raw = localStorage.getItem(GAME_VOL_KEY); if (raw) return Math.max(0, Math.min(1, parseFloat(raw))); } catch {}
    return 0.8;
  });
  useEffect(() => { try { localStorage.setItem(GAME_VOL_KEY, String(gameVolume)); } catch {} }, [gameVolume]);
  useEffect(() => { try { const a = getGameAudio(); a.volume = gameVolume; } catch {} }, [gameVolume]);

  const ensureGlobalPlayerPaused = () => {
    const ga = getGlobalAudio();
    if (!ga.paused) {
      pausedPlayerPrevRef.current = true;
      try { ga.pause(); } catch {}
    }
    if (!globalAudioPlayHandlerRef.current) {
      const handler: EventListener = () => {
        const a = getGameAudio();
        if (!a.paused) {
          try { ga.pause(); } catch {}
        }
      };
      ga.addEventListener("play", handler);
      globalAudioPlayHandlerRef.current = handler;
    }
  };

  // Auto-start first game track when entering /learn (Parking redirect enabled)
  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/learn")) {
      const firstIdx = items.findIndex(g => g.id === "sorting-sprint");
      if (firstIdx >= 0) {
        try { getGlobalAudio().pause(); } catch {}
        ensureGlobalPlayerPaused();
        const a = getGameAudio();
        a.loop = true;
        a.src = items[firstIdx].track.src;
        a.currentTime = 0;
        a.play().then(() => setLastPlayed(firstIdx)).catch(() => {
          const retry = () => { a.play().catch(() => {}); window.removeEventListener("pointerdown", retry); };
          window.addEventListener("pointerdown", retry, { once: true } as AddEventListenerOptions);
        });
      }
    } else if (pathname === "/") {
      const ga = getGlobalAudio();
      try { ga.play().catch(() => {}); } catch {}
      try { getGameAudio().pause(); } catch {}
    }
  }, [pathname, items]);
  const playForIndex = (idx: number, opts?: { fromNav?: boolean }) => {
    const fromNav = opts?.fromNav === true;
    const g = items[idx];
    if (!g) return;
    // For the first game, trigger camera -> license flow instead of immediate redirect
    if (g.id === "sorting-sprint" && !fromNav) {
      setShowCam(true);
      return;
    }
    ensureGlobalPlayerPaused();
    const a = getGameAudio();
    a.loop = true;
    a.volume = gameVolume;
    a.src = g.track.src;
    a.currentTime = 0;
    a.play().catch(() => {});
  setLastPlayed(idx);
  };

  // Handle pausing current slide's music when leaving and resuming when returning
  const handleSlideChange = (prevIdx: number, nextIdx: number) => {
    try {
      const a = getGameAudio();
      // If the slide we're leaving is the one currently playing, pause and save time
      if (lastPlayed === prevIdx && !a.paused) {
        const t = isFinite(a.currentTime) ? a.currentTime : 0;
        resumeTimesRef.current.set(prevIdx, t);
        a.pause();
        setLastPlayed(null);
      }
      // If we're returning to a slide with a saved time, resume its designated track
      const resumeTime = resumeTimesRef.current.get(nextIdx);
      if (resumeTime !== undefined) {
        ensureGlobalPlayerPaused();
        a.loop = true;
        a.volume = gameVolume;
        a.src = items[nextIdx].track.src;
        a.currentTime = resumeTime || 0;
        a.play().catch(() => {});
        setLastPlayed(nextIdx);
        resumeTimesRef.current.delete(nextIdx);
      }
    } catch {}
  };

  const go = (dir: 1 | -1) => {
    setActive((i) => {
      const nxt = Math.max(0, Math.min(items.length - 1, i + dir));
      handleSlideChange(i, nxt);
      if (items[nxt]?.id === "sorting-sprint" && !resumeTimesRef.current.has(nxt)) {
        playForIndex(nxt, { fromNav: true });
      }
      return nxt;
    });
  };
  const goTo = (idx: number) => {
    setActive((i) => {
      const nxt = Math.max(0, Math.min(items.length - 1, idx));
      handleSlideChange(i, nxt);
      if (items[nxt]?.id === "sorting-sprint" && !resumeTimesRef.current.has(nxt)) {
        playForIndex(nxt, { fromNav: true });
      }
      return nxt;
    });
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
                  <span className={`h-2 w-2 rounded-full ${lastPlayed === i ? "bg-green-300" : "bg-white/40"}`} />
                  {lastPlayed === i ? `Now Playing: ${items[i].track.title}` : "Tap Next/Prev"}
                  {lastPlayed === i && (
                    <div className="ml-3 flex items-center gap-1">
                      <input
                        aria-label="Game volume"
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(gameVolume * 100)}
                        onChange={(e) => setGameVolume(Number(e.target.value) / 100)}
                        className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/30 accent-sky-500"
                      />
                      <span className="text-[10px] font-semibold tabular-nums">{Math.round(gameVolume * 100)}%</span>
                    </div>
                  )}
                </div>
                <div className="mt-5 flex items-center justify-center">
                  <button
                    onClick={() => { try { playSfx("/button_click.mp3", 0.6); } catch {} ; playForIndex(i); }}
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
          onClick={() => { try { playSfx("/previous.mp3", 0.65); } catch {}; go(-1); }}
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
          onClick={() => { try { playSfx("/next.mp3", 0.65); } catch {}; go(1); }}
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
        onSave={async (data) => {
          // Save license first visually: close iris, then show loader, then change route.
          setShowLicense(false);
          // Capture a center point for iris
          try { setIrisPoint(window.innerWidth / 2, window.innerHeight / 2); } catch {}
          irisRef.current?.start({
            durationMs: 650,
            mode: "close",
            onDone: () => {
              // After close completes: start audio + loader + async uploads, then navigate and let parking page open iris.
              const firstIdx = items.findIndex((g) => g.id === "sorting-sprint");
              if (firstIdx >= 0) {
                ensureGlobalPlayerPaused();
                const a = getGameAudio();
                a.loop = true;
                a.volume = gameVolume;
                a.src = items[firstIdx].track.src;
                a.currentTime = 0;
                a.play().catch(() => {});
                setLastPlayed(firstIdx);
              }
              setShowLoader(true);
              // Fire-and-forget uploads while loader shows
              (async () => {
                try {
                  if (licensePhoto) {
                    const photo = await uploadImageDataUrl(licensePhoto, { folder: "licenses", makePublic: true });
                    console.log("Uploaded license photo:", photo);
                  }
                  if (data.signatureDataUrl) {
                    const sig = await uploadImageDataUrl(data.signatureDataUrl, { folder: "signatures", makePublic: true });
                    console.log("Uploaded signature:", sig);
                  }
                } catch (e) { console.error("Upload failed:", e); }
              })();
              // Keep loader visible for ~2.3s before navigating to the game
              setTimeout(() => {
                try { router.push("/learn/parking"); } catch {}
              }, 2300);
            }
          });
        }}
      />
      {/* Iris overlay for transitions */}
      <IrisTransition ref={irisRef} zIndex={1600} />
      {/* Loading overlay displayed after "Save & Continue" before navigating */}
      <LoadingOverlay active={showLoader} zIndex={1700} />
    </section>
  );
}
