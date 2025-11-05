"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
// Small presentational component for decorative images
function Doodle({
  src,
  w,
  className,
  priority = false,
  style,
  imgClass = "",
}: {
  src: string;
  w: number;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
  imgClass?: string;
}) {
  return (
    <div style={style} className={`pointer-events-none absolute ${className ?? ""}`}>
      <Image
        src={src}
        alt=""
        width={w}
        height={w}
        aria-hidden
        priority={priority}
        className={`h-auto ${imgClass}`}
      />
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-sky-500 to-green-300 text-white">
      {/* decorative background doodles */}
      <BackgroundDoodles />

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col items-center justify-center px-4 sm:px-6 text-center">
        {/* logo - no box, just the mark */}
        <div className="mb-6 motion-safe:animate-[popIn_500ms_ease-out_forwards] motion-safe:opacity-0 transition-transform duration-300 will-change-transform hover:scale-[1.06] active:scale-[0.99]">
          <Image
            src="/algohub-transparent.png"
            alt="AlgoHub logo"
            width={360}
            height={360}
            priority
            className="h-auto w-[200px] sm:w-[300px] md:w-[360px] drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)] motion-safe:animate-[logoFloat_8s_ease-in-out_infinite]"
          />
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
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-base font-extrabold tracking-wide shadow-[0_10px_0_0_rgb(2,132,199)] transition-all duration-200 hover:translate-y-[1px] hover:shadow-[0_8px_0_0_rgb(2,132,199)] hover:scale-[1.02] active:translate-y-[3px] active:shadow-[0_5px_0_0_rgb(2,132,199)] sm:px-8 sm:py-4 sm:text-xl motion-safe:animate-[fadeUp_700ms_ease-out_forwards]"
          >
            START LEARNING
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5">
              <path fillRule="evenodd" d="M3 12a.75.75 0 0 1 .75-.75h13.19l-4.72-4.72a.75.75 0 1 1 1.06-1.06l6 6a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 1 1-1.06-1.06l4.72-4.72H3.75A.75.75 0 0 1 3 12Z" clipRule="evenodd" />
            </svg>
          </Link>
          <Link
            href="#roadmap"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-6 py-3 text-base font-bold text-white ring-1 ring-white/25 transition-all duration-200 hover:bg-white/25 hover:scale-[1.015] sm:px-8 sm:py-4 sm:text-xl"
          >
            VIEW ROADMAP
          </Link>
        </div>
      </section>
    </main>
  );
}

function BackgroundDoodles() {
  // track mouse for subtle parallax (disabled if reduced motion)
  const [p, setP] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setP({ x, y });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  // Even distribution using percentage positions
  // Jittered, hand-picked positions for a natural, non-grid feel.
  // Mobile: fewer, smaller items; Desktop: fuller layout.
  const mobileItems = [
    { src: "/db1.png", x: 10, y: 10, w: 52, rot: -6, pri: true },
    { src: "/node1-1.png", x: 85, y: 16, w: 44, rot: 4 },
    { src: "/stats1.png", x: 18, y: 78, w: 42, rot: 2 },
    { src: "/node2-1.png", x: 88, y: 82, w: 46, rot: -3 },
  ];
  const desktopItems = [
    { src: "/db1.png", x: 7, y: 9, w: 68, rot: -6, pri: true },
    { src: "/node1-1.png", x: 22, y: 15, w: 50, rot: 3 },
    { src: "/node2-1.png", x: 86, y: 12, w: 78, rot: -8 },
    { src: "/stats1.png", x: 10, y: 38, w: 54, rot: 2 },
    { src: "/node2-1.png", x: 92, y: 38, w: 66, rot: 5 },
    { src: "/node1-1.png", x: 17, y: 82, w: 52, rot: -4 },
    { src: "/db1.png", x: 44, y: 88, w: 62, rot: 8 },
    { src: "/stats1.png", x: 88, y: 86, w: 58, rot: -3 },
    { src: "/node1-1.png", x: 6, y: 65, w: 44, rot: 6 },
    { src: "/stats1.png", x: 95, y: 64, w: 42, rot: -5 },
    { src: "/db1.png", x: 30, y: 6, w: 46, rot: 2 },
    { src: "/node2-1.png", x: 70, y: 7, w: 48, rot: -2 },
  ];

  return (
    <>
      {/* mobile set */}
      {mobileItems.map((it, i) => {
        const dx = p.x * 6; // gentle on mobile
        const dy = p.y * 6;
        return (
          <Doodle
            key={i}
            src={it.src}
            w={it.w}
            priority={Boolean(it.pri)}
            className={`opacity-45 sm:hidden`}
            imgClass="will-change-transform motion-reduce:animate-none motion-safe:animate-[floaty_7s_ease-in-out_infinite]"
            style={{
              left: `${it.x}%`,
              top: `${it.y}%`,
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${it.rot}deg)`,
            }}
          />
        );
      })}
      {/* desktop+ set */}
      {desktopItems.map((it, i) => {
        const intensity = 12; // px at edges
        const dx = p.x * intensity;
        const dy = p.y * intensity;
        return (
          <Doodle
            key={`d-${i}`}
            src={it.src}
            w={it.w}
            priority={Boolean(it.pri)}
            className={`hidden opacity-55 sm:block`}
            imgClass="will-change-transform motion-reduce:animate-none motion-safe:animate-[floaty_8s_ease-in-out_infinite]"
            style={{
              left: `${it.x}%`,
              top: `${it.y}%`,
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${it.rot}deg)`,
            }}
          />
        );
      })}

      {/* subtle center glow to enhance depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[18vh] w-[18vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-2xl sm:h-[24vh] sm:w-[24vh]"
      />
    </>
  );
}
