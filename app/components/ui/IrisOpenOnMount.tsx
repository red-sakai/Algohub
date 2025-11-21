"use client";
import { useEffect } from "@/hooks/useEffect";
import { useRef } from "@/hooks/useRef";
import IrisTransition, { IrisHandle } from "./IrisTransition";
import { consumeIrisPoint } from "../../../lib/transition/transitionBus";

export default function IrisOpenOnMount({ durationMs = 650, requirePoint = false }: { durationMs?: number; requirePoint?: boolean }) {
  const ref = useRef<IrisHandle | null>(null);
  useEffect(() => {
    const p = consumeIrisPoint();
    // Defer one frame so DOM has painted before starting the animation
    const id = requestAnimationFrame(() => {
      if (p) {
        ref.current?.start({ x: p.x, y: p.y, durationMs, mode: "open" });
      } else if (!requirePoint) {
        ref.current?.start({ durationMs, mode: "open" });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [durationMs, requirePoint]);
  return <IrisTransition ref={ref} />;
}
