"use client";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect } from "@/hooks/useEffect";
import { useState } from "@/hooks/useState";

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
  style?: CSSProperties;
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

export default function BackgroundDoodles() {
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
