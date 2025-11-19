"use client";
import Link from "next/link";
import Image from "next/image";
import BackgroundDoodles from "./components/sections/BackgroundDoodles";
import Squares from "./components/ui/Squares";
import { useRouter } from "next/navigation";
import { playSfx } from "./components/ui/sfx";
import IrisTransition, { IrisHandle } from "./components/ui/IrisTransition";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IrisOpenOnMount from "./components/ui/IrisOpenOnMount";
import { setIrisPoint } from "./components/ui/transitionBus";
import LoadingOverlay from "./components/ui/LoadingOverlay";
import TargetCursor from "./components/ui/TargetCursor";

export default function Home() {
  const router = useRouter();
  const irisRef = useRef<IrisHandle | null>(null);
  const transitioningRef = useRef(false);
  const [showLoader, setShowLoader] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [defaultLogoAnimation, setDefaultLogoAnimation] = useState<"idle" | "slideIn" | "hidden">("idle");
  const [bulletStage, setBulletStage] = useState<"hidden" | "bounce" | "fall">("hidden");
  const [bulletCycle, setBulletCycle] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const animationTimeoutsRef = useRef<number[]>([]);
  const logoLockRef = useRef(false);
  const bounceDuration = 450;
  const fallDuration = 4000;
  const slideInDuration = 1000;
  const clearLogoTimeouts = useCallback(() => {
    animationTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    animationTimeoutsRef.current = [];
  }, []);
  const scheduleLogoTimeout = useCallback((fn: () => void, delay: number) => {
    if (typeof window === "undefined") {
      return -1;
    }
    const id = window.setTimeout(() => {
      fn();
    }, delay);
    animationTimeoutsRef.current.push(id);
    return id;
  }, []);
  useEffect(() => {
    return () => {
      clearLogoTimeouts();
    };
  }, [clearLogoTimeouts]);
  const handleButtonHover = useCallback(() => {
    playSfx("/gun_sfx.mp3", 0.6);
  }, []);
  const handleLogoClick = useCallback(() => {
    if (logoLockRef.current) return;
    logoLockRef.current = true;
    clearLogoTimeouts();
    setIsShaking(false);
    playSfx("/gun_shot_sfx.mp3", 0.8);
    playSfx("/algohub_falling.mp3", 0.8);
    setFlashOpacity(1);
    setIsFlashing(true);
    scheduleLogoTimeout(() => setFlashOpacity(0), 420);
    scheduleLogoTimeout(() => {
      setIsFlashing(false);
      setFlashOpacity(0);
    }, 1200);
    setBulletCycle((prev) => prev + 1);
    setBulletStage("bounce");
    setDefaultLogoAnimation("hidden");
    scheduleLogoTimeout(() => {
      setBulletStage("fall");
    }, bounceDuration);
    scheduleLogoTimeout(() => {
      setIsShaking(true);
    }, 4000);
    scheduleLogoTimeout(() => {
      setIsShaking(false);
    }, 5000);
    scheduleLogoTimeout(() => {
      setBulletStage("hidden");
      setDefaultLogoAnimation("slideIn");
    }, bounceDuration + fallDuration);
    scheduleLogoTimeout(() => {
      setDefaultLogoAnimation("idle");
      logoLockRef.current = false;
      clearLogoTimeouts();
      setIsShaking(false);
    }, bounceDuration + fallDuration + slideInDuration + 200);
  }, [clearLogoTimeouts, scheduleLogoTimeout]);
  const handleStartClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    // Respect new-tab/modified clicks and non-left clicks
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    // Play SFX from a global pool so it continues after navigation
    playSfx("/button_click.mp3", 0.6);
    if (transitioningRef.current) return; // avoid double triggers
    transitioningRef.current = true;

    // Determine center from click position; fallback to button center
    let x = e.clientX as number | undefined;
    let y = e.clientY as number | undefined;
    if (typeof x !== "number" || typeof y !== "number" || x === 0 && y === 0) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    // Persist the origin point so the destination can open from the same spot
    setIrisPoint(x, y);

    irisRef.current?.start({
      x,
      y,
      durationMs: 650,
      onDone: () => {
        // Between transitions: show 3D loader for ~3s, then navigate
        setShowLoader(true);
        setTimeout(() => {
          router.push("/learn");
          setTimeout(() => { transitioningRef.current = false; setShowLoader(false); }, 200);
        }, 2400);
      },
    });
  };
  const defaultLogoAnimationValue = useMemo(() => {
    if (defaultLogoAnimation === "slideIn") return "logoSlideIn 1s ease-out forwards";
    if (defaultLogoAnimation === "idle") return "logoFloat 8s ease-in-out infinite";
    return "none";
  }, [defaultLogoAnimation]);
  const defaultLogoOpacity = defaultLogoAnimation === "hidden" ? 0 : 1;
  const defaultLogoOpacityTransition =
    defaultLogoAnimation === "hidden" ? "opacity 120ms ease-in" : "opacity 200ms ease-out";
  const isBulletVisible = bulletStage !== "hidden";
  const bulletAnimationValue = useMemo(() => {
    if (bulletStage === "bounce") return "logoBounce 450ms ease-out forwards";
    if (bulletStage === "fall") return "logoFall 4s cubic-bezier(0.25, 0.82, 0.25, 1) forwards";
    return "none";
  }, [bulletStage]);
  return (
    <main
      className={`relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-sky-500 to-green-300 text-white ${
        isShaking ? "site-shake" : ""
      }`}
    >
      {isFlashing && (
        <div
          className="pointer-events-none fixed inset-0 z-40"
          style={{
            opacity: flashOpacity,
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 32%, rgba(255,255,255,0.85) 48%, rgba(255,255,255,0.55) 70%, rgba(255,255,255,0.1) 100%)",
            backdropFilter: "brightness(1.35)",
            transition: flashOpacity === 1 ? "none" : "opacity 800ms ease-out",
            willChange: "opacity"
          }}
        />
      )}
      <TargetCursor spinDuration={2} hideDefaultCursor parallaxOn />
      {/* animated squares background */}
      <Squares
        speed={0.5}
        squareSize={40}
        direction="diagonal"
        borderColor="#ffffff22"
        hoverFillColor="#ffffff"
        className="pointer-events-none fixed inset-0 z-0"
      />
      {/* decorative background doodles */}
      <BackgroundDoodles />

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col items-center justify-center px-4 sm:px-6 text-center">
        {/* logo - default mark with falling bullet overlay */}
        <div className="mb-6 motion-safe:animate-[popIn_500ms_ease-out_forwards] motion-safe:opacity-0 transition-transform duration-300 will-change-transform">
          <button
            type="button"
            onClick={handleLogoClick}
            className="group relative inline-flex items-center justify-center rounded-[2.75rem] bg-transparent transition-transform duration-300 hover:scale-[1.06] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 cursor-target"
            aria-label="Trigger AlgoHub logo transformation"
          >
            <Image
              src="/algohub-transparent.png"
              alt="AlgoHub logo"
              width={360}
              height={360}
              priority
              className="h-auto w-[200px] sm:w-[300px] md:w-[360px] drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
              style={{
                animation: defaultLogoAnimationValue,
                opacity: defaultLogoOpacity,
                transition: defaultLogoOpacityTransition,
                willChange: "transform, opacity"
              }}
              draggable={false}
            />
            {isBulletVisible && (
              <div key={bulletCycle} className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Image
                  src="/algohub-bullet.png"
                  alt="AlgoHub bullet logo"
                  width={360}
                  height={360}
                  className="h-auto w-[200px] sm:w-[300px] md:w-[360px] drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
                  style={{
                    animation: bulletAnimationValue,
                    willChange: "transform",
                    transformOrigin: "center"
                  }}
                  draggable={false}
                />
              </div>
            )}
          </button>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-yellow-100 ring-1 ring-white/20 motion-safe:animate-[fadeUp_550ms_ease-out_forwards] motion-safe:[animation-delay:120ms] motion-safe:opacity-0 sm:text-sm">
          Play & Learn
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-300" />
          Gamified DSA
        </span>

        <h1 className="mt-3 text-balance text-3xl font-extrabold leading-snug drop-shadow-sm motion-safe:animate-[fadeUp_600ms_ease-out_forwards] motion-safe:[animation-delay:180ms] motion-safe:opacity-0 sm:text-5xl md:text-6xl [text-shadow:_0_1px_0_rgba(0,0,0,0.12)]">
          ALGO HUB
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-base text-white/90 motion-safe:animate-[fadeUp_650ms_ease-out_forwards] motion-safe:[animation-delay:240ms] motion-safe:opacity-0 sm:text-lg md:text-xl">
          Master algorithms through interactive lessons, mini-games, and bite-sized challenges—all in one hub.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:gap-4 motion-safe:animate-[fadeUp_700ms_ease-out_forwards] motion-safe:[animation-delay:300ms] motion-safe:opacity-0">
          <Link
            href="/learn"
            onClick={handleStartClick}
            onMouseEnter={handleButtonHover}
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-base font-extrabold tracking-wide shadow-[0_10px_0_0_rgb(2,132,199)] transition-all duration-200 hover:translate-y-[1px] hover:shadow-[0_8px_0_0_rgb(2,132,199)] hover:scale-[1.02] active:translate-y-[3px] active:shadow-[0_5px_0_0_rgb(2,132,199)] sm:px-8 sm:py-4 sm:text-xl motion-safe:animate-[fadeUp_700ms_ease-out_forwards] cursor-target"
          >
            START LEARNING
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5">
              <path fillRule="evenodd" d="M3 12a.75.75 0 0 1 .75-.75h13.19l-4.72-4.72a.75.75 0 1 1 1.06-1.06l6 6a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 1 1-1.06-1.06l4.72-4.72H3.75A.75.75 0 0 1 3 12Z" clipRule="evenodd" />
            </svg>
          </Link>
          <Link
            href="#roadmap"
            onMouseEnter={handleButtonHover}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-6 py-3 text-base font-bold text-white ring-1 ring-white/25 transition-all duration-200 hover:bg-white/25 hover:scale-[1.015] sm:px-8 sm:py-4 sm:text-xl cursor-target"
          >
            VIEW ROADMAP
          </Link>
        </div>
      </section>
      {/* Iris transition overlay */}
      <IrisTransition ref={irisRef} />
      {/* Iris open on arrival (plays from saved point when available, otherwise center) */}
      <IrisOpenOnMount />
      {/* 3D loading overlay */}
      <LoadingOverlay active={showLoader} />
    </main>
  );
}

// BackgroundDoodles is now imported from components
