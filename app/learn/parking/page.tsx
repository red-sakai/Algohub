"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import IrisOpenOnMount from "../../components/ui/IrisOpenOnMount";

const ParkingScene = dynamic(() => import("./ParkingScene.jsx"), { ssr: false });

export default function ParkingPage() {
  return (
    <div className="relative h-[100dvh] w-full">
      {/* Open iris when arriving after license flow */}
      <IrisOpenOnMount durationMs={650} />
      <ParkingScene />
      {/* Back to Learn menu */}
      <div className="pointer-events-none absolute left-4 top-4 z-30 sm:left-6 sm:top-6">
        <Link
          href="/learn"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-black/60 sm:px-4 sm:py-2.5"
          aria-label="Back to menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          <span className="hidden sm:inline">Menu</span>
        </Link>
      </div>
      <div className="pointer-events-none absolute left-4 top-16 z-10 select-none rounded bg-black/50 px-3 py-2 text-white ring-1 ring-white/20 backdrop-blur sm:top-20">
        <div className="text-sm font-semibold">3D Parking</div>
        <div className="text-xs opacity-90">WASD / Arrows to drive • Drag to orbit</div>
      </div>
    </div>
  );
}
