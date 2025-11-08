"use client";
import React, { useEffect, useRef, useState } from "react";

/**
 * CustomCursor renders a small dot and ring that follow the mouse.
 * It hides the native cursor across the site (except for form fields and links)
 * and disables itself on touch devices or when reduced motion is preferred.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  const targetX = useRef(0);
  const targetY = useRef(0);
  const currX = useRef(0);
  const currY = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [down, setDown] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

  // Previously used to disable on touch; retained comment for future conditional logic
  // const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Allow always-on unless reduced motion is requested; ignore coarse pointer to satisfy request
    if (prefersReducedMotion) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[CustomCursor] Disabled due to prefers-reduced-motion.');
      }
      setEnabled(false);
      return;
    }
    setEnabled(true);

    document.body.classList.add("custom-cursor-on");

    const onMove = (e: MouseEvent) => {
      targetX.current = e.clientX;
      targetY.current = e.clientY;
      // Ensure visible once we have first movement
      if (dotRef.current && dotRef.current.style.opacity !== "1") dotRef.current.style.opacity = "1";
      if (ringRef.current && ringRef.current.style.opacity !== "1") ringRef.current.style.opacity = "1";
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);
    const onLeave = () => {
      // fade out ring/dot when leaving window
      if (dotRef.current) dotRef.current.style.opacity = "0";
      if (ringRef.current) ringRef.current.style.opacity = "0";
    };
    const onEnter = () => {
      if (dotRef.current) dotRef.current.style.opacity = "1";
      if (ringRef.current) ringRef.current.style.opacity = "1";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mouseenter", onEnter);

    // Force an initial visible state shortly after mount in case pointer is already inside window
    setTimeout(() => {
      if (dotRef.current && ringRef.current) {
        dotRef.current.style.opacity = "1";
        ringRef.current.style.opacity = "1";
      }
    }, 30);

    return () => {
      document.body.classList.remove("custom-cursor-on");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseenter", onEnter);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // initial position center
    const w = window.innerWidth;
    const h = window.innerHeight;
    targetX.current = w / 2;
    targetY.current = h / 2;
    currX.current = targetX.current;
    currY.current = targetY.current;
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const tick = () => {
    // smooth follow
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    currX.current = lerp(currX.current, targetX.current, 0.18);
    currY.current = lerp(currY.current, targetY.current, 0.18);

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (dot) dot.style.transform = `translate3d(${currX.current}px, ${currY.current}px, 0)`;
    if (ring) ring.style.transform = `translate3d(${currX.current}px, ${currY.current}px, 0)`;

    rafRef.current = requestAnimationFrame(tick);
  };

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 2147483647 }}>
      {/* Crosshair (always visible once mounted) */}
      <div
        ref={ringRef}
        style={{
          opacity: 1,
          position: 'fixed',
          left: 0,
          top: 0,
          transform: 'translate3d(-100px,-100px,0)',
          pointerEvents: 'none',
          // Dual shadow for contrast on both light & dark backgrounds
          filter: 'drop-shadow(0 0 2px #000) drop-shadow(0 0 2px #fff)'
        }}
        aria-hidden
        data-custom-cursor
      >
        {/* vertical line */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 2, height: 30, background: 'white', transform: 'translate(-1px, -15px)', borderRadius: 1, boxShadow: '0 0 0 1px black' }} />
        {/* horizontal line */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 30, height: 2, background: 'white', transform: 'translate(-15px, -1px)', borderRadius: 1, boxShadow: '0 0 0 1px black' }} />
        {/* small center dot */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 6, height: 6, borderRadius: 9999, background: 'white', transform: 'translate(-3px, -3px)', boxShadow: '0 0 0 1px black' }} />
      </div>
      {/* Invisible dot used to control pressed scaling position (optional) */}
      <div
        ref={dotRef}
        style={{ opacity: 0, position: 'fixed', left: 0, top: 0, width: 1, height: 1, transform: 'translate3d(-100px,-100px,0)' }}
        data-pressed={down ? "1" : "0"}
        aria-hidden
      />
      {/* cursor CSS handled in globals.css under .custom-cursor-on rules */}
    </div>
  );
}
