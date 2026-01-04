"use client";

import { useEffect, useRef } from "react";

interface LoadingScreenProps {
  character: string;
}

export function LoadingScreen({ character }: LoadingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteImageRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef(0);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size - responsive scale based on screen width
    const screenWidth = window.innerWidth;
    let scale = 3; // Default for desktop
    if (screenWidth < 640) {
      scale = 1.8; // Mobile
    } else if (screenWidth < 768) {
      scale = 2.2; // Small tablet
    } else if (screenWidth < 1024) {
      scale = 2.5; // Tablet
    }
    const frameWidth = 64;
    const frameHeight = 64;
    canvas.width = frameWidth * scale;
    canvas.height = frameHeight * scale;

    // Load the running sprite sheet
    const img = new Image();
    img.src = `/sprite/characters/${character}/run.png`;
    spriteImageRef.current = img;

    img.onload = () => {
      let frame = 0;
      const totalFrames = 6; // Most character run animations have 6 frames
      const fps = 8; // Animation speed
      const frameDuration = 1000 / fps;
      let lastFrameTime = Date.now();

      const animate = () => {
        const now = Date.now();
        const elapsed = now - lastFrameTime;

        if (elapsed > frameDuration) {
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw current frame
          // Each frame is at row 2 (index 1), column varies
          const row = 1; // Second row (0-indexed) for left/side running
          const col = frame;

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            img,
            col * frameWidth,
            row * frameHeight,
            frameWidth,
            frameHeight,
            0,
            0,
            frameWidth * scale,
            frameHeight * scale
          );

          // Update frame
          frame = (frame + 1) % totalFrames;
          frameRef.current = frame;
          lastFrameTime = now;
        }

        animationIdRef.current = requestAnimationFrame(animate);
      };

      animate();
    };

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [character]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        backgroundImage: "url('/sprite/screen.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Loading content */}
      <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-6 md:gap-8 px-4">
        {/* Character running animation */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="image-rendering-pixelated"
            style={{
              imageRendering: "pixelated",
              filter: "drop-shadow(0 4px 16px rgba(0, 0, 0, 0.8))",
            }}
          />
        </div>

        {/* Loading text */}
        <div className="flex items-center gap-2 sm:gap-3">
          <p
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-wider animate-pulse"
            style={{
              color: "#fbbf24",
              textShadow:
                "0 0 20px rgba(251, 191, 36, 0.8), 0 4px 8px rgba(0, 0, 0, 0.9)",
              fontFamily: "Pixelify Sans, monospace",
            }}
          >
            LOADING
          </p>
          <div className="flex gap-1">
            <span
              className="animate-bounce text-2xl sm:text-3xl md:text-4xl"
              style={{
                color: "#fbbf24",
                textShadow: "0 0 20px rgba(251, 191, 36, 0.8)",
                animationDelay: "0ms",
              }}
            >
              .
            </span>
            <span
              className="animate-bounce text-2xl sm:text-3xl md:text-4xl"
              style={{
                color: "#fbbf24",
                textShadow: "0 0 20px rgba(251, 191, 36, 0.8)",
                animationDelay: "150ms",
              }}
            >
              .
            </span>
            <span
              className="animate-bounce text-2xl sm:text-3xl md:text-4xl"
              style={{
                color: "#fbbf24",
                textShadow: "0 0 20px rgba(251, 191, 36, 0.8)",
                animationDelay: "300ms",
              }}
            >
              .
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
