'use client';

/**
 * Cinematic Intro Overlay with Blur Warm-Up Strategy
 * 
 * PURPOSE:
 * - Provides cinematic title reveal
 * - Masks rendering initialization with blur
 * - Ensures smooth transition to gameplay
 * - Monitors FPS stability before enabling input
 */

import React, { useEffect, useState } from 'react';

interface IntroOverlayProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function IntroOverlay({ isActive, onComplete }: IntroOverlayProps) {
  const [phase, setPhase] = useState<'blur' | 'fadeout' | 'complete'>('blur');
  const [blurAmount, setBlurAmount] = useState(20);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (!isActive) return;

    console.log('Intro overlay mounted, phase:', phase);
    
    let rafId: number;
    let phaseStartTime = performance.now();
    const frameTimes: number[] = [];
    let lastFrameTime = performance.now();

    const BLUR_DURATION = 2000; // Title reveal + warm-up
    const FADEOUT_DURATION = 500; // Blur reduction

    function measureFPS() {
      const now = performance.now();
      const delta = now - lastFrameTime;
      lastFrameTime = now;
      
      frameTimes.push(delta);
      if (frameTimes.length > 10) frameTimes.shift();
      
      // Calculate average FPS
      const avgDelta = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      return 1000 / avgDelta;
    }

    function animate() {
      const now = performance.now();
      const elapsed = now - phaseStartTime;
      const fps = measureFPS();

      if (phase === 'blur') {
        // PHASE 1: Blur intro with warm-up
        if (elapsed >= BLUR_DURATION && fps > 50) {
          // Only transition if FPS is stable
          setPhase('fadeout');
          phaseStartTime = now;
        }
      } else if (phase === 'fadeout') {
        // PHASE 2: Gradually reduce blur
        const progress = Math.min(elapsed / FADEOUT_DURATION, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        setBlurAmount(20 * (1 - eased));
        setOpacity(1 - (eased * 0.05)); // Subtle opacity fade
        
        if (progress >= 1) {
          setPhase('complete');
          onComplete();
          return;
        }
      }

      rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isActive, phase, onComplete]);

  if (phase === 'complete' || !isActive) return null;

  console.log('Rendering intro overlay, phase:', phase, 'opacity:', opacity);

  return (
    <>
      {/* Blur filter applied to canvas behind this overlay - only during blur phase */}
      <style jsx global>{`
        ${phase === 'blur' ? `
          canvas {
            filter: blur(${blurAmount}px) brightness(0.6) !important;
            transition: none !important;
          }
        ` : phase === 'fadeout' ? `
          canvas {
            filter: blur(${blurAmount}px) brightness(${0.6 + (1 - blurAmount / 20) * 0.4}) !important;
            transition: filter 0.05s linear !important;
          }
        ` : ''}
      `}</style>

      {/* Cinematic title overlay */}
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{ 
          opacity,
          pointerEvents: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 999999
        }}
      >
        {/* Vignette effect */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle, transparent 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.9) 100%)'
          }}
        />

        {/* Title reveal */}
        <div 
          className="relative text-center px-4"
          style={{ zIndex: 1000000 }}
        >
          <h1 
            className="font-black uppercase tracking-wider mb-4"
            style={{
              fontSize: 'clamp(3rem, 10vw, 8rem)',
              color: '#ffffff',
              textShadow: `
                0 0 40px rgba(168,85,247,1),
                0 0 80px rgba(236,72,153,1),
                0 0 120px rgba(168,85,247,0.8),
                0 4px 8px rgba(0,0,0,0.9)
              `,
              WebkitTextStroke: '2px rgba(168,85,247,0.5)',
              animation: phase === 'blur' ? 'titleGlow 2s ease-in-out infinite' : 'none',
              lineHeight: '1.2'
            }}
          >
            BINARY TREE
            <br />
            <span style={{ fontSize: '0.75em' }}>PINBALL</span>
          </h1>

          {/* Loading indicator (subtle) */}
          {phase === 'blur' && (
            <div 
              className="flex items-center justify-center gap-3 mt-6"
              style={{ fontSize: '14px', color: '#a78bfa' }}
            >
              <div 
                className="rounded-full animate-pulse"
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#a78bfa',
                  boxShadow: '0 0 15px rgba(168,85,247,1)'
                }}
              />
              <div 
                className="rounded-full animate-pulse"
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#ec4899',
                  boxShadow: '0 0 15px rgba(236,72,153,1)',
                  animationDelay: '0.2s'
                }}
              />
              <div 
                className="rounded-full animate-pulse"
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#22d3ee',
                  boxShadow: '0 0 15px rgba(34,211,238,1)',
                  animationDelay: '0.4s'
                }}
              />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes titleGlow {
          0%, 100% { 
            text-shadow: 
              0 0 40px rgba(168,85,247,1),
              0 0 80px rgba(236,72,153,1),
              0 0 120px rgba(168,85,247,0.8),
              0 4px 8px rgba(0,0,0,0.9);
          }
          50% { 
            text-shadow: 
              0 0 60px rgba(168,85,247,1),
              0 0 120px rgba(236,72,153,1),
              0 0 160px rgba(168,85,247,1),
              0 4px 8px rgba(0,0,0,0.9);
          }
        }
      `}</style>
    </>
  );
}
