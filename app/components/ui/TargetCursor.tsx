'use client';

import { useCallback } from '@/hooks/useCallback';
import { useEffect } from '@/hooks/useEffect';
import { useMemo } from '@/hooks/useMemo';
import { useRef } from '@/hooks/useRef';
import { gsap } from 'gsap';

export interface TargetCursorProps {
  targetSelector?: string;
  spinDuration?: number;
  hideDefaultCursor?: boolean;
  hoverDuration?: number;
  parallaxOn?: boolean;
}

export default function TargetCursor({
  targetSelector = '.cursor-target',
  spinDuration = 2,
  hideDefaultCursor = true,
  hoverDuration = 0.2,
  parallaxOn = true
}: TargetCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cornersRef = useRef<NodeListOf<HTMLDivElement> | null>(null);
  const spinTlRef = useRef<gsap.core.Timeline | null>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const scrollSyncFramesRef = useRef(0);

  const isActiveRef = useRef(false);
  const targetCornerPositionsRef = useRef<{ x: number; y: number }[] | null>(null);
  const tickerFnRef = useRef<(() => void) | null>(null);
  const activeStrengthRef = useRef({ value: 0 });

  const isClient = typeof window !== 'undefined' && typeof navigator !== 'undefined';

  const isMobile = useMemo(() => {
    if (!isClient) {
      return false;
    }
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const userAgent = navigator.userAgent || navigator.vendor || '';
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());
    return (hasTouchScreen && isSmallScreen) || isMobileUserAgent;
  }, [isClient]);

  const constants = useMemo(() => ({ borderWidth: 3, cornerSize: 12 }), []);

  const moveCursor = useCallback((x: number, y: number, options?: { duration?: number }) => {
    if (!cursorRef.current) return;
    const duration = options?.duration ?? 0.1;
    if (duration === 0) {
      gsap.set(cursorRef.current, { x, y, overwrite: 'auto' });
      return;
    }
    gsap.to(cursorRef.current, { x, y, duration, ease: 'power3.out', overwrite: 'auto' });
  }, []);

  useEffect(() => {
    if (isMobile || !cursorRef.current) return;

    const activeStrength = activeStrengthRef.current;
    const originalCursor = document.body.style.cursor;
    if (hideDefaultCursor) {
      document.body.style.cursor = 'none';
    }

    const cursor = cursorRef.current;
    cornersRef.current = cursor.querySelectorAll<HTMLDivElement>('.target-cursor-corner');

    let activeTarget: Element | null = null;
    let currentLeaveHandler: (() => void) | null = null;
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null;

    const disconnectObserver = () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };

    const cleanupTarget = (target: Element) => {
      if (currentLeaveHandler) {
        target.removeEventListener('mouseleave', currentLeaveHandler);
      }
      currentLeaveHandler = null;
      disconnectObserver();
    };

    const computeCornerPositions = (target: Element) => {
      const rect = target.getBoundingClientRect();
      const { borderWidth, cornerSize } = constants;
      return [
        { x: rect.left - borderWidth, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
        { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize }
      ];
    };

    const syncCornerPositions = (duration = 0.18) => {
      if (!cursorRef.current || !cornersRef.current || !targetCornerPositionsRef.current) {
        return;
      }
      const cursorX = gsap.getProperty(cursorRef.current, 'x') as number;
      const cursorY = gsap.getProperty(cursorRef.current, 'y') as number;
      const corners = Array.from(cornersRef.current);
      corners.forEach((corner, index) => {
        const target = targetCornerPositionsRef.current![index];
        gsap.to(corner, {
          x: target.x - cursorX,
          y: target.y - cursorY,
          duration,
          ease: duration === 0 ? 'none' : 'power2.out',
          overwrite: 'auto'
        });
      });
    };

    const observeTarget = (target: Element) => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      disconnectObserver();
      const observer = new ResizeObserver(() => {
        targetCornerPositionsRef.current = computeCornerPositions(target);
        syncCornerPositions(0);
      });
      observer.observe(target);
      resizeObserverRef.current = observer;
    };

    const resolveTargetFromEvent = (event: MouseEvent): Element | null => {
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      if (Array.isArray(path)) {
        for (const entry of path) {
          if (entry instanceof Element && entry.matches(targetSelector)) {
            return entry;
          }
        }
      }
      const directTarget = event.target as Element | null;
      let current: Element | null = directTarget;
      while (current && current !== document.body) {
        if (current.matches(targetSelector)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    };

    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    });
    lastPointerRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const createSpinTimeline = () => {
      if (spinTlRef.current) {
        spinTlRef.current.kill();
      }
      spinTlRef.current = gsap
        .timeline({ repeat: -1 })
        .to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' });
    };

    createSpinTimeline();

    const tickerFn = () => {
      if (!targetCornerPositionsRef.current || !cursorRef.current || !cornersRef.current) {
        return;
      }
      const strength = activeStrength.value;
      if (strength === 0) return;
      const cursorX = gsap.getProperty(cursorRef.current, 'x') as number;
      const cursorY = gsap.getProperty(cursorRef.current, 'y') as number;
      const corners = Array.from(cornersRef.current);
      const immediateSync = scrollSyncFramesRef.current > 0;
      if (immediateSync) {
        scrollSyncFramesRef.current -= 1;
      }
      corners.forEach((corner, i) => {
        const currentX = gsap.getProperty(corner, 'x') as number;
        const currentY = gsap.getProperty(corner, 'y') as number;
        const targetX = targetCornerPositionsRef.current![i].x - cursorX;
        const targetY = targetCornerPositionsRef.current![i].y - cursorY;
        if (immediateSync) {
          gsap.set(corner, {
            x: targetX,
            y: targetY,
            overwrite: 'auto'
          });
          return;
        }
        const finalX = currentX + (targetX - currentX) * strength;
        const finalY = currentY + (targetY - currentY) * strength;
        const duration = strength >= 0.99 ? (parallaxOn ? 0.18 : 0) : 0.05;
        gsap.to(corner, {
          x: finalX,
          y: finalY,
          duration,
          ease: duration === 0 ? 'none' : 'power1.out',
          overwrite: 'auto'
        });
      });
    };

    tickerFnRef.current = tickerFn;

    const moveHandler = (e: MouseEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      moveCursor(e.clientX, e.clientY, { duration: isActiveRef.current ? 0 : 0.1 });
    };
    window.addEventListener('mousemove', moveHandler);

    const scrollHandler = () => {
      if (!cursorRef.current) return;
      const { x, y } = lastPointerRef.current;
      moveCursor(x, y, { duration: 0 });
      if (!activeTarget) return;
      targetCornerPositionsRef.current = computeCornerPositions(activeTarget);
      scrollSyncFramesRef.current = Math.max(scrollSyncFramesRef.current, 3);
      syncCornerPositions(0);
      const elementUnderMouse = document.elementFromPoint(x, y);
      const isStillOverTarget =
        elementUnderMouse &&
        (elementUnderMouse === activeTarget || elementUnderMouse.closest(targetSelector) === activeTarget);
      if (!isStillOverTarget) {
        currentLeaveHandler?.();
      }
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });

    const resizeHandler = () => {
      if (!cursorRef.current) return;
      const { x, y } = lastPointerRef.current;
      moveCursor(x, y, { duration: 0 });
      if (!activeTarget) return;
      targetCornerPositionsRef.current = computeCornerPositions(activeTarget);
        scrollSyncFramesRef.current = Math.max(scrollSyncFramesRef.current, 3);
        syncCornerPositions(0);
    };
    window.addEventListener('resize', resizeHandler);

    const mouseDownHandler = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.3 });
      gsap.to(cursorRef.current, { scale: 0.9, duration: 0.2 });
    };

    const mouseUpHandler = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 1, duration: 0.3 });
      gsap.to(cursorRef.current, { scale: 1, duration: 0.2 });
    };

    window.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mouseup', mouseUpHandler);

    const enterHandler = (e: MouseEvent) => {
      const target = resolveTargetFromEvent(e);
      if (!target || !cursorRef.current || !cornersRef.current) return;
      if (activeTarget === target) return;
      if (activeTarget) {
        cleanupTarget(activeTarget);
      }
      if (resumeTimeout) {
        clearTimeout(resumeTimeout);
        resumeTimeout = null;
      }

      activeTarget = target;
      const corners = Array.from(cornersRef.current);
      corners.forEach(corner => gsap.killTweensOf(corner));
      gsap.killTweensOf(cursorRef.current, 'rotation');
      spinTlRef.current?.pause();
      gsap.set(cursorRef.current, { rotation: 0 });

      targetCornerPositionsRef.current = computeCornerPositions(target);
      observeTarget(target);

      isActiveRef.current = true;
      moveCursor(lastPointerRef.current.x, lastPointerRef.current.y, { duration: 0 });
      gsap.ticker.add(tickerFnRef.current!);

      gsap.to(activeStrength, { value: 1, duration: hoverDuration, ease: 'power2.out' });

      syncCornerPositions(0.2);

      const leaveHandler = () => {
        gsap.ticker.remove(tickerFnRef.current!);
        isActiveRef.current = false;
        targetCornerPositionsRef.current = null;
        gsap.set(activeStrength, { value: 0, overwrite: true });
        activeTarget = null;
        if (cornersRef.current) {
          const corners = Array.from(cornersRef.current);
          gsap.killTweensOf(corners);
          const { cornerSize } = constants;
          const positions = [
            { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
            { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
            { x: cornerSize * 0.5, y: cornerSize * 0.5 },
            { x: -cornerSize * 1.5, y: cornerSize * 0.5 }
          ];
          const tl = gsap.timeline();
          corners.forEach((corner, index) => {
            tl.to(corner, { x: positions[index].x, y: positions[index].y, duration: 0.3, ease: 'power3.out' }, 0);
          });
        }
        resumeTimeout = setTimeout(() => {
            if (!activeTarget && cursorRef.current && spinTlRef.current) {
            const currentRotation = gsap.getProperty(cursorRef.current, 'rotation') as number;
            const normalizedRotation = currentRotation % 360;
              spinTlRef.current.kill();
              spinTlRef.current = gsap
              .timeline({ repeat: -1 })
              .to(cursorRef.current, { rotation: '+=360', duration: spinDuration, ease: 'none' });
            gsap.to(cursorRef.current, {
              rotation: normalizedRotation + 360,
              duration: spinDuration * (1 - normalizedRotation / 360),
              ease: 'none',
              onComplete: () => {
                  spinTlRef.current?.restart();
              }
            });
          }
          resumeTimeout = null;
        }, 50);
        cleanupTarget(target);
      };
      currentLeaveHandler = leaveHandler;
      target.addEventListener('mouseleave', leaveHandler);
    };

    window.addEventListener('mouseover', enterHandler as EventListener);

    return () => {
      if (tickerFnRef.current) {
        gsap.ticker.remove(tickerFnRef.current);
      }
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseover', enterHandler as EventListener);
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('mousedown', mouseDownHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
      if (activeTarget) {
        cleanupTarget(activeTarget);
      }
      disconnectObserver();
      spinTlRef.current?.kill();
      document.body.style.cursor = originalCursor;
      isActiveRef.current = false;
      targetCornerPositionsRef.current = null;
      activeStrength.value = 0;
    };
  }, [targetSelector, spinDuration, moveCursor, constants, hideDefaultCursor, isMobile, hoverDuration, parallaxOn]);

  useEffect(() => {
    if (isMobile || !cursorRef.current || !spinTlRef.current) return;
    if (spinTlRef.current.isActive()) {
      spinTlRef.current.kill();
      spinTlRef.current = gsap
        .timeline({ repeat: -1 })
        .to(cursorRef.current, { rotation: '+=360', duration: spinDuration, ease: 'none' });
    }
  }, [spinDuration, isMobile]);

  if (isMobile) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 w-0 h-0 pointer-events-none z-[9999]"
      style={{ willChange: 'transform' }}
    >
      <div
        ref={dotRef}
        className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{ willChange: 'transform' }}
      />
      <div
        className="target-cursor-corner absolute top-1/2 left-1/2 w-3 h-3 border-[3px] border-white -translate-x-[150%] -translate-y-[150%] border-r-0 border-b-0"
        style={{ willChange: 'transform' }}
      />
      <div
        className="target-cursor-corner absolute top-1/2 left-1/2 w-3 h-3 border-[3px] border-white translate-x-1/2 -translate-y-[150%] border-l-0 border-b-0"
        style={{ willChange: 'transform' }}
      />
      <div
        className="target-cursor-corner absolute top-1/2 left-1/2 w-3 h-3 border-[3px] border-white translate-x-1/2 translate-y-1/2 border-l-0 border-t-0"
        style={{ willChange: 'transform' }}
      />
      <div
        className="target-cursor-corner absolute top-1/2 left-1/2 w-3 h-3 border-[3px] border-white -translate-x-[150%] translate-y-1/2 border-r-0 border-t-0"
        style={{ willChange: 'transform' }}
      />
    </div>
  );
}
