"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export const LANDING_GRADIENT = "linear-gradient(180deg, #0ea5e9 0%, #22d3ee 48%, #10b981 100%)";
export const PROFILE_GRADIENT = "linear-gradient(180deg, #020617 0%, #0f172a 52%, #020617 100%)";

export interface SlideTransitionOptions {
  durationMs?: number;
  onCovered?: () => void;
  onDone?: () => void;
  origin?: "left" | "right";
  fromGradient?: string;
  toGradient?: string;
}

export interface SlideTransitionController {
  start: (options?: SlideTransitionOptions) => void;
}

const SlideTransitionContext = createContext<SlideTransitionController | null>(null);

export function SlideTransitionProvider({ children }: { children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const backgroundPrimaryRef = useRef<HTMLDivElement | null>(null);
  const backgroundSecondaryRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const runningRef = useRef(false);
  const currentGradientRef = useRef<string>(LANDING_GRADIENT);

  useEffect(() => {
    if (backgroundPrimaryRef.current) {
      backgroundPrimaryRef.current.style.background = currentGradientRef.current;
    }
  }, []);

  const controller = useMemo<SlideTransitionController>(() => ({
    start: ({
      durationMs = 900,
      onCovered,
      onDone,
      origin = "right",
      fromGradient = currentGradientRef.current,
      toGradient = currentGradientRef.current,
    }: SlideTransitionOptions = {}) => {
      const content = contentRef.current;
      const backgroundPrimary = backgroundPrimaryRef.current;
      const backgroundSecondary = backgroundSecondaryRef.current;

      if (!content || !backgroundPrimary || !backgroundSecondary || runningRef.current) {
        onCovered?.();
        onDone?.();
        return;
      }

      runningRef.current = true;
      timelineRef.current?.kill();

      const reduceMotion = prefersReducedMotion();
      const totalDuration = Math.max(400, reduceMotion ? durationMs * 0.6 : durationMs);
      const exitDuration = totalDuration * 0.45;
      const enterDuration = totalDuration * 0.4;
      const axisDirection = origin === "right" ? 1 : -1;
      const rect = content.getBoundingClientRect();
      const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
      const travelDistance = Math.max(rect.width, viewportWidth, 1);
      const exitOffsetPx = axisDirection * travelDistance;
      const entryOffsetPx = -exitOffsetPx;

      gsap.set(content, { x: 0, xPercent: 0 });
      gsap.set(backgroundPrimary, { background: fromGradient, opacity: 1 });
      gsap.set(backgroundSecondary, { background: toGradient, opacity: 0 });

      const timeline = gsap.timeline({
        defaults: { ease: reduceMotion ? "power1.out" : "power3.inOut" },
        onComplete: () => {
          runningRef.current = false;
          currentGradientRef.current = toGradient;
          gsap.set(content, { x: 0, xPercent: 0 });
          gsap.set(backgroundPrimary, { background: toGradient, opacity: 1 });
          gsap.set(backgroundSecondary, { opacity: 0 });
          onDone?.();
        },
      });

      timeline.to(content, {
        x: exitOffsetPx,
        duration: exitDuration / 1000,
        onComplete: () => {
          try {
            onCovered?.();
          } catch (error) {
            console.error("Slide transition onCovered callback failed", error);
          }
        },
      });

      timeline.set(content, { x: entryOffsetPx, xPercent: 0 });

      timeline.to(content, {
        x: 0,
        duration: enterDuration / 1000,
      });

      timeline.to(
        backgroundSecondary,
        {
          opacity: 1,
          duration: totalDuration / 1000,
          ease: "linear",
        },
        0,
      );

      timeline.to(
        backgroundPrimary,
        {
          opacity: 0,
          duration: totalDuration / 1000,
          ease: "linear",
        },
        0,
      );

      timelineRef.current = timeline;
    },
  }), []);

  useEffect(
    () => () => {
      timelineRef.current?.kill();
    },
    [],
  );

  return (
    <SlideTransitionContext.Provider value={controller}>
      <div className="relative min-h-[100dvh] w-full overflow-hidden">
        <div ref={backgroundPrimaryRef} className="pointer-events-none absolute inset-0 -z-20" />
        <div ref={backgroundSecondaryRef} className="pointer-events-none absolute inset-0 -z-10 opacity-0" />
        <div ref={contentRef} className="relative z-0 min-h-[100dvh]" style={{ willChange: "transform" }}>
          {children}
        </div>
      </div>
    </SlideTransitionContext.Provider>
  );
}

const fallbackController: SlideTransitionController = {
  start: (options?: SlideTransitionOptions) => {
    try {
      options?.onCovered?.();
    } finally {
      options?.onDone?.();
    }
  },
};

export function useSlideTransition(): SlideTransitionController {
  return useContext(SlideTransitionContext) ?? fallbackController;
}
