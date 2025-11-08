"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MUSIC_BUS } from "./musicBus";
import { getGlobalAudio } from "./audioSingleton";
import { getGameAudio } from "./gameAudio";

// Default fallback playlist; real files are discovered from /api/audio
const DEFAULT_PLAYLIST = [
  { title: "AlgoHub Theme", src: "/audio/algohub-theme.mp3" },
  { title: "Ambient Loop", src: "/audio/ambient-loop.mp3" },
];

type Track = { title: string; src: string };

const STORE = "algohub_player_prefs_v1";

export default function MusicPlayer({ playlist }: { playlist?: Track[] }) {
  const pathname = usePathname();
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);
  const autoPlayRef = useRef(false);

  // UI state
  const [hoverDisc, setHoverDisc] = useState(false);
  const [hoverPanel, setHoverPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>(() => playlist ?? []);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const p = JSON.parse(raw) as { muted?: boolean };
        if (typeof p.muted === "boolean") return p.muted;
      }
    } catch {}
    return false;
  });
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 0.7;
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const p = JSON.parse(raw) as { volume?: number };
        if (typeof p.volume === "number") return Math.max(0, Math.min(1, p.volume));
      }
    } catch {}
    return 0.7;
  });
  const [loop, setLoop] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const p = JSON.parse(raw) as { loop?: boolean };
        if (typeof p.loop === "boolean") return p.loop;
      }
    } catch {}
    return false;
  });
  // (Optional) duration/time omitted to keep UI simple and avoid stutter
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Persist prefs
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = { volume, muted, loop };
    try {
      localStorage.setItem(STORE, JSON.stringify(p));
    } catch {}
  }, [volume, muted, loop]);

  // Resolve playlist (API fallback)
  const effectiveTracks = useMemo(() => (playlist?.length ? playlist : (tracks.length ? tracks : DEFAULT_PLAYLIST)), [playlist, tracks]);
  const current = useMemo(() => effectiveTracks[Math.max(0, Math.min(idx, effectiveTracks.length - 1))], [effectiveTracks, idx]);
  // Keep a ref of current src for first-interaction unlock handler
  const currentSrcRef = useRef<string | undefined>(undefined);
  useEffect(() => { currentSrcRef.current = current?.src; }, [current?.src]);

  // Fetch from API if no playlist provided; route-aware source
  useEffect(() => {
    if (playlist?.length) return;
    let cancelled = false;
    const endpoint = pathname?.startsWith("/learn/parking") ? "/api/car-radio" : "/api/audio";
    (async () => {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        const data = (await res.json()) as Track[];
        if (!cancelled) {
          const next = Array.isArray(data) && data.length ? data : DEFAULT_PLAYLIST;
          setTracks(next);
          // If switching libraries while already playing, continue playback from first item of new list
          if (playingRef.current) {
            autoPlayRef.current = true;
            setIdx(0);
          }
        }
      } catch {
        if (!cancelled) setTracks(DEFAULT_PLAYLIST);
      }
    })();
    return () => { cancelled = true; };
  }, [playlist, pathname]);

  // Keep track count in a ref for event handlers
  const lenRef = useRef(1);
  useEffect(() => {
    lenRef.current = Math.max(1, effectiveTracks.length);
  }, [effectiveTracks.length]);

  // Create and wire audio element (global singleton to survive route changes/HMR)
  useEffect(() => {
    const a = getGlobalAudio();
    audioRef.current = a;

    const onPlay = () => {
      playingRef.current = true;
      setPlaying(true);
    };
    const onPause = () => {
      playingRef.current = false;
      setPlaying(false);
    };
    const onEnded = () => {
      if (a.loop) {
        a.currentTime = 0;
        void a.play().catch(() => {});
      } else {
        // Advance to next track and keep playing
        autoPlayRef.current = true;
        setIdx((i) => (i + 1) % lenRef.current);
      }
    };
    const onError = () => setError("Audio failed to load");

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);

    return () => {
      // Do not pause on unmount; keep music playing across page remounts.
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, []);

  // Listen for external playlist change requests via the music bus
  useEffect(() => {
    const onBus = (ev: Event) => {
      const e = ev as CustomEvent<{ tracks: Track[]; index?: number }>;
      const payload = e.detail;
      if (!payload || !Array.isArray(payload.tracks) || payload.tracks.length === 0) return;
      // Update playlist and index, then request autoplay
      setTracks(payload.tracks);
      setIdx(Math.max(0, Math.min(payload.index ?? 0, payload.tracks.length - 1)));
      autoPlayRef.current = true;
      // Ensure we don't go through muted-autoplay path on first run
      autoplayTriedRef.current = true;
    };
    window.addEventListener(MUSIC_BUS.EVENT_NAME, onBus as EventListener);
    return () => window.removeEventListener(MUSIC_BUS.EVENT_NAME, onBus as EventListener);
  }, []);

  // Apply settings to audio when they change
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = muted;
  }, [muted]);
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.loop = loop;
  }, [loop]);

  // When current track changes: first time, try muted autoplay; otherwise respect play/pause
  const autoplayTriedRef = useRef(false);
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current?.src) return;
    (async () => {
      setError(null);
      if (!autoplayTriedRef.current) {
        autoplayTriedRef.current = true;
        a.src = current.src;
        try {
          a.muted = true;
          await a.play();
          setMuted(true);
          return;
        } catch {
          a.pause();
          return;
        }
      }
      a.src = current.src;
      a.currentTime = 0;
      const shouldAuto = autoPlayRef.current || playingRef.current;
      autoPlayRef.current = false;
      if (shouldAuto) {
        void a.play().catch(() => {});
      } else {
        a.pause();
      }
    })();
  }, [current?.src]);

  // On first user interaction anywhere, attempt to start or unmute playback (respect game audio priority and user mute pref)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let unlocked = false;
    const unlock = async () => {
      if (unlocked) return;
      unlocked = true;
      cleanup();
      const a = audioRef.current;
      if (!a) return;
      // If game audio is playing, respect its priority and do nothing
      try {
        const ga = getGameAudio();
        if (ga && ga.paused === false) return;
      } catch {}
      const src = currentSrcRef.current;
      if (!src) return;
      if (!a.src || a.src !== src) {
        a.src = src;
        a.currentTime = 0;
      }
      try {
        if (!mutedRef.current) {
          a.muted = false;
        } else {
          a.muted = true;
        }
        await a.play();
        if (!mutedRef.current) {
          setMuted(false);
        }
      } catch {
        // As a fallback, try muted autoplay once more
        try {
          a.muted = true;
          setMuted(true);
          await a.play();
        } catch {}
      }
    };
    const handler = () => unlock();
    window.addEventListener("pointerdown", handler, { once: true } as AddEventListenerOptions);
    window.addEventListener("keydown", handler, { once: true } as AddEventListenerOptions);
    window.addEventListener("touchstart", handler, { once: true } as AddEventListenerOptions);
    const cleanup = () => {
      window.removeEventListener("pointerdown", handler as EventListener);
      window.removeEventListener("keydown", handler as EventListener);
      window.removeEventListener("touchstart", handler as EventListener);
    };
    return cleanup;
  }, []);

  // Route-aware resume: when returning to landing page (/), try to resume global music automatically
  useEffect(() => {
    if (!pathname) return;
    if (pathname !== "/") return;
    const a = audioRef.current;
    if (!a) return;
    // If game audio is playing, don't fight it
    try { const ga = getGameAudio(); if (ga && ga.paused === false) return; } catch {}
    // Prepare src synchronously before any async play attempt
    if (!a.src && current?.src) {
      a.src = current.src;
      a.currentTime = 0;
    }
    if (!a.paused) return; // already playing
    const attempt = async () => {
      try {
        a.muted = !!mutedRef.current;
        await a.play();
      } catch {
        const retry = () => { a.play().catch(() => {}); cleanup(); };
        const cleanup = () => {
          window.removeEventListener("pointerdown", retry as EventListener);
          window.removeEventListener("keydown", retry as EventListener);
          window.removeEventListener("touchstart", retry as EventListener);
        };
        window.addEventListener("pointerdown", retry, { once: true } as AddEventListenerOptions);
        window.addEventListener("keydown", retry, { once: true } as AddEventListenerOptions);
        window.addEventListener("touchstart", retry, { once: true } as AddEventListenerOptions);
      }
    };
    void attempt();
  }, [pathname, current?.src]);

  // Controls
  const handleToggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (a.paused) {
        setMuted(false);
        a.muted = false;
        await a.play();
      } else {
        a.pause();
      }
    } catch {}
  };
  const handlePrev = () => {
    autoPlayRef.current = playingRef.current;
    setIdx((i) => (i - 1 + effectiveTracks.length) % effectiveTracks.length);
  };
  const handleNext = () => {
    autoPlayRef.current = playingRef.current;
    setIdx((i) => (i + 1) % effectiveTracks.length);
  };
  const handleMute = () => setMuted((m) => !m);
  const handleLoop = () => setLoop((l) => !l);
  const handleVolume = (v: number) => setVolume(Math.max(0, Math.min(1, v)));

  const isOpen = hoverDisc || hoverPanel;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 select-none"
      onMouseLeave={() => { setHoverDisc(false); setHoverPanel(false); }}
    >
  <div className={`flex items-center gap-3 rounded-2xl bg-black/50 p-2 text-white ring-1 ring-white/20 backdrop-blur-md transition-all duration-300 ease-out`}>
        {/* Disc / Play-Pause */}
        <button
          onClick={handleToggle}
          onMouseEnter={() => setHoverDisc(true)}
          onMouseLeave={() => setHoverDisc(false)}
          onFocus={() => setHoverDisc(true)}
          onBlur={() => setHoverDisc(false)}
          aria-label={playing ? "Pause" : "Play"}
          className={`relative grid h-12 w-12 place-items-center rounded-full ${playing ? "bg-sky-600/90" : "bg-black/40"} ring-1 ring-white/20`}
          title={current?.title}
        >
          <div className={`relative h-8 w-8 rounded-full border-[3px] border-white/70 bg-gradient-to-br from-white/60 to-white/20 shadow-inner ${playing ? "motion-safe:animate-[spinSlow_6s_linear_infinite]" : ""}`}>
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60" />
            <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, rgba(0,0,0,.06) 0 40%, transparent 41%)" }} />
          </div>
          <span className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ${playing ? "bg-green-400" : "bg-white/50"}`} />
        </button>

        {/* Expanded panel (animated in/out) */}
        <div
          className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ease-out ${
            isOpen ? "opacity-100 translate-x-0 scale-100 max-w-[320px] w-auto pointer-events-auto" : "opacity-0 -translate-x-1 scale-95 max-w-0 w-0 pointer-events-none"
          }`}
          onMouseEnter={() => setHoverPanel(true)}
          onMouseLeave={() => setHoverPanel(false)}
          onFocus={() => setHoverPanel(true)}
          onBlur={() => setHoverPanel(false)}
          aria-hidden={!isOpen}
        >
          <div className="hidden max-w-[180px] truncate text-xs opacity-90 sm:block" title={current?.title}>
            {current?.title}
            {error ? " (missing)" : ""}
          </div>
          <IconButton label="Previous" onClick={handlePrev}><Icon name="prev" /></IconButton>
          <IconButton label={playing ? "Pause" : "Play"} onClick={handleToggle} bigger>
            {playing ? <Icon name="pause" /> : <Icon name="play" />}
          </IconButton>
          <IconButton label="Next" onClick={handleNext}><Icon name="next" /></IconButton>
          <div className="ml-1 hidden items-center gap-2 sm:flex">
            <IconButton label={muted ? "Unmute" : "Mute"} onClick={handleMute}>
              <Icon name={muted ? "mute" : "volume"} />
            </IconButton>
            <input
              aria-label="Volume"
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => handleVolume(Number(e.target.value) / 100)}
              onInput={(e) => handleVolume(Number((e.target as HTMLInputElement).value) / 100)}
              className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/25 accent-sky-500"
            />
            <IconButton label={loop ? "Disable loop" : "Enable loop"} onClick={handleLoop}>
              <Icon name={loop ? "loopOn" : "loop"} />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({ children, onClick, label, bigger = false }: { children: React.ReactNode; onClick: () => void; label: string; bigger?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`inline-grid place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 transition-all hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${bigger ? "h-10 w-10" : "h-9 w-9"}`}
    >
      {children}
    </button>
  );
}

function Icon({ name }: { name: "play" | "pause" | "prev" | "next" | "volume" | "mute" | "loop" | "loopOn" | "chevLeft" | "chevRight" }) {
  switch (name) {
    case "play":
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
    case "pause":
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>;
    case "prev":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM20 6l-10 6 10 6z"/></svg>;
    case "next":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM4 6l10 6-10 6z"/></svg>;
    case "volume":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10H3z"/></svg>;
    case "mute":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12l4.5 4.5-1.5 1.5L15 13.5 10.5 18 7 14H3v-4h4l5-5 3.5 3.5 4.5-4.5 1.5 1.5L16.5 12z"/></svg>;
    case "loop":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 1l4 4-4 4V6H7a3 3 0 0 0-3 3v1H2V9a5 5 0 0 1 5-5h10V1zm-10 22l-4-4 4-4v3h10a3 3 0 0 0 3-3v-1h2v1a5 5 0 0 1-5 5H7v3z"/></svg>;
    case "loopOn":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 1l4 4-4 4V6H7a3 3 0 0 0-3 3v1H2V9a5 5 0 0 1 5-5h10V1zM7 23l-4-4 4-4v3h10a3 3 0 0 0 3-3v-1h2v1a5 5 0 0 1-5 5H7v3z"/></svg>;
    case "chevLeft":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>;
    case "chevRight":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>;
    default:
      return null;
  }
}
