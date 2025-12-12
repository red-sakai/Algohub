"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { playSfx } from "../../../lib/audio/sfx";
import dynamic from "next/dynamic";

// Use dynamic import to prevent SSR issues with Phaser, but load immediately
const DungeonGame = dynamic(() => import("./DungeonGame"), {
  ssr: false,
  loading: () => null, // No loading component - instant
});

export default function DungeonPage() {
  const router = useRouter();

  const handleBackClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    e.preventDefault();
    playSfx("/button_click.mp3", 0.6);
    router.push("/learn");
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Back button */}
      <div className="pointer-events-none absolute left-4 top-4 z-30 sm:left-6 sm:top-6">
        <Link
          href="/learn"
          onClick={handleBackClick}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-md hover:bg-black/60 sm:px-4 sm:py-2.5"
          aria-label="Back to learn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
          <span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      <DungeonGame />
    </main>
  );
}
