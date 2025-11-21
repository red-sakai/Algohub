"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import IrisOpenOnMount from "../../components/ui/IrisOpenOnMount";

const ParkingScene = dynamic(() => import("./ParkingScene.jsx"), { ssr: false });

export default function ParkingPage() {
  const [showQueueState, setShowQueueState] = useState(false);
  const [queueActive, setQueueActive] = useState(false);

  return (
    <div className="relative h-[100dvh] w-full">
      {/* Open iris when arriving after license flow */}
      <IrisOpenOnMount durationMs={650} />
      <ParkingScene
        showQueueState={showQueueState}
        onQueueMinigameChange={(active: boolean) => {
          setQueueActive(active);
          if (!active) {
            setShowQueueState(false);
          }
        }}
      />
      {/* Back to Learn menu */}
      <div className="pointer-events-none absolute left-4 top-4 z-30 sm:left-6 sm:top-6">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-black/60 sm:px-4 sm:py-2.5"
            aria-label="Back to menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            <span className="hidden sm:inline">Menu</span>
          </Link>
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
