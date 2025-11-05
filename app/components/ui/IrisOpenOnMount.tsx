"use client";
import React, { useEffect, useRef } from "react";
import IrisTransition, { IrisHandle } from "./IrisTransition";
import { consumeIrisPoint } from "./transitionBus";

export default function IrisOpenOnMount({ durationMs = 650 }: { durationMs?: number }) {
  const ref = useRef<IrisHandle | null>(null);
  useEffect(() => {
    const p = consumeIrisPoint();
    // Defer one frame so DOM has painted before starting the animation
    const id = requestAnimationFrame(() => {
      if (p) {
        ref.current?.start({ x: p.x, y: p.y, durationMs, mode: "open" });
      } else {
        ref.current?.start({ durationMs, mode: "open" });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [durationMs]);
  return <IrisTransition ref={ref} />;
}
