"use client";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useCallback } from "@/hooks/useCallback";
import { useEffect } from "@/hooks/useEffect";
import { useMemo } from "@/hooks/useMemo";
import { useRef } from "@/hooks/useRef";
import { useState } from "@/hooks/useState";
import { usePathname } from "next/navigation";
import { MUSIC_BUS } from "../../../lib/audio/musicBus";
import { getGlobalAudio } from "../../../lib/audio/audioSingleton";
import { getGameAudio } from "../../../lib/audio/gameAudio";
import { playSfx } from "../../../lib/audio/sfx";
import { emitParkingRadioWheelEvent } from "../../../lib/parking/radioWheelBus";

// Default fallback playlist; real files are discovered from /api/audio
const DEFAULT_PLAYLIST = [
  { title: "Delfino Plaza", src: "/audio/Delfino Plaza - Super Mario Sunshine Soundtrack.mp3" },
  { title: "Route 1", src: "/audio/Pokemon FireRed - Route 1.mp3" },
];

const PARKING_RADIO_MAX_OPTIONS = 6;
const RADIAL_MIN_DRAG_DISTANCE = 56;
const TWO_PI = Math.PI * 2;
const computeRadialShade = (index: number, total: number, highlight = false) => {
  if (!Number.isFinite(index) || !Number.isFinite(total) || total <= 0) {
    return 'rgba(15, 23, 42, 0.9)';
  }
  const t = total <= 1 ? 0 : index / (total - 1);
  const baseLightness = 32 + (t * 28);
  const lightness = Math.min(baseLightness + (highlight ? 14 : 0), 88);
  const saturation = highlight ? 92 : 70;
  return `hsl(205, ${saturation}%, ${lightness}%)`;
};

type Track = { title: string; src: string };
type RadialOption = { track: Track; index: number; isOff?: boolean };

const RADIO_OFF_OPTION_INDEX = -1;
const RADIO_OFF_TRACK: Track = { title: "Radio Off", src: "" };

const STORE = "algohub_player_prefs_v1";

export default function MusicPlayer({ playlist }: { playlist?: Track[] }) {
  const pathname = usePathname();
  const isParkingRoute = Boolean(pathname?.startsWith("/learn/parking"));
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);
  const autoPlayRef = useRef(false);

  // UI state
  const [hoverDisc, setHoverDisc] = useState(false);
  const [hoverPanel, setHoverPanel] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [radialOpen, setRadialOpen] = useState(false);
  const [radialHoverIndex, setRadialHoverIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>(() => playlist ?? []);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.7);
  const [loop, setLoop] = useState<boolean>(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  // (Optional) duration/time omitted to keep UI simple and avoid stutter
  const mutedRef = useRef(false);
  const skipNextPersistRef = useRef(true);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  const radialSelectionRef = useRef<number | null>(null);
  const radialCenterRef = useRef({ x: 0, y: 0 });
  const radialActiveRef = useRef(false);
  const radialHoverSoundRef = useRef<number | null>(null);
  const parkingRadioWheelEnabled = isParkingRoute && isDesktopViewport;
  const effectiveTracks = useMemo(
    () => (playlist?.length ? playlist : (tracks.length ? tracks : DEFAULT_PLAYLIST)),
    [playlist, tracks],
  );
  const current = useMemo(
    () => effectiveTracks[Math.max(0, Math.min(idx, effectiveTracks.length - 1))],
    [effectiveTracks, idx],
  );
  const radialOptions = useMemo<RadialOption[]>(() => {
    const maxTrackSlots = Math.max(1, PARKING_RADIO_MAX_OPTIONS - 1);
    const trackOptions = effectiveTracks
      .map((track, optionIndex) => ({ track, index: optionIndex }))
      .slice(0, maxTrackSlots);
    if (!trackOptions.length) {
      return trackOptions;
    }
    return [...trackOptions, { track: RADIO_OFF_TRACK, index: RADIO_OFF_OPTION_INDEX, isOff: true }];
  }, [effectiveTracks]);
  const radialOptionColors = useMemo(
    () => radialOptions.map((option, idx) => (
      option?.isOff
        ? "rgba(15,23,42,0.85)"
        : computeRadialShade(idx, radialOptions.length)
    )),
    [radialOptions],
  );
  const radialReady = parkingRadioWheelEnabled && radialOptions.length >= 2;
  const radialHoverIsOff = radialHoverIndex === RADIO_OFF_OPTION_INDEX;
  const radialHoverTrack = !radialHoverIsOff && radialHoverIndex != null && radialHoverIndex >= 0 && radialHoverIndex < effectiveTracks.length
    ? effectiveTracks[radialHoverIndex]
    : null;
  const radialHoverLabel = radialHoverIsOff ? RADIO_OFF_TRACK.title : radialHoverTrack?.title;

  // Ensure the player UI anchors to the viewport instead of animated containers.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const existing = document.getElementById("algohub-musicplayer-root");
    const host = existing ?? document.createElement("div");
    if (!existing) {
      host.id = "algohub-musicplayer-root";
      document.body.appendChild(host);
    }
    setPortalContainer(host);
    return () => {
      if (!existing && host.parentNode) {
        host.parentNode.removeChild(host);
      }
    };
  }, []);

  // Detect desktop layouts (fine pointer + large viewport) for keyboard shortcut eligibility.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const pointerQuery = window.matchMedia("(pointer: fine)");
    const update = () => setIsDesktopViewport(desktopQuery.matches && pointerQuery.matches);
    const add = (mq: MediaQueryList) => {
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", update);
      } else if (typeof mq.addListener === "function") {
        mq.addListener(update);
      }
    };
    const remove = (mq: MediaQueryList) => {
      if (typeof mq.removeEventListener === "function") {
        mq.removeEventListener("change", update);
      } else if (typeof mq.removeListener === "function") {
        mq.removeListener(update);
      }
    };
    update();
    add(desktopQuery);
    add(pointerQuery);
    return () => {
      remove(desktopQuery);
      remove(pointerQuery);
    };
  }, []);

  useEffect(() => {
    if (!radialReady) {
      setRadialOpen(false);
      setRadialHoverIndex(null);
      radialSelectionRef.current = null;
    }
  }, [radialReady]);

  useEffect(() => {
    radialActiveRef.current = radialOpen;
  }, [radialOpen]);

  useEffect(() => {
    if (!radialOpen || !parkingRadioWheelEnabled) {
      radialHoverSoundRef.current = null;
      return;
    }
    if (radialHoverIndex == null) {
      radialHoverSoundRef.current = null;
      return;
    }
    if (radialHoverSoundRef.current === radialHoverIndex) {
      return;
    }
    radialHoverSoundRef.current = radialHoverIndex;
    playSfx("/radio_select.mp3", 0.5);
  }, [radialHoverIndex, radialOpen, parkingRadioWheelEnabled]);

  useEffect(() => {
    if (!parkingRadioWheelEnabled) {
      emitParkingRadioWheelEvent({ slowMo: false });
      return;
    }
    emitParkingRadioWheelEvent({ slowMo: radialOpen });
    return () => {
      emitParkingRadioWheelEvent({ slowMo: false });
    };
  }, [parkingRadioWheelEnabled, radialOpen]);

  const updateRadialSelection = useCallback((clientX: number, clientY: number) => {
    if (!radialOpen || !radialOptions.length) {
      setRadialHoverIndex(null);
      radialSelectionRef.current = null;
      return;
    }
    const dx = clientX - radialCenterRef.current.x;
    const dy = clientY - radialCenterRef.current.y;
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    if (distance < RADIAL_MIN_DRAG_DISTANCE) {
      setRadialHoverIndex(null);
      radialSelectionRef.current = null;
      return;
    }
    const angle = Math.atan2(dy, dx);
    const normalized = (angle + TWO_PI) % TWO_PI;
    const adjusted = (normalized + (Math.PI / 2)) % TWO_PI;
    const segmentAngle = TWO_PI / radialOptions.length;
    let rawIndex = Math.floor(adjusted / segmentAngle);
    if (rawIndex >= radialOptions.length) {
      rawIndex = radialOptions.length - 1;
    }
    const option = radialOptions[rawIndex];
    if (!option) {
      setRadialHoverIndex(null);
      radialSelectionRef.current = null;
      return;
    }
    setRadialHoverIndex(option.index);
    radialSelectionRef.current = option.index;
  }, [radialOpen, radialOptions]);

  useEffect(() => {
    if (!radialOpen || !radialReady) {
      return;
    }
    const handlePointerMove = (event: PointerEvent) => {
      updateRadialSelection(event.clientX, event.clientY);
    };
    const resetSelection = () => {
      setRadialHoverIndex(null);
      radialSelectionRef.current = null;
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("mouseleave", resetSelection);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mouseleave", resetSelection);
    };
  }, [radialOpen, radialReady, updateRadialSelection]);

  useEffect(() => {
    if (!radialReady) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (typeof event.key !== "string" || event.key.toLowerCase() !== "r") {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
          return;
        }
      }
      if (event.repeat || radialActiveRef.current) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      radialCenterRef.current = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
      radialSelectionRef.current = null;
      setRadialHoverIndex(null);
      radialActiveRef.current = true;
      setRadialOpen(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (typeof event.key !== "string" || event.key.toLowerCase() !== "r") {
        return;
      }
      if (!radialActiveRef.current) {
        return;
      }
      event.preventDefault();
      radialActiveRef.current = false;
      setRadialOpen(false);
      const choice = radialSelectionRef.current;
      radialSelectionRef.current = null;
      setRadialHoverIndex(null);
      if (choice === RADIO_OFF_OPTION_INDEX) {
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        playingRef.current = false;
        autoPlayRef.current = false;
        setPlaying(false);
        return;
      }
      if (choice == null || choice < 0 || choice >= effectiveTracks.length) {
        return;
      }
      setIdx((currentIdx) => {
        if (currentIdx === choice) {
          const audio = audioRef.current;
          if (audio) {
            autoPlayRef.current = true;
            audio.currentTime = 0;
            void audio.play().catch(() => {});
          }
          return currentIdx;
        }
        autoPlayRef.current = true;
        return choice;
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [radialReady, effectiveTracks.length, setIdx]);

  useEffect(() => {
    if (!radialOpen) {
      return;
    }
    const handleBlur = () => {
      radialActiveRef.current = false;
      setRadialOpen(false);
      setRadialHoverIndex(null);
      radialSelectionRef.current = null;
    };
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [radialOpen]);

  useEffect(() => {
    if (radialHoverIndex != null && radialHoverIndex >= effectiveTracks.length) {
      setRadialHoverIndex(null);
    }
    if (radialSelectionRef.current != null && radialSelectionRef.current >= effectiveTracks.length) {
      radialSelectionRef.current = null;
    }
  }, [effectiveTracks.length, radialHoverIndex]);

  // Load stored prefs once on mount to avoid hydration mismatches.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const p = JSON.parse(raw) as { muted?: boolean; volume?: number; loop?: boolean };
        if (typeof p.muted === "boolean") setMuted(p.muted);
        if (typeof p.volume === "number") setVolume(Math.max(0, Math.min(1, p.volume)));
        if (typeof p.loop === "boolean") setLoop(p.loop);
      }
    } catch {}
    setPrefsLoaded(true);
  }, []);

  // Persist prefs once they are loaded client-side.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!prefsLoaded) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const p = { volume, muted, loop };
    try {
      localStorage.setItem(STORE, JSON.stringify(p));
    } catch {}
  }, [volume, muted, loop, prefsLoaded]);

  // Keep a ref of current src for first-interaction unlock handler
  const currentSrcRef = useRef<string | undefined>(undefined);
  useEffect(() => { currentSrcRef.current = current?.src; }, [current?.src]);

  // Fetch from API if no playlist provided; route-aware source
  useEffect(() => {
    if (playlist?.length) return;
    let cancelled = false;
    const endpoint = isParkingRoute ? "/api/car-radio" : "/api/audio";
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
  }, [playlist, isParkingRoute]);

  // Keep track count in a ref for event handlers
  const lenRef = useRef(1);
  useEffect(() => {
    lenRef.current = Math.max(1, effectiveTracks.length);
  }, [effectiveTracks.length]);
  const autoplayTriedRef = useRef(false);

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
          a.muted = mutedRef.current;
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
  const radialArcDegrees = radialOptions.length ? 360 / radialOptions.length : 0;
  const radialSelectedSlot = useMemo(
    () => radialOptions.findIndex((option) => option.index === radialHoverIndex),
    [radialOptions, radialHoverIndex],
  );
  const radialPointerStyle = useMemo(() => {
    const angle = radialSelectedSlot >= 0 && radialArcDegrees !== 0
      ? (radialSelectedSlot * radialArcDegrees) + (radialArcDegrees / 2) - 90
      : -90;
    return {
      opacity: radialSelectedSlot >= 0 ? 1 : 0.15,
      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-150px)`,
    };
  }, [radialSelectedSlot, radialArcDegrees]);
  const radialSweepStyle = useMemo(() => {
    if (radialSelectedSlot < 0 || radialArcDegrees === 0) {
      return { opacity: 0 };
    }
    const segment = radialArcDegrees;
    const start = radialSelectedSlot * segment;
    const end = start + segment;
    return {
      opacity: 0.9,
      background: `conic-gradient(from -90deg, transparent ${start}deg, rgba(14,165,233,0.08) ${start + segment * 0.2}deg, rgba(14,165,233,0.45) ${start + segment * 0.55}deg, rgba(56,189,248,0.4) ${start + segment * 0.85}deg, transparent ${end}deg)`,
    };
  }, [radialSelectedSlot, radialArcDegrees]);
  const radialPulseStyle = useMemo(() => ({
    opacity: radialHoverIndex != null ? 0.5 : 0.2,
    transform: radialHoverIndex != null ? "scale(1.04)" : "scale(1)",
    transition: "opacity 200ms ease, transform 200ms ease",
  }), [radialHoverIndex]);
  const radialTicks = useMemo(() => Array.from({ length: 32 }, (_, idx) => idx), []);
  const radialBackgroundStyle = useMemo(() => {
    if (!radialOptions.length) {
      return { background: 'radial-gradient(circle at center, rgba(8,47,73,0.85), rgba(2,6,23,0.95))' };
    }
    const total = radialOptions.length;
    const segment = 360 / total;
    const segments = radialOptions.map((option, idx) => {
      const start = idx * segment;
      const end = start + segment;
      const baseColor = radialOptionColors[idx] ?? computeRadialShade(idx, total);
      const color = option.index === radialHoverIndex
        ? computeRadialShade(idx, total, true)
        : baseColor;
      return `${color} ${start}deg ${end}deg`;
    }).join(', ');
    return {
      background: `conic-gradient(from -90deg, ${segments})`,
    };
  }, [radialOptions, radialOptionColors, radialHoverIndex]);

  const playerMarkup = (
    <>
      <div
        className="fixed bottom-4 right-4 z-50 select-none"
        onMouseLeave={() => { setHoverDisc(false); setHoverPanel(false); }}
      >
        <div className="flex items-center gap-3 rounded-2xl bg-black/50 p-2 text-white ring-1 ring-white/20 backdrop-blur-md transition-all duration-300 ease-out">
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

          {parkingRadioWheelEnabled && (
            <div className="hidden flex-col items-center text-[10px] font-semibold uppercase tracking-[0.45em] text-white/60 lg:flex">
              <span className="rounded-full border border-white/40 px-2 py-0.5 text-[11px] leading-none">Hold R</span>
              <span className="mt-1 text-[9px] tracking-[0.5em]">Radio Wheel</span>
            </div>
          )}

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
            <IconButton label="Previous" onClick={handlePrev}>
              <Icon name="prev" />
            </IconButton>
            <IconButton label={playing ? "Pause" : "Play"} onClick={handleToggle} bigger>
              {playing ? <Icon name="pause" /> : <Icon name="play" />}
            </IconButton>
            <IconButton label="Next" onClick={handleNext}>
              <Icon name="next" />
            </IconButton>
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
      {radialReady && (
        <div
          aria-hidden={!radialOpen}
          className={`pointer-events-none fixed inset-0 z-[999] flex items-center justify-center transition duration-150 ease-out ${radialOpen ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}
          style={{ transitionProperty: "opacity, transform" }}
        >
          <div className="relative h-[30rem] w-[30rem] max-h-[92vh] max-w-[95vw]">
            <div className="absolute inset-0 rounded-full border border-white/15 bg-slate-950/80 shadow-[0_35px_65px_rgba(2,6,23,0.65)] backdrop-blur-xl" />
            <div className="absolute inset-3 rounded-full bg-sky-500/10 blur-3xl" style={radialPulseStyle} />
            <div className="absolute inset-6 rounded-full border border-white/10 opacity-95" style={radialBackgroundStyle} />
            <div className="pointer-events-none absolute inset-6 rounded-full" style={radialSweepStyle} />
            <div className="pointer-events-none absolute inset-8 rounded-full border border-dashed border-white/10" />
            <div className="pointer-events-none absolute inset-0">
              {radialTicks.map((tick) => {
                const major = tick % 4 === 0;
                const angle = (tick / radialTicks.length) * 360;
                const translate = major ? -220 : -214;
                return (
                  <span
                    key={`tick-${tick}`}
                    className="pointer-events-none absolute left-1/2 top-1/2 origin-bottom"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(${translate}px)`,
                      height: major ? "18px" : "9px",
                      width: major ? "3px" : "2px",
                      background: major
                        ? "linear-gradient(180deg, rgba(248,250,252,0.75), rgba(14,165,233,0.5))"
                        : "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(14,165,233,0.25))",
                      opacity: major ? 0.5 : 0.25,
                    }}
                  />
                );
              })}
            </div>
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 flex items-start"
              style={radialPointerStyle}
            >
              <div className="h-28 w-[3px] rounded-full bg-gradient-to-b from-cyan-100 via-sky-400 to-blue-600 shadow-[0_0_22px_rgba(14,165,233,0.7)]" />
              <div className="ml-1 h-3 w-3 rounded-full bg-cyan-50 shadow-[0_0_18px_rgba(191,219,254,0.9)]" />
            </div>
            <div className="absolute left-1/2 top-1/2 z-10 flex w-48 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center text-white">
              <div className="text-[10px] uppercase tracking-[0.4em] text-white/60">Garage Radio</div>
              <div className="mt-1 text-xs text-white/70">Hold R + move</div>
              {radialHoverLabel ? (
                <div className="mt-3 text-sm font-semibold leading-snug text-sky-100">
                  {radialHoverLabel}
                </div>
              ) : (
                <div className="mt-3 text-[11px] text-white/55">Select a station</div>
              )}
              <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-white/35">Release to play</div>
            </div>
            {radialOptions.map((option, idx) => {
              const rotation = (idx * radialArcDegrees) - 90;
              const selected = option.index === radialHoverIndex;
              const isOff = Boolean(option.isOff);
              const baseColor = radialOptionColors[idx] ?? computeRadialShade(idx, radialOptions.length);
              const accentColor = isOff
                ? (selected ? "rgba(248,250,252,0.9)" : baseColor)
                : (selected
                  ? computeRadialShade(idx, radialOptions.length, true)
                  : baseColor);
              const rankLabel = option.isOff ? "OFF" : `CH${String(option.index + 1).padStart(2, "0")}`;
              const descriptor = option.isOff ? "Power Down" : "Now Tuning";
              return (
                <div
                  key={`${option.index}-${option.track.title}`}
                  className="absolute left-1/2 top-1/2 w-36 -translate-x-1/2 -translate-y-1/2 origin-center text-center"
                  style={{ transform: `rotate(${rotation}deg) translateY(-150px) rotate(${-rotation}deg)` }}
                >
                  <div
                    className={`mx-auto w-[9.5rem] rounded-2xl border px-3 py-2 text-[10px] uppercase tracking-[0.38em] shadow-[0_12px_35px_rgba(2,6,23,0.55)] ${selected ? "backdrop-blur-md" : "backdrop-blur"}`}
                    style={{
                      background: selected ? "rgba(8,47,73,0.9)" : "rgba(2,6,23,0.75)",
                      borderColor: selected ? accentColor : "rgba(255,255,255,0.12)",
                      color: selected ? "#f8fbff" : "#dbeafe",
                      boxShadow: selected ? `0 18px 45px rgba(14,165,233,0.45)` : undefined,
                    }}
                  >
                    <div className="text-[8px] font-semibold tracking-[0.55em] text-white/45">{rankLabel}</div>
                    <div className="mt-1 text-[11px] font-semibold tracking-[0.25em] text-white">
                      {option.track.title}
                    </div>
                    <div className="mt-1 text-[8px] tracking-[0.4em] text-white/40">{descriptor}</div>
                    <div className="mt-2 h-1 w-full rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: option.isOff ? "35%" : `${selected ? 100 : 45 + (idx / Math.max(1, radialOptions.length - 1)) * 35}%`,
                          background: selected
                            ? `linear-gradient(90deg, ${accentColor}, #fde68a)`
                            : "rgba(255,255,255,0.5)",
                          boxShadow: selected ? `0 0 18px ${accentColor}` : undefined,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  if (!portalContainer) {
    return null;
  }

  return createPortal(playerMarkup, portalContainer);
}

function IconButton({ children, onClick, label, bigger = false }: { children: ReactNode; onClick: () => void; label: string; bigger?: boolean }) {
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
