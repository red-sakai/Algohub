"use client";
import React, { useEffect, useRef } from "react";

type Direction = "up" | "down" | "left" | "right" | "diagonal";

export default function Squares({
  speed = 0.5,
  squareSize = 40,
  direction = "diagonal",
  borderColor = "#ffffff",
  hoverFillColor = "#222222",
  className,
}: {
  speed?: number; // pixels per second
  squareSize?: number;
  direction?: Direction;
  borderColor?: string;
  hoverFillColor?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const offsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const dprRef = useRef<number>(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = (window.devicePixelRatio || 1);
      dprRef.current = dpr;
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      hoverRef.current = { x, y };
    };
    const onMouseLeave = () => { hoverRef.current = null; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    const step = (ts: number) => {
      const { width, height } = canvas;
      const dpr = dprRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dt = Math.min(64, ts - (lastTsRef.current || ts));
      lastTsRef.current = ts;

      // Update offset based on direction
      const offs = offsetRef.current;
      const sz = squareSize * dpr;
      // Interpret speed as squares per second; convert to device pixels
      const deltaPx = (speed * dt / 1000) * sz;
      switch (direction) {
        case "up":
          offs.y -= deltaPx;
          break;
        case "down":
          offs.y += deltaPx;
          break;
        case "left":
          offs.x -= deltaPx;
          break;
        case "right":
          offs.x += deltaPx;
          break;
        case "diagonal":
        default:
          offs.x += deltaPx * 0.7071;
          offs.y += deltaPx * 0.7071;
          break;
      }

      // Normalize offset to [-squareSize, squareSize] range
      if (offs.x > sz) offs.x -= sz;
      if (offs.x < -sz) offs.x += sz;
      if (offs.y > sz) offs.y -= sz;
      if (offs.y < -sz) offs.y += sz;

      ctx.clearRect(0, 0, width, height);

      // Compute hover cell in canvas space
      let hoverCol: number | null = null;
      let hoverRow: number | null = null;
      if (hoverRef.current) {
        // Convert mouse to device pixels
        const mx = hoverRef.current.x * dpr;
        const my = hoverRef.current.y * dpr;
        const col = Math.floor((mx + (sz - (offs.x % sz))) / sz);
        const row = Math.floor((my + (sz - (offs.y % sz))) / sz);
        hoverCol = col;
        hoverRow = row;
      }

      // Draw grid
      ctx.save();
      ctx.lineWidth = Math.max(1, Math.floor(dpr));
      ctx.strokeStyle = borderColor;

      const cols = Math.ceil(width / sz) + 2;
      const rows = Math.ceil(height / sz) + 2;
      const startX = -((offs.x % sz) + sz);
      const startY = -((offs.y % sz) + sz);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * sz;
          const y = startY + r * sz;
          if (hoverCol === c && hoverRow === r) {
            ctx.fillStyle = hoverFillColor;
            ctx.fillRect(x, y, sz, sz);
          }
          ctx.strokeRect(x + 0.5 * dpr, y + 0.5 * dpr, sz - dpr, sz - dpr);
        }
      }
      ctx.restore();

      rafRef.current = window.requestAnimationFrame(step);
    };
    rafRef.current = window.requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [borderColor, direction, hoverFillColor, speed, squareSize]);

  const canvas = (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{ display: "block" }}
    />
  );
  return canvas;
}
