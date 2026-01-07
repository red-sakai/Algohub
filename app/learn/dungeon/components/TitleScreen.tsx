"use client";

import Image from "next/image";

interface TitleScreenProps {
  onClick: () => void;
}

export function TitleScreen({ onClick }: TitleScreenProps) {
  return (
    <>
      {/* Vignette effect */}
      <div className="fixed inset-0 bg-linear-to-b from-black/40 via-transparent to-black/60 pointer-events-none -z-5" />
      <div
        className="fixed inset-0 pointer-events-none -z-5"
        style={{
          background:
            "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* Animated glow orbs */}
      <div
        className="fixed top-20 left-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse pointer-events-none -z-5"
        style={{ animationDuration: "4s" }}
      />
      <div
        className="fixed bottom-20 right-20 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse pointer-events-none -z-5"
        style={{ animationDuration: "5s", animationDelay: "1s" }}
      />

      <div
        className="flex flex-col items-center justify-center min-h-screen cursor-pointer relative z-10 px-4"
        onClick={onClick}
      >
        <div className="flex flex-col items-center gap-4 sm:gap-8 w-full max-w-3xl">
          <Image
            src="/sprite/title.png"
            alt="Node Quest"
            width={896}
            height={224}
            priority
            className="w-full h-auto drop-shadow-[0_0_40px_rgba(255,180,0,0.6)] transition-all duration-300 hover:drop-shadow-[0_0_60px_rgba(255,180,0,0.8)] hover:scale-105"
            style={{ imageRendering: "pixelated" }}
          />
          <p className="text-white text-base sm:text-xl md:text-2xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] bg-black/40 backdrop-blur-md px-4 sm:px-8 py-3 sm:py-4 rounded-lg border-2 border-yellow-500/30 shadow-[0_0_20px_rgba(255,180,0,0.3)] animate-pulse text-center">
            Click anywhere to start
          </p>
        </div>
      </div>
    </>
  );
}
