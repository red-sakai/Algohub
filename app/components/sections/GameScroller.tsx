"use client";
import Image from "next/image";
import { useEffect } from "@/hooks/useEffect";
import { useMemo } from "@/hooks/useMemo";
import { useRef } from "@/hooks/useRef";
import { useState } from "@/hooks/useState";
import { usePathname, useRouter } from "next/navigation";
import { getGlobalAudio } from "../../../lib/audio/audioSingleton";
import { getGameAudio } from "../../../lib/audio/gameAudio";
import CameraCaptureModal from "../ui/CameraCaptureModal";
import LicenseCardModal from "../ui/LicenseCardModal";
import IrisTransition, { IrisHandle } from "../ui/IrisTransition";
import { setIrisPoint } from "../../../lib/transition/transitionBus";
import { uploadImageDataUrl } from "@/lib/supabase/uploadImage";
import { playSfx } from "../../../lib/audio/sfx";
import {
  GLOBAL_LOADER_MIN_MS,
  showGlobalLoader,
} from "@/lib/transition/globalLoaderBus";

const LICENSE_STORAGE_KEY = "algohub-license-card-path";
const LICENSE_EVENT = "algohub-license-card-updated";

type Game = {
  id: string;
  title: string;
  desc: string;
  colorFrom: string;
  colorTo: string;
  track: { title: string; src: string };
  cover: string;
};

const GAMES: Game[] = [
  {
    id: "sorting-sprint",
    title: "Stack 'Em Queue",
    desc: "Jump into the 3D parking yard and master stacks and queues to shuffle cars into place.",
    colorFrom: "from-fuchsia-500",
    colorTo: "to-rose-500",
    track: {
      title: "Pokemon FireRed - Route 1",
      src: "/audio/Pokemon FireRed - Route 1.mp3",
    },
    cover: "/images/game-covers/stack-em-queue.png",
  },
  {
    id: "dungeon-explorer",
    title: "Dungeon Explorer",
    desc: "Fight through a dark dungeon with customizable enemy levels! Choose your character, set enemy levels (10-11), and battle your way through. Level up by defeating enemies of your level.",
    colorFrom: "from-purple-600",
    colorTo: "to-indigo-600",
    track: {
      title: "DuckTales - The Moon Theme",
      src: "/audio/DuckTales Music (NES) - The Moon Theme.mp3",
    },
    cover: "/images/game-covers/dungeon-explorer.svg",
  },
  {
    id: "graph-quest",
    title: "Graph Quest",
    desc: "Coming soon.",
    colorFrom: "from-emerald-500",
    colorTo: "to-teal-500",
    track: { title: "Ambient Loop", src: "/audio/ambient-loop.mp3" },
    cover: "/images/game-covers/graph-quest.svg",
  },
  {
    id: "dp-dungeon",
    title: "DP Dungeon",
    desc: "Coming soon.",
    colorFrom: "from-sky-500",
    colorTo: "to-indigo-500",
    track: { title: "AlgoHub Theme", src: "/audio/algohub-theme.mp3" },
    cover: "/images/game-covers/dp-dungeon.svg",
  },
  {
    id: "tree-trek",
    title: "Tree Trek",
    desc: "Coming soon.",
    colorFrom: "from-amber-500",
    colorTo: "to-orange-500",
    track: { title: "Ambient Loop", src: "/audio/ambient-loop.mp3" },
    cover: "/images/game-covers/tree-trek.svg",
  },
];

export default function GameScroller() {
  const items = useMemo(() => GAMES, []);
  const [active, setActive] = useState(0);
  const [layoutMode, setLayoutMode] = useState<"simplified" | "gamified">(
    "simplified"
  );
  const [lastPlayed, setLastPlayed] = useState<number | null>(null);
  const pausedPlayerPrevRef = useRef(false);
  const globalAudioPlayHandlerRef = useRef<EventListener | null>(null);
  // Remember per-slide resume times when user navigates away
  const resumeTimesRef = useRef<Map<number, number>>(new Map());
  const [showCam, setShowCam] = useState(false);
  const [licensePhoto, setLicensePhoto] = useState<string | null>(null);
  const [showLicense, setShowLicense] = useState(false);
  const irisRef = useRef<IrisHandle | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const loaderDelayRef = useRef<number | null>(null);

  // Cleanup on unmount (stop game audio only; let global resume naturally on landing page)
  useEffect(() => {
    return () => {
      try {
        getGameAudio().pause();
      } catch {}
      const ga = getGlobalAudio();
      if (globalAudioPlayHandlerRef.current) {
        ga.removeEventListener("play", globalAudioPlayHandlerRef.current);
        globalAudioPlayHandlerRef.current = null;
      }
      // Do not forcibly pause global audio here so landing page MusicPlayer can continue.
      pausedPlayerPrevRef.current = false;
      if (loaderDelayRef.current !== null) {
        clearTimeout(loaderDelayRef.current);
        loaderDelayRef.current = null;
      }
    };
  }, []);

  // Game volume slider state (persisted)
  const GAME_VOL_KEY = "algohub_game_volume_v1";
  const [gameVolume, setGameVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 0.8;
    try {
      const raw = localStorage.getItem(GAME_VOL_KEY);
      if (raw) return Math.max(0, Math.min(1, parseFloat(raw)));
    } catch {}
    return 0.8;
  });
  useEffect(() => {
    try {
      localStorage.setItem(GAME_VOL_KEY, String(gameVolume));
    } catch {}
  }, [gameVolume]);
  useEffect(() => {
    try {
      const a = getGameAudio();
      a.volume = gameVolume;
    } catch {}
  }, [gameVolume]);

  const ensureGlobalPlayerPaused = () => {
    const ga = getGlobalAudio();
    if (!ga.paused) {
      pausedPlayerPrevRef.current = true;
      try {
        ga.pause();
      } catch {}
    }
    if (!globalAudioPlayHandlerRef.current) {
      const handler: EventListener = () => {
        const a = getGameAudio();
        if (!a.paused) {
          try {
            ga.pause();
          } catch {}
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
      const firstIdx = items.findIndex((g) => g.id === "sorting-sprint");
      if (firstIdx >= 0) {
        try {
          getGlobalAudio().pause();
        } catch {}
        ensureGlobalPlayerPaused();
        const a = getGameAudio();
        a.loop = true;
        a.src = items[firstIdx].track.src;
        a.currentTime = 0;
        a.play()
          .then(() => setLastPlayed(firstIdx))
          .catch(() => {
            const retry = () => {
              a.play().catch(() => {});
              window.removeEventListener("pointerdown", retry);
            };
            window.addEventListener("pointerdown", retry, {
              once: true,
            } as AddEventListenerOptions);
          });
      }
    } else if (pathname === "/") {
      const ga = getGlobalAudio();
      try {
        ga.play().catch(() => {});
      } catch {}
      try {
        getGameAudio().pause();
      } catch {}
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
    // For dungeon explorer, navigate directly to the game
    if (g.id === "dungeon-explorer") {
      ensureGlobalPlayerPaused();
      try {
        setIrisPoint(window.innerWidth / 2, window.innerHeight / 2);
      } catch {}
      const beginDungeonTransfer = () => {
        const a = getGameAudio();
        a.loop = true;
        a.volume = gameVolume;
        a.src = g.track.src;
        a.currentTime = 0;
        a.play().catch(() => {});
        setLastPlayed(idx);
        try {
          router.push("/learn/dungeon");
        } catch {}
      };
      const controller = irisRef.current;
      if (controller) {
        controller.start({
          durationMs: 650,
          mode: "close",
          showLoaderOnClose: false,
          onDone: () => beginDungeonTransfer(),
        });
      } else {
        beginDungeonTransfer();
      }
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

  const resolveIndex = (target: number) => {
    if (!items.length) return 0;
    if (layoutMode === "gamified") {
      const total = items.length;
      const wrapped = ((target % total) + total) % total;
      return wrapped;
    }
    return Math.max(0, Math.min(items.length - 1, target));
  };

  const go = (dir: 1 | -1) => {
    setActive((i) => {
      const nxt = resolveIndex(i + dir);
      handleSlideChange(i, nxt);
      if (
        items[nxt]?.id === "sorting-sprint" &&
        !resumeTimesRef.current.has(nxt)
      ) {
        playForIndex(nxt, { fromNav: true });
      }
      return nxt;
    });
  };
  const goTo = (idx: number) => {
    setActive((i) => {
      const nxt = resolveIndex(idx);
      handleSlideChange(i, nxt);
      if (
        items[nxt]?.id === "sorting-sprint" &&
        !resumeTimesRef.current.has(nxt)
      ) {
        playForIndex(nxt, { fromNav: true });
      }
      return nxt;
    });
  };
  const isGamified = layoutMode === "gamified";
  const activeGame = items[active] ?? items[0];
  const handleToggleLayout = (mode: "simplified" | "gamified") => {
    if (layoutMode === mode) return;
    try {
      playSfx("/button_click.mp3", 0.4);
    } catch {}
    setLayoutMode(mode);
  };

  return (
    <section className="relative z-10 h-[100dvh] w-full overflow-hidden">
      {isGamified && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {items.map((game, idx) => {
            const isStackEmQueue = game.id === "sorting-sprint";
            return (
              <div
                key={`bg-${game.id}`}
                className="absolute inset-0 transition-opacity duration-700 ease-out"
                style={{
                  opacity: active === idx ? 1 : 0,
                  zIndex: active === idx ? 2 : 1,
                }}
              >
                {isStackEmQueue ? (
                  <video
                    className="h-full w-full object-cover"
                    src="/game-selector-bg/stack 'em queue.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                  />
                ) : (
                  <div
                    className={`h-full w-full bg-gradient-to-br ${game.colorFrom} ${game.colorTo}`}
                  />
                )}
                <div className="absolute inset-0 bg-black/30" />
              </div>
            );
          })}
        </div>
      )}

      <div className="absolute right-4 top-4 z-20 text-white">
        <div className="group relative inline-flex">
          <button
            type="button"
            aria-label="Toggle layout options"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-black/60 ring-1 ring-white/25 backdrop-blur transition hover:bg-black/80"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="6" height="6" rx="1.25" />
              <rect x="15" y="3" width="6" height="6" rx="1.25" />
              <rect x="3" y="15" width="6" height="6" rx="1.25" />
              <rect x="15" y="15" width="6" height="6" rx="1.25" />
            </svg>
          </button>
          <div className="pointer-events-none absolute right-0 top-[calc(100%+0.5rem)] w-52 rounded-2xl bg-black/85 p-4 opacity-0 shadow-2xl ring-1 ring-white/20 backdrop-blur-xl transition duration-200 ease-out translate-y-1 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <p className="text-[0.5rem] font-semibold uppercase tracking-[0.4em] text-white/55">
              Layout
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {(["simplified", "gamified"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleToggleLayout(mode)}
                  className={`inline-flex w-full items-center justify-between rounded-2xl px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] transition ${
                    layoutMode === mode
                      ? "bg-white text-black"
                      : "bg-white/10 text-white/75 hover:bg-white/20"
                  }`}
                  aria-pressed={layoutMode === mode}
                >
                  {mode === "simplified" ? "Simplified" : "Gamified"}
                  <span className="text-[0.5rem] tracking-[0.3em] text-white/60">
                    {layoutMode === mode ? "Active" : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!isGamified && (
        <div
          className="h-full w-full will-change-transform"
          style={{
            transform: `translate3d(0, ${-active * 100}dvh, 0)`,
            transition: "transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          {items.map((g, i) => (
            <div
              key={g.id}
              className="relative h-[100dvh] w-full overflow-hidden"
            >
              {g.id === "sorting-sprint" ? (
                <video
                  className="absolute inset-0 h-full w-full object-cover"
                  src="/game-selector-bg/stack 'em queue.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                />
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${g.colorFrom} ${g.colorTo} opacity-90`}
                />
              )}
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10 flex h-full w-full items-center justify-center p-6 text-center drop-shadow-lg">
                <div className="mx-auto max-w-3xl">
                  <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                    {g.title}
                  </h2>
                  <p className="mx-auto mt-3 max-w-prose text-base text-white/90 sm:text-lg md:text-xl">
                    {g.desc}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/25">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        lastPlayed === i ? "bg-green-300" : "bg-white/40"
                      }`}
                    />
                    {lastPlayed === i
                      ? `Now Playing: ${items[i].track.title}`
                      : "Tap Next/Prev"}
                    {lastPlayed === i && (
                      <div className="ml-3 flex items-center gap-1">
                        <input
                          aria-label="Game volume"
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(gameVolume * 100)}
                          onChange={(e) =>
                            setGameVolume(Number(e.target.value) / 100)
                          }
                          className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/30 accent-sky-500"
                        />
                        <span className="text-[10px] font-semibold tabular-nums">
                          {Math.round(gameVolume * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-center">
                    <button
                      onClick={() => {
                        try {
                          playSfx("/button_click.mp3", 0.6);
                        } catch {}
                        playForIndex(i);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-base font-extrabold tracking-wide text-white shadow-[0_8px_0_0_rgb(2,132,199)] ring-1 ring-white/20 transition-all duration-200 hover:translate-y-[1px] hover:shadow-[0_6px_0_0_rgb(2,132,199)] hover:scale-[1.02] active:translate-y-[3px] active:shadow-[0_3px_0_0_rgb(2,132,199)]"
                      aria-label={`Play ${g.title}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </button>
                  </div>
                  {g.id === "sorting-sprint" && licensePhoto && (
                    <div className="mt-4 text-center text-xs text-white/80">
                      License photo saved.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isGamified && (
        <div className="relative z-10 flex h-full w-full flex-col justify-between px-4 py-10 text-white sm:px-8 sm:py-12">
          <div className="mx-auto w-full max-w-5xl space-y-3 pb-4 text-center sm:text-left">
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.45em] text-white/70">
              Featured Game
            </p>
            <h2 className="text-4xl font-black sm:text-5xl md:text-6xl">
              {activeGame.title}
            </h2>
            <p className="text-base text-white/85 sm:text-lg md:text-xl">
              {activeGame.desc}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.35em] text-white/60 sm:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/30">
                <span
                  className={`h-2 w-2 rounded-full ${
                    lastPlayed === active ? "bg-green-300" : "bg-white/40"
                  }`}
                />
                {lastPlayed === active ? "Now Playing" : "Ready"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">
                OST · {activeGame.track.title}
              </span>
            </div>
          </div>

          <div className="relative mx-auto mt-69 h-[320px] w-full max-w-5xl sm:mt-72 sm:h-[360px]">
            {items.map((game, idx) => {
              const total = items.length || 1;
              let offset = idx - active;
              if (offset > total / 2) offset -= total;
              if (offset < -total / 2) offset += total;
              const translate = offset * 230;
              const scale = Math.max(0.75, 1 - Math.abs(offset) * 0.12);
              const opacity = Math.max(0.35, 1 - Math.abs(offset) * 0.18);
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => goTo(idx)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      goTo(idx);
                    }
                  }}
                  aria-current={idx === active}
                  className={`absolute left-1/2 top-1/2 w-[70vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/20 bg-white/10 p-6 text-left backdrop-blur-xl transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                    idx === active
                      ? "shadow-[0_25px_60px_rgba(15,23,42,0.55)] ring-2 ring-white/70"
                      : "shadow-[0_15px_35px_rgba(15,23,42,0.35)]"
                  }`}
                  style={{
                    transform: `translate(calc(-50% + ${translate}px), -50%) scale(${scale})`,
                    opacity,
                    zIndex: items.length - Math.abs(offset),
                  }}
                >
                  <div
                    className="relative overflow-hidden rounded-xl border border-white/15 bg-black/30"
                    style={{ aspectRatio: "400 / 260" }}
                  >
                    <Image
                      src={game.cover}
                      alt={`${game.title} cover art`}
                      fill
                      className="object-contain"
                      sizes="(min-width: 1024px) 380px, 60vw"
                    />
                  </div>
                  <p className="mt-3 text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-white/60">
                    {idx === active ? "Selected" : "Preview"}
                  </p>
                  <h3 className="mt-2 text-2xl font-black">{game.title}</h3>
                  <p className="mt-2 text-sm text-white/80">{game.desc}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/65">
                    <span>OST</span>
                    <span className="text-white/90">{game.track.title}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-3 flex w-full max-w-5xl flex-col items-center justify-between gap-4 text-center text-white sm:flex-row sm:text-left">
            <div>
              {activeGame.id === "sorting-sprint" && licensePhoto && (
                <div className="text-xs uppercase tracking-[0.3em] text-white/70">
                  License photo saved.
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  try {
                    playSfx("/button_click.mp3", 0.6);
                  } catch {}
                  playForIndex(active);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/90 px-5 py-2.5 text-base font-extrabold tracking-wide text-black shadow-[0_8px_0_0_rgba(255,255,255,0.4)] transition hover:-translate-y-0.5"
                aria-label={`Play ${activeGame.title}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prev/Next controls */}
      {!isGamified && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex items-center justify-center gap-4 transition-all sm:bottom-8">
          <button
            onClick={() => {
              try {
                playSfx("/previous.mp3", 0.65);
              } catch {}
              go(-1);
            }}
            disabled={active === 0}
            className="pointer-events-auto inline-grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/20 backdrop-blur-md transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-black/60"
            aria-label="Previous game"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <div className="pointer-events-auto select-none rounded-full bg-black/40 px-3 py-1 text-sm font-semibold ring-1 ring-white/20 text-white/90">
            {active + 1} / {items.length}
          </div>
          <button
            onClick={() => {
              try {
                playSfx("/next.mp3", 0.65);
              } catch {}
              go(1);
            }}
            disabled={active === items.length - 1}
            className="pointer-events-auto inline-grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/20 backdrop-blur-md transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-black/60"
            aria-label="Next game"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
            </svg>
          </button>
        </div>
      )}

      {/* Optional dot indicators */}
      {isGamified ? (
        <div className="pointer-events-none absolute left-1/2 bottom-20 flex -translate-x-1/2 gap-3 sm:bottom-24">
          {items.map((_, i) => (
            <button
              key={`dot-g-${i}`}
              onClick={() => goTo(i)}
              className={`pointer-events-auto h-3.5 w-3.5 rounded-full ring-1 ring-white/25 transition ${
                i === active ? "bg-white" : "bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to game ${i + 1}`}
            />
          ))}
        </div>
      ) : (
        <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
          {items.map((_, i) => (
            <button
              key={`dot-s-${i}`}
              onClick={() => goTo(i)}
              className={`pointer-events-auto h-2.5 w-2.5 rounded-full ring-1 ring-white/25 transition ${
                i === active ? "bg-white" : "bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to game ${i + 1}`}
            />
          ))}
        </div>
      )}

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
          if (data.licenseCardPath) {
            try {
              localStorage.setItem(LICENSE_STORAGE_KEY, data.licenseCardPath);
              window.dispatchEvent(
                new CustomEvent(LICENSE_EVENT, { detail: data.licenseCardPath })
              );
            } catch {}
          }
          // Capture a center point for iris
          try {
            setIrisPoint(window.innerWidth / 2, window.innerHeight / 2);
          } catch {}
          const beginParkingTransfer = (loaderVisible: boolean) => {
            if (!loaderVisible) {
              showGlobalLoader();
            }
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
            (async () => {
              try {
                if (licensePhoto) {
                  const photo = await uploadImageDataUrl(licensePhoto, {
                    folder: "licenses",
                    makePublic: true,
                  });
                  console.log("Uploaded license photo:", photo);
                }
                if (data.signatureDataUrl) {
                  const sig = await uploadImageDataUrl(data.signatureDataUrl, {
                    folder: "signatures",
                    makePublic: true,
                  });
                  console.log("Uploaded signature:", sig);
                }
              } catch (e) {
                console.error("Upload failed:", e);
              }
            })();
            if (loaderDelayRef.current !== null) {
              clearTimeout(loaderDelayRef.current);
            }
            loaderDelayRef.current = window.setTimeout(() => {
              try {
                router.push("/learn/parking");
              } catch {}
              loaderDelayRef.current = null;
            }, GLOBAL_LOADER_MIN_MS);
          };

          const controller = irisRef.current;
          if (controller) {
            controller.start({
              durationMs: 650,
              mode: "close",
              showLoaderOnClose: true,
              onDone: () => beginParkingTransfer(true),
            });
          } else {
            beginParkingTransfer(false);
          }
        }}
      />
      {/* Iris overlay for transitions */}
      <IrisTransition ref={irisRef} zIndex={1600} />
    </section>
  );
}
