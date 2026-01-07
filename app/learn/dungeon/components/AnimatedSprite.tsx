"use client";

import { useEffect, useRef } from "react";

interface AnimatedSpriteProps {
  characterId: string;
  direction: "up" | "down" | "left" | "right";
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate?: number;
  scale?: number;
}

export function AnimatedSprite({
  characterId,
  direction,
  frameWidth,
  frameHeight,
  frameCount,
  frameRate = 4,
  scale = 2,
}: AnimatedSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = `/sprite/characters/players/${characterId}/idle.png`;
    imgRef.current = img;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const drawFrame = (frameIndex: number) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate sprite sheet position based on direction
        // Idle animations: up (0-1), left (2-3), down (4-5), right (6-7)
        let spriteX = 0;
        let spriteY = 0;

        if (direction === "up") spriteY = 0;
        else if (direction === "left") spriteY = frameHeight;
        else if (direction === "down") spriteY = frameHeight * 2;
        else if (direction === "right") spriteY = frameHeight * 3;

        spriteX = frameIndex * frameWidth;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          img,
          spriteX,
          spriteY,
          frameWidth,
          frameHeight,
          0,
          0,
          frameWidth * scale,
          frameHeight * scale
        );
      };

      let frameIndex = 0;
      const animate = () => {
        drawFrame(frameIndex);
        frameIndex = (frameIndex + 1) % frameCount;
        animationRef.current = window.setTimeout(
          () => requestAnimationFrame(animate),
          1000 / frameRate
        ) as unknown as number;
      };

      drawFrame(0);
      animate();
    };

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [
    characterId,
    direction,
    frameWidth,
    frameHeight,
    frameCount,
    frameRate,
    scale,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={frameWidth * scale}
      height={frameHeight * scale}
      style={{
        imageRendering: "pixelated",
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
      className="pixelated"
    />
  );
}
