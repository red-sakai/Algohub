"use client";
import React, { useEffect, useImperativeHandle, useRef, useState } from "react";

export type IrisHandle = {
  start: (opts?: { x?: number; y?: number; durationMs?: number; onDone?: () => void; mode?: "close" | "open" }) => void;
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export default React.forwardRef<IrisHandle, { zIndex?: number }>(function IrisTransition(
  { zIndex = 1000 },
  ref
) {
  const [visible, setVisible] = useState(false);
  const [cx, setCx] = useState(0);
  const [cy, setCy] = useState(0);
  const [r, setR] = useState(0);
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const fadeMs = 160;

  useImperativeHandle(ref, () => ({
    start: ({ x, y, durationMs = 600, onDone, mode = "close" } = {}) => {
      if (runningRef.current) return;
      const reduce = prefersReducedMotion();
  const vwNow = window.innerWidth;
  const vhNow = window.innerHeight;
  setVw(vwNow);
  setVh(vhNow);
  const cxVal = typeof x === "number" ? x : vwNow / 2;
  const cyVal = typeof y === "number" ? y : vhNow / 2;

      // If user prefers reduced motion, keep the animation but shorter (no hard skip)
      const effectiveDuration = reduce ? Math.min(300, Math.max(180, durationMs)) : durationMs;

      // Compute a radius big enough to cover the farthest corner
  const dx = Math.max(cxVal, vwNow - cxVal);
  const dy = Math.max(cyVal, vhNow - cyVal);
      const startR = Math.hypot(dx, dy) + 20; // pad a bit

  setCx(cxVal);
  setCy(cyVal);
  // Initialize radius based on mode: open starts from 0, close starts from full
  setR(mode === "open" ? 0 : startR);
  setVisible(true);
  setOpacity(1);

      runningRef.current = true;
      const t0 = performance.now();
      const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

      const step = (now: number) => {
        const elapsed = now - t0;
        const p = Math.min(1, elapsed / effectiveDuration);
        const e = easeInOut(p);
        const r = mode === "open" ? startR * e : startR * (1 - e); // open grows, close shrinks
        setR(r);
        // Continue or finish
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          runningRef.current = false;
          if (mode === "close") {
            // Immediately proceed (e.g., navigate) while keeping the black overlay visible
            // so the previous page doesn't flash back before the route change completes.
            onDone?.();
          } else {
            // For 'open', fade the overlay out so content is revealed smoothly
            setOpacity(0);
            setTimeout(() => {
              setVisible(false);
              onDone?.();
            }, fadeMs);
          }
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
  }));

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Track viewport size for correct SVG dimensions
  useEffect(() => {
    const update = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!visible) return null;

  // SVG mask: black rect with a circular transparent hole at (cx, cy) with radius rRef.current
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex, opacity, transition: `opacity ${fadeMs}ms ease-out` }} aria-hidden>
      <svg width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          <mask id="iris-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width={vw} height={vh}>
            <rect x="0" y="0" width={vw} height={vh} fill="white" />
            <circle cx={cx} cy={cy} r={r} fill="black" />
          </mask>
        </defs>
        <rect x="0" y="0" width={vw} height={vh} fill="black" mask="url(#iris-mask)" />
      </svg>
    </div>
  );
});
