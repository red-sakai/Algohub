"use client"

import BackgroundDoodles from "../components/sections/BackgroundDoodles";
import IrisOpenOnMount from "../components/ui/IrisOpenOnMount";
import IrisTransition, { IrisHandle } from "../components/ui/IrisTransition";
import GameScroller from "../components/sections/GameScroller";
import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { setIrisPoint } from "../components/ui/transitionBus";
import { playSfx } from "../components/ui/sfx";
import LoadingOverlay from "../components/ui/LoadingOverlay";
import { useState } from "react";

export default function LearnPage() {
  const irisRef = useRef<IrisHandle | null>(null);
  const transitioningRef = useRef(false);
  const router = useRouter();
  const [showLoader, setShowLoader] = useState(false);

  const handleBackClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let modified clicks through
    e.preventDefault();
    playSfx("/button_click.mp3", 0.6);
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    // center from click or button rect center
    let x = e.clientX as number | undefined;
    let y = e.clientY as number | undefined;
    if (typeof x !== "number" || typeof y !== "number" || (x === 0 && y === 0)) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
    setIrisPoint(x, y);
    irisRef.current?.start({
      x,
      y,
      durationMs: 650,
      mode: "close",
      onDone: () => {
        setShowLoader(true);
        setTimeout(() => {
          router.push("/");
          setTimeout(() => {
            transitioningRef.current = false;
            setShowLoader(false);
          }, 200);
        }, 2400);
      },
    });
  };
  // For now, we only render the animated background and play iris open on arrival.
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-sky-500 to-green-300 text-white">
      <BackgroundDoodles />
      <IrisOpenOnMount />
      {/* Back to landing */}
      <div className="pointer-events-none absolute left-4 top-4 z-30 sm:left-6 sm:top-6">
        <Link
          href="/"
          onClick={handleBackClick}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-black/60 sm:px-4 sm:py-2.5"
          aria-label="Back to landing"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          <span className="hidden sm:inline">Back</span>
        </Link>
      </div>
      <GameScroller />
      {/* Iris transition overlay for close */}
      <IrisTransition ref={irisRef} />
      {/* 3D loading overlay */}
      <LoadingOverlay active={showLoader} />
    </main>
  );
}
