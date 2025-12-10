"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState, type MouseEventHandler } from "react";
import { useRouter } from "next/navigation";
import IrisOpenOnMount from "../../components/ui/IrisOpenOnMount";
import IrisTransition, { IrisHandle } from "../../components/ui/IrisTransition";
import { useEffect } from "@/hooks/useEffect";
import { GLOBAL_LOADER_MIN_MS, hideGlobalLoader, showGlobalLoader } from "../../../lib/transition/globalLoaderBus";
import { setIrisPoint } from "../../../lib/transition/transitionBus";
import { playSfx } from "../../../lib/audio/sfx";

const ParkingScene = dynamic(() => import("./ParkingScene.jsx"), { ssr: false });

export default function ParkingPage() {
  const [showStackState, setShowStackState] = useState(false);
  const [showQueueState, setShowQueueState] = useState(false);
  const [stackActive, setStackActive] = useState(false);
  const [queueActive, setQueueActive] = useState(false);
  const irisRef = useRef<IrisHandle | null>(null);
  const transitioningRef = useRef(false);
  const loaderDelayRef = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const id = window.setTimeout(() => hideGlobalLoader(), 300);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => () => {
    if (loaderDelayRef.current !== null) {
      clearTimeout(loaderDelayRef.current);
      loaderDelayRef.current = null;
    }
  }, []);

  const handleBackToMainMenu = useCallback((origin?: { x?: number; y?: number }) => {
    if (transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    try {
      playSfx("/button_click.mp3", 0.6);
    } catch {}

    let x = typeof origin?.x === "number" ? origin.x : undefined;
    let y = typeof origin?.y === "number" ? origin.y : undefined;

    if ((typeof x !== "number" || typeof y !== "number") && typeof window !== "undefined") {
      x = window.innerWidth / 2;
      y = window.innerHeight / 2;
    }

    if (typeof x === "number" && typeof y === "number") {
      try {
        setIrisPoint(x, y);
      } catch {}
    }

    const beginNavigation = (loaderVisible: boolean) => {
      if (!loaderVisible) {
        showGlobalLoader();
      }
      if (loaderDelayRef.current !== null) {
        clearTimeout(loaderDelayRef.current);
      }
      loaderDelayRef.current = window.setTimeout(() => {
        router.push("/learn");
        transitioningRef.current = false;
        loaderDelayRef.current = null;
      }, GLOBAL_LOADER_MIN_MS);
    };

    const controller = irisRef.current;
    if (controller) {
      controller.start({
        x,
        y,
        durationMs: 650,
        mode: "close",
        showLoaderOnClose: true,
        onDone: () => beginNavigation(true),
      });
    } else {
      beginNavigation(false);
    }
  }, [router]);

  const handleMobileBackClick = useCallback<MouseEventHandler<HTMLAnchorElement>>(
    (event) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      let x: number | undefined = event.clientX;
      let y: number | undefined = event.clientY;
      if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
      handleBackToMainMenu({ x, y });
    },
    [handleBackToMainMenu]
  );

  return (
    <div className="relative h-[100dvh] w-full">
      {/* Open iris when arriving after license flow */}
      <IrisOpenOnMount durationMs={650} />
      <ParkingScene
        showStackState={showStackState}
        showQueueState={showQueueState}
        onStackMinigameChange={(active: boolean) => {
          setStackActive(active);
          if (!active) {
            setShowStackState(false);
          }
        }}
        onQueueMinigameChange={(active: boolean) => {
          setQueueActive(active);
          if (!active) {
            setShowQueueState(false);
          }
        }}
        onRequestMainMenu={handleBackToMainMenu}
      />
      <IrisTransition ref={irisRef} />
      {/* Back to Learn menu */}
      <div className="pointer-events-none absolute left-4 top-4 z-30 sm:left-6 sm:top-6">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <Link
            href="/learn"
            onClick={handleMobileBackClick}
            className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-black/60 sm:px-4 sm:py-2.5 md:hidden"
            aria-label="Back to menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            <span className="hidden sm:inline">Menu</span>
          </Link>
          {stackActive && (
            <button
              type="button"
              onClick={() => setShowStackState((value) => !value)}
              className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/55 sm:text-[13px]"
              aria-pressed={showStackState}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: showStackState ? "#38bdf8" : "rgba(255,255,255,0.45)" }} />
              {showStackState ? "Hide Stack Arrays" : "Show Stack Arrays"}
            </button>
          )}
          {queueActive && (
            <button
              type="button"
              onClick={() => setShowQueueState((value) => !value)}
              className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/55 sm:text-[13px]"
              aria-pressed={showQueueState}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: showQueueState ? "#38bdf8" : "rgba(255,255,255,0.45)" }} />
              {showQueueState ? "Hide Queue Arrays" : "Show Queue Arrays"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
