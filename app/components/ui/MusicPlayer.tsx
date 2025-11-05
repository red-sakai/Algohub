"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

// Minimal playlist; drop audio files in /public/audio with these names or change the src values.
// The player will gracefully show an error if a track is missing.
const DEFAULT_PLAYLIST = [
  { title: "AlgoHub Theme", src: "/audio/algohub-theme.mp3" },
  { title: "Ambient Loop", src: "/audio/ambient-loop.mp3" },
];

type Track = { title: string; src: string };

type PlayerState = {
  idx: number;
  isPlaying: boolean;
  volume: number; // 0..1
  muted: boolean;
  loop: boolean;
  time: number; // seconds
};

const STORAGE_KEY = "algohub_player_state_v1";

export default function MusicPlayer({
  playlist,
  startOpen = false,
}: {
  playlist?: Track[];
  startOpen?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const panelTimer = useRef<number | null>(null);
  const autoplayTried = useRef(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(startOpen);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>(() => playlist ?? []);
  const [state, setState] = useState<PlayerState>(() => {
    if (typeof window === "undefined")
      return { idx: 0, isPlaying: false, volume: 0.6, muted: false, loop: false, time: 0 };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as PlayerState;
    } catch {}
    return { idx: 0, isPlaying: false, volume: 0.6, muted: false, loop: false, time: 0 };
  });

  const effectiveTracks = tracks.length > 0 ? tracks : DEFAULT_PLAYLIST;
  const current = useMemo(
    () => effectiveTracks[Math.max(0, Math.min(state.idx, effectiveTracks.length - 1))],
    [effectiveTracks, state.idx]
  );

  // Fetch tracks from /api/audio if not provided via props
  useEffect(() => {
    if (playlist && playlist.length) {
      setTracks(playlist);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/audio", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load audio list");
        const data = (await res.json()) as Track[];
        if (!cancelled) setTracks(Array.isArray(data) && data.length ? data : DEFAULT_PLAYLIST);
      } catch {
        if (!cancelled) setTracks(DEFAULT_PLAYLIST);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playlist]);

  // Initialize audio element and wire events
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onEnded = () => {
      if (state.loop) {
        audio.currentTime = 0;
        void audio.play().catch(() => {});
        return;
      }
      next();
    };
    const onError = () => {
      setError("Audio failed to load.");
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    setReady(true);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Change track source when current track changes
  useEffect(() => {
    if (!ready || !audioRef.current || !current?.src) return;
    const audio = audioRef.current;
    setError(null);
    // Only change src here to avoid re-buffering on unrelated state changes
    if (audio.src !== location.origin + current.src) {
      audio.src = current.src;
      audio.currentTime = 0;
    }
    // If we should be playing, kick off playback
    if (state.isPlaying) void audio.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, current.src]);

  // Apply playback controls when state changes (without touching src)
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    audio.loop = state.loop;
    audio.muted = state.muted;
    audio.volume = state.volume;
  }, [state.loop, state.muted, state.volume]);

  // React to isPlaying changes
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    if (state.isPlaying) {
      setError(null);
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [state.isPlaying]);

  // If track list changes and idx is out of range, clamp it
  useEffect(() => {
    const len = effectiveTracks.length;
    if (len === 0) return;
    setState((s) => (s.idx >= len ? { ...s, idx: 0 } : s));
  }, [effectiveTracks.length]);

  // Persist state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const persist = {
        idx: state.idx,
        isPlaying: state.isPlaying,
        volume: state.volume,
        muted: state.muted,
        loop: state.loop,
        time: 0,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
    }
  }, [state.idx, state.isPlaying, state.volume, state.muted, state.loop]);

  // Track time while playing
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const onTime = () => {
      setState((s) => ({ ...s, time: audio.currentTime }));
    };
    audio.addEventListener("timeupdate", onTime);
    return () => audio.removeEventListener("timeupdate", onTime);
  }, [ready]);

  const playPause = () => {
    if (!audioRef.current) return;
    if (state.isPlaying) {
      audioRef.current.pause();
      setState((s) => ({ ...s, isPlaying: false }));
    } else {
      setError(null);
      // Treat this as an explicit user gesture: unmute and play
      audioRef.current.muted = false;
      setState((s) => ({ ...s, muted: false }));
      void audioRef.current.play().then(() => setState((s) => ({ ...s, isPlaying: true })));
    }
  };

  const prev = () => setState((s) => ({ ...s, idx: (s.idx - 1 + effectiveTracks.length) % effectiveTracks.length, time: 0 }));
  const next = () => setState((s) => ({ ...s, idx: (s.idx + 1) % effectiveTracks.length, time: 0 }));

  // Disc click: toggle play/pause and briefly reveal panel (mobile-friendly)
  const handleDiscClick = () => {
    playPause();
    setOpen(true);
    if (panelTimer.current) window.clearTimeout(panelTimer.current);
    panelTimer.current = window.setTimeout(() => setOpen(false), 2500);
  };

  // Clear any pending panel auto-close timer on unmount
  useEffect(() => {
    return () => {
      if (panelTimer.current) window.clearTimeout(panelTimer.current);
    };
  }, []);

  // Attempt muted autoplay once when ready and a track is available
  useEffect(() => {
    if (!ready || autoplayTried.current || !audioRef.current || !current?.src) return;
    autoplayTried.current = true;
    const audio = audioRef.current;
    try {
      audio.muted = true;
      audio.volume = state.volume;
      audio.loop = state.loop;
      audio.currentTime = 0;
      void audio.play().then(() => {
        setState((s) => ({ ...s, isPlaying: true, muted: true, time: 0 }));
      }).catch(() => {
        // Autoplay blocked; user will tap to start
      });
    } catch {
      // Ignore
    }
  }, [ready, current?.src, state.volume, state.loop]);

  // On first user interaction anywhere, unmute and try to start playback once
  useEffect(() => {
    if (!ready) return;
    let done = false;
    const onInteract = () => {
      if (done || !audioRef.current) return;
      done = true;
      const a = audioRef.current;
      a.muted = false;
      setState((s) => ({ ...s, muted: false }));
      if (a.paused) {
        void a.play().then(() => setState((s) => ({ ...s, isPlaying: true })));
      }
    };
    window.addEventListener("pointerdown", onInteract, { once: true });
    window.addEventListener("keydown", onInteract, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, [ready]);
  const setVolume = (v: number) => {
    v = Math.max(0, Math.min(1, v));
    if (audioRef.current) audioRef.current.volume = v;
    setState((s) => ({ ...s, volume: v }));
  };
  const toggleMute = () => {
    if (audioRef.current) audioRef.current.muted = !state.muted;
    setState((s) => ({ ...s, muted: !s.muted }));
  };
  const toggleLoop = () => setState((s) => ({ ...s, loop: !s.loop }));

  return (
    <div className="group fixed bottom-4 right-4 z-50 select-none">
      {/* Compact disc button */}
      <button
        onClick={handleDiscClick}
        aria-label={state.isPlaying ? "Pause music" : "Play music"}
        className={`relative grid h-14 w-14 place-items-center rounded-full ring-1 ring-white/20 transition-transform duration-200 hover:scale-105 active:scale-95 ${
          state.isPlaying ? "bg-sky-600/90" : "bg-black/35 backdrop-blur-md"
        }`}
        title={current?.title}
      >
        {/* vinyl record icon */}
        <div
          className={`relative h-9 w-9 rounded-full border-[3px] border-white/70 bg-gradient-to-br from-white/60 to-white/20 shadow-inner ${
            state.isPlaying ? "motion-safe:animate-[spinSlow_6s_linear_infinite]" : ""
          }`}
        >
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60" />
          <div className="absolute inset-0 rounded-full" style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(0,0,0,.06) 0 40%, transparent 41%)"
          }} />
        </div>
        {/* tiny play indicator dot */}
        <span className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ${state.isPlaying ? "bg-green-400" : "bg-white/50"}`} />
      </button>

      {/* Hover/expanded controls panel - shows on hover or when open is true */}
      <div
        className={`pointer-events-none absolute bottom-1 right-[4.25rem] flex translate-x-2 items-center gap-2 rounded-2xl bg-black/40 p-2 text-white opacity-0 ring-1 ring-white/20 backdrop-blur-md transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 ${
          open ? "pointer-events-auto translate-x-0 opacity-100" : ""
        }`}
      >
        {/* current track name (desktop) */}
        <span className="hidden max-w-[160px] truncate text-xs opacity-90 sm:block">
          {current?.title}
          {error ? " (missing)" : ""}
        </span>
        <IconButton label="Previous" onClick={prev}>
          <Icon name="prev" />
        </IconButton>
        <IconButton label={state.isPlaying ? "Pause" : "Play"} onClick={playPause} bigger>
          {state.isPlaying ? <Icon name="pause" /> : <Icon name="play" />}
        </IconButton>
        <IconButton label="Next" onClick={next}>
          <Icon name="next" />
        </IconButton>
        <div className="mx-2 hidden items-center gap-2 sm:flex">
          <IconButton label={state.muted ? "Unmute" : "Mute"} onClick={toggleMute}>
            <Icon name={state.muted ? "mute" : "volume"} />
          </IconButton>
          <input
            aria-label="Volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(state.volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/25 accent-sky-500"
          />
          <IconButton label={state.loop ? "Disable loop" : "Enable loop"} onClick={toggleLoop}>
            <Icon name={state.loop ? "loopOn" : "loop"} />
          </IconButton>
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
      className={`inline-grid place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 transition-all hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
        bigger ? "h-10 w-10" : "h-9 w-9"
      }`}
    >
      {children}
    </button>
  );
}

function Icon({ name }: { name: "play" | "pause" | "prev" | "next" | "volume" | "mute" | "loop" | "loopOn" }) {
  switch (name) {
    case "play":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      );
    case "pause":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
      );
    case "prev":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM20 6l-10 6 10 6z" /></svg>
      );
    case "next":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM4 6l10 6-10 6z" /></svg>
      );
    case "volume":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10H3z" /></svg>
      );
    case "mute":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12l4.5 4.5-1.5 1.5L15 13.5 10.5 18 7 14H3v-4h4l5-5 3.5 3.5 4.5-4.5 1.5 1.5L16.5 12z" /></svg>
      );
    case "loop":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 1l4 4-4 4V6H7a3 3 0 0 0-3 3v1H2V9a5 5 0 0 1 5-5h10V1zm-10 22l-4-4 4-4v3h10a3 3 0 0 0 3-3v-1h2v1a5 5 0 0 1-5 5H7v3z" /></svg>
      );
    case "loopOn":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 1l4 4-4 4V6H7a3 3 0 0 0-3 3v1H2V9a5 5 0 0 1 5-5h10V1zM7 23l-4-4 4-4v3h10a3 3 0 0 0 3-3v-1h2v1a5 5 0 0 1-5 5H7v3z"/></svg>
      );
    default:
      return null;
  }
}
