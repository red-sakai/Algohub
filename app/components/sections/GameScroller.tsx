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
      src: "/game-selector-audio/Pokemon FireRed - Route 1.mp3",
    },
    cover: "/images/game-covers/stack-em-queue.png",
  },
  {
    id: "pinball",
    title: "Binary Tree Traversal Pinball",
    desc: "Launch the pinball through your binary tree! Learn preorder, inorder, and postorder traversals in this 3D arcade experience.",
    colorFrom: "from-purple-500",
    colorTo: "to-pink-500",
    track: {
      title: "Arcade Vibes",
      src: "/game-selector-audio/Pokemon FireRed - Route 1.mp3",
    },
    cover: "/game-selector-bg/pinball.gif",
  },
  {
    id: "nodequest",
    title: "Node Quest",
    desc: "Fight through a dark dungeon with customizable enemy levels! Choose your character, set enemy levels (10-30), and battle your way through. Level up by defeating enemies of your level.",
    colorFrom: "from-orange-600",
    colorTo: "to-amber-700",
    track: {
      title: "DuckTales - The Moon Theme",
      src: "/game-selector-audio/bg_music.mp3",
    },
    cover: "/game-selector-bg/nodequest.gif",
  },
  {
    id: "dp-dungeon",
    title: "CRITICAL MIGRATION: Server Maintenance Night",
    desc: "Critical Migration is the Tower of Hanoi re-imagined as a server maintenance game, where you reorder processes to fix a corrupted stack.",
    colorFrom: "from-sky-500",
    colorTo: "to-indigo-500",
    track: {
      title: "Aylex - Tension Rising",
      src: "/game-selector-audio/Aylex - Tension Rising.mp3",
    },
    cover: "/images/game-covers/critical.png",
  },
];

export default function GameScroller() {
  const items = useMemo(() => GAMES, []);
  const [active, setActive] = useState(0);
  const [layoutMode, setLayoutMode] = useState<"simplified" | "gamified">(
    "simplified",
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
    // For pinball game, navigate directly with iris transition
    if (g.id === "pinball") {
      ensureGlobalPlayerPaused();
      try {
        setIrisPoint(window.innerWidth / 2, window.innerHeight / 2);
      } catch {}
      const beginPinballTransfer = () => {
        const a = getGameAudio();
        a.loop = true;
        a.volume = gameVolume;
        a.src = g.track.src;
        a.currentTime = 0;
        a.play().catch(() => {});
        setLastPlayed(idx);
        try {
          router.push("/learn/pinball");
        } catch {}
      };
      const controller = irisRef.current;
      if (controller) {
        controller.start({
          durationMs: 650,
          mode: "close",
          showLoaderOnClose: false,
          onDone: () => beginPinballTransfer(),
        });
      } else {
        beginPinballTransfer();
      }
      return;
    }
    // For Node Quest, navigate directly to the game
    if (g.id === "nodequest") {
      if (!fromNav) {
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
      } else {
        ensureGlobalPlayerPaused();
        const a = getGameAudio();
        a.loop = true;
        a.volume = gameVolume;
        a.src = g.track.src;
        a.currentTime = 0;
        a.play().catch(() => {});
        setLastPlayed(idx);
      }
      return;
    }
    // For CRITICAL MIGRATION (dp-dungeon), play its track and navigate with iris transition
    if (g.id === "dp-dungeon") {
      if (!fromNav) {
        ensureGlobalPlayerPaused();
        try {
          setIrisPoint(window.innerWidth / 2, window.innerHeight / 2);
        } catch {}
        const beginCriticalTransfer = () => {
          const a = getGameAudio();
          a.loop = true;
          a.volume = Math.min(1, gameVolume * 5);
          a.src = g.track.src;
          a.currentTime = 0;
          a.play().catch(() => {});
          setLastPlayed(idx);
          try {
            router.push("/learn/tower-of-hanoi");
          } catch {}
        };
        const controller = irisRef.current;
        if (controller) {
          controller.start({
            durationMs: 650,
            mode: "close",
            showLoaderOnClose: false,
            onDone: () => beginCriticalTransfer(),
          });
        } else {
          beginCriticalTransfer();
        }
      } else {
        ensureGlobalPlayerPaused();
        const a = getGameAudio();
        a.loop = true;
        a.volume = Math.min(1, gameVolume * 5);
        a.src = g.track.src;
        a.currentTime = 0;
        a.play().catch(() => {});
        setLastPlayed(idx);
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
        (items[nxt]?.id === "sorting-sprint" ||
          items[nxt]?.id === "nodequest" ||
          items[nxt]?.id === "dp-dungeon") &&
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
        (items[nxt]?.id === "sorting-sprint" ||
          items[nxt]?.id === "nodequest" ||
          items[nxt]?.id === "dp-dungeon") &&
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
    <>
      {/* Nosifer font for CRITICAL MIGRATION */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nosifer&display=swap');`}</style>
      {/* Pixelify Sans font for Node Quest */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;600;700&display=swap');`}</style>
      <section className="relative z-10 h-[100dvh] w-full overflow-hidden">
        {isGamified && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {items.map((game, idx) => {
              const isStackEmQueue = game.id === "sorting-sprint";
              const isCritical = game.id === "dp-dungeon";
              const isNodeQuest = game.id === "nodequest";
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
                  ) : isCritical ? (
                    <Image
                      className="h-full w-full object-cover"
                      src="/game-selector-bg/recursionbg.gif"
                      alt="DP Dungeon background"
                      width={1920}
                      height={1080}
                      unoptimized
                    />
                  ) : isNodeQuest ? (
                    <Image
                      className="h-full w-full object-cover"
                      src="/game-selector-bg/nodequest.gif"
                      alt="Node Quest background"
                      width={1920}
                      height={1080}
                      unoptimized
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
                ) : g.id === "pinball" ? (
                  <img
                    className="absolute inset-0 h-full w-full object-cover"
                    src="/game-selector-bg/pinball.gif"
                    alt="Pinball background"
                    style={{ zIndex: 0 }}
                  />
                ) : g.id === "nodequest" ? (
                  <Image
                    className="absolute inset-0 h-full w-full object-cover"
                    src="/game-selector-bg/nodequest.gif"
                    alt="Node Quest background"
                    width={1920}
                    height={1080}
                    unoptimized
                    style={{ zIndex: 0 }}
                  />
                ) : g.id === "dp-dungeon" ? (
                  <Image
                    className="absolute inset-0 h-full w-full object-cover"
                    src="/game-selector-bg/recursionbg.gif"
                    alt="DP Dungeon background"
                    width={1920}
                    height={1080}
                    unoptimized
                    style={{ zIndex: 0 }}
                  />
                ) : (
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${g.colorFrom} ${g.colorTo} opacity-90`}
                  />
                )}
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10 flex h-full w-full items-center justify-center p-6 text-center drop-shadow-lg">
                  <div className="mx-auto max-w-3xl">
                    {g.id === "dp-dungeon" ? (
                      <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl font-scary text-red-600 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        <span
                          style={{
                            fontFamily: "Nosifer, cursive",
                            display: "inline-block",
                          }}
                        >
                          CRITICAL MIGRATION
                        </span>
                        <br />
                        <span
                          className="text-lg sm:text-xl md:text-2xl text-white font-normal align-top"
                          style={{
                            marginTop: "-0.1em",
                            display: "inline-block",
                            fontFamily: "Arial, Helvetica, sans-serif",
                            letterSpacing: "0.01em",
                          }}
                        >
                          Server Maintenance Night
                        </span>
                      </h2>
                    ) : g.id === "nodequest" ? (
                      <div className="flex flex-col items-center gap-3">
                        <Image
                          src="/sprite/title.png"
                          alt="Node Quest"
                          width={896}
                          height={224}
                          className="w-full max-w-2xl h-auto drop-shadow-[0_0_30px_rgba(255,180,0,0.5)]"
                          style={{ imageRendering: "pixelated" }}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                        <span
                          className={
                            g.id === "sorting-sprint"
                              ? "inline-block -rotate-1 italic tracking-wide drop-shadow-sm"
                              : undefined
                          }
                        >
                          {g.title}
                        </span>
                      </h2>
                    )}
                    <p
                      className="mx-auto mt-3 max-w-prose text-base text-white/90 sm:text-lg md:text-xl"
                      style={
                        g.id === "nodequest"
                          ? { fontFamily: "'Pixelify Sans', monospace" }
                          : undefined
                      }
                    >
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
                      {(lastPlayed === i ||
                        (g.id === "dp-dungeon" && active === i)) && (
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
          <div className="relative z-10 flex h-full w-full flex-col justify-between px-4 py-8 text-white sm:px-8 sm:py-10">
            <div className="mx-auto w-full max-w-5xl space-y-3 text-center">
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.45em] text-white/70">
                Featured Game
              </p>
              <h2
                className={`text-4xl font-black sm:text-5xl md:text-6xl ${
                  activeGame.id === "sorting-sprint" ? "" : ""
                }`}
              >
                <span
                  className={
                    activeGame.id === "sorting-sprint"
                      ? "inline-block -rotate-1 italic tracking-wide drop-shadow-sm"
                      : undefined
                  }
                >
                  {activeGame.title}
                </span>
              </h2>
              <p
                className="mx-auto max-w-3xl text-base text-white/85 sm:text-lg md:text-xl"
                style={
                  activeGame.id === "nodequest"
                    ? { fontFamily: "'Pixelify Sans', monospace" }
                    : undefined
                }
              >
                {activeGame.desc}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.35em] text-white/60">
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

            <div className="relative mx-auto flex h-[420px] w-full max-w-6xl items-center justify-center overflow-visible px-4 sm:h-[460px]">
              {items.map((game, idx) => {
                const total = items.length || 1;
                let offset = idx - active;
                if (offset > total / 2) offset -= total;
                if (offset < -total / 2) offset += total;

                // Only render cards that are close to active position
                if (Math.abs(offset) > 2) return null;

                const translate = offset * 420;
                const scale = idx === active ? 1 : 0.85;
                const opacity = Math.max(0, 1 - Math.abs(offset) * 0.4);
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
                    className={`absolute left-1/2 top-1/2 w-[360px] rounded-2xl border bg-white/10 p-5 text-left backdrop-blur-xl transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:w-[400px] sm:p-6 ${
                      idx === active
                        ? "border-white/50 shadow-[0_25px_60px_rgba(0,0,0,0.6)] ring-2 ring-white/70 cursor-default"
                        : "border-white/20 shadow-[0_15px_40px_rgba(0,0,0,0.4)] cursor-pointer hover:border-white/30"
                    }`}
                    style={{
                      transform: `translate(calc(-50% + ${translate}px), -50%) scale(${scale})`,
                      opacity,
                      zIndex: 100 - Math.abs(offset),
                    }}
                  >
                    <div
                      className="relative overflow-hidden rounded-xl border border-white/15 bg-black/40"
                      style={{ aspectRatio: "16 / 10" }}
                    >
                      {game.cover.endsWith(".gif") ? (
                        <img
                          src={game.cover}
                          alt={`${game.title} cover art`}
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      ) : (
                        <Image
                          src={game.cover}
                          alt={`${game.title} cover art`}
                          fill
                          className="object-contain"
                          sizes="(min-width: 1024px) 380px, 60vw"
                        />
                      )}
                    </div>
                    <p className="mt-3 text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-white/60">
                      {idx === active ? "Selected" : "Preview"}
                    </p>
                    <h3 className="mt-2 text-2xl font-black">
                      <span
                        className={
                          game.id === "sorting-sprint"
                            ? "inline-block -rotate-1 italic tracking-wide drop-shadow-sm"
                            : undefined
                        }
                      >
                        {game.title}
                      </span>
                    </h3>
                    <p
                      className="mt-2 text-sm text-white/80"
                      style={
                        game.id === "nodequest"
                          ? { fontFamily: "'Pixelify Sans', monospace" }
                          : undefined
                      }
                    >
                      {game.desc}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/65">
                      <span>OST</span>
                      <span className="text-white/90">{game.track.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-4 text-center text-white">
              {activeGame.id === "sorting-sprint" && licensePhoto && (
                <div className="text-xs uppercase tracking-[0.3em] text-white/70">
                  License photo saved.
                </div>
              )}
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
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
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
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
              </svg>
            </button>
          </div>
        )}

        {/* Optional dot indicators */}
        {isGamified ? (
          <div className="pointer-events-none absolute left-1/2 bottom-20 flex -translate-x-1/2 gap-2.5 sm:bottom-24">
            {items.map((_, i) => (
              <button
                key={`dot-g-${i}`}
                onClick={() => goTo(i)}
                className={`pointer-events-auto h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                  i === active
                    ? "bg-white w-8 ring-2 ring-white/40"
                    : "bg-white/50 hover:bg-white/70 ring-1 ring-white/20"
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
                  new CustomEvent(LICENSE_EVENT, {
                    detail: data.licenseCardPath,
                  }),
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
              const firstIdx = items.findIndex(
                (g) => g.id === "sorting-sprint",
              );
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
                    const sig = await uploadImageDataUrl(
                      data.signatureDataUrl,
                      {
                        folder: "signatures",
                        makePublic: true,
                      },
                    );
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
    </>
  );
}
