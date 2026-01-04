'use client';

/**
 * Plunger Drag Overlay - 2D HTML overlay for plunger drag interaction
 * Bypasses React Three Fiber's raycasting which fails at non-100% browser zoom
 */

import React from 'react';

interface PlungerOverlayProps {
  onDragStart?: (startY: number) => void;
  onDragChange?: (currentY: number) => void;
  onDragEnd?: () => void;
  isLaunched?: boolean;
  traversalSelected?: boolean;
}

export default function PlungerOverlay({ 
  onDragStart, 
  onDragChange, 
  onDragEnd,
  isLaunched = false,
  traversalSelected = true
}: PlungerOverlayProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const canvasRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    canvasRef.current = document.querySelector('canvas');
    
    // Detect mobile/small screens
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cssY = e.clientY - rect.top;
    
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    
    // Capture pointer
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    onDragStart?.(cssY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cssY = e.clientY - rect.top;
    
    onDragChange?.(cssY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = '';
    
    // Release pointer
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    onDragEnd?.();
  };

  if (isLaunched) return null;
  
  // On mobile, only show after traversal is selected
  if (isMobile && !traversalSelected) return null;

  // Responsive scaling
  const scale = isMobile ? 0.5 : 1;
  const containerWidth = 180 * scale;
  const containerHeight = 260 * scale;
  const handleWidth = 80 * scale;
  const handleHeight = 180 * scale;
  const ballSize = 60 * scale;
  const baseWidth = 150 * scale;
  const baseHeight = 65 * scale;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        right: isMobile ? '2%' : '3%',
        bottom: isMobile ? '10%' : '15%',
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        zIndex: 1000,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '0px',
        filter: isDragging ? 'brightness(1.3)' : 'brightness(1)'
      }}
      title="Pull down to launch!"
    >
      {/* Joystick Handle */}
      <div style={{
        width: `${handleWidth}px`,
        height: `${handleHeight}px`,
        background: 'linear-gradient(180deg, #4dd0e1 0%, #00acc1 50%, #0097a7 100%)',
        borderRadius: `${40 * scale}px ${40 * scale}px ${25 * scale}px ${25 * scale}px`,
        border: `${4 * scale}px solid #80deea`,
        boxShadow: isDragging
          ? `0 0 ${50 * scale}px rgba(0, 229, 255, 0.9), inset 0 ${2 * scale}px ${25 * scale}px rgba(255, 255, 255, 0.4), inset 0 ${-2 * scale}px ${25 * scale}px rgba(0, 0, 0, 0.3)`
          : `0 0 ${35 * scale}px rgba(0, 229, 255, 0.7), inset 0 ${2 * scale}px ${15 * scale}px rgba(255, 255, 255, 0.3), inset 0 ${-2 * scale}px ${15 * scale}px rgba(0, 0, 0, 0.2)`,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: `${20 * scale}px 0`,
        transition: 'all 0.15s ease',
        transform: isDragging ? `translateY(${10 * scale}px) scale(1.02)` : 'translateY(0) scale(1)',
        zIndex: 2
      }}>
        {/* Chrome ball top */}
        <div style={{
          position: 'absolute',
          top: `${-35 * scale}px`,
          width: `${ballSize}px`,
          height: `${ballSize}px`,
          background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #e0e0e0 40%, #90a4ae 100%)',
          borderRadius: '50%',
          boxShadow: `0 ${10 * scale}px ${25 * scale}px rgba(0, 0, 0, 0.4), inset 0 ${-2 * scale}px ${12 * scale}px rgba(0, 0, 0, 0.3), inset ${2 * scale}px ${2 * scale}px ${10 * scale}px rgba(255, 255, 255, 0.8)`,
          border: `${3 * scale}px solid #b0bec5`
        }} />
        
        {/* Circuit pattern lines */}
        <div style={{
          position: 'absolute',
          top: `${40 * scale}px`,
          width: `${50 * scale}px`,
          height: `${2 * scale}px`,
          background: 'linear-gradient(90deg, transparent 0%, #00e5ff 50%, transparent 100%)',
          boxShadow: `0 0 ${10 * scale}px rgba(0, 229, 255, 0.8)`,
          opacity: 0.7
        }} />
        <div style={{
          position: 'absolute',
          top: `${65 * scale}px`,
          width: `${40 * scale}px`,
          height: `${2 * scale}px`,
          background: 'linear-gradient(90deg, transparent 0%, #00e5ff 50%, transparent 100%)',
          boxShadow: `0 0 ${10 * scale}px rgba(0, 229, 255, 0.8)`,
          opacity: 0.7
        }} />
        
        {/* Center status indicator */}
        <div style={{
          width: `${45 * scale}px`,
          height: `${45 * scale}px`,
          borderRadius: '50%',
          background: isDragging
            ? 'radial-gradient(circle, #ff1744 0%, #d50000 100%)'
            : 'radial-gradient(circle, #00e5ff 0%, #00acc1 100%)',
          border: `${3 * scale}px solid rgba(255, 255, 255, 0.3)`,
          boxShadow: isDragging
            ? `0 0 ${25 * scale}px rgba(255, 23, 68, 0.9), inset 0 0 ${18 * scale}px rgba(255, 255, 255, 0.3)`
            : `0 0 ${20 * scale}px rgba(0, 229, 255, 0.7), inset 0 0 ${12 * scale}px rgba(255, 255, 255, 0.3)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${26 * scale}px`,
          animation: isDragging ? 'pulse 0.6s ease-in-out infinite' : 'none'
        }}>
          {isDragging ? '⚡' : '▼'}
        </div>
        
        {/* Bottom circuit lines */}
        <div style={{
          position: 'absolute',
          bottom: `${30 * scale}px`,
          width: `${40 * scale}px`,
          height: `${2 * scale}px`,
          background: 'linear-gradient(90deg, transparent 0%, #00e5ff 50%, transparent 100%)',
          boxShadow: `0 0 ${10 * scale}px rgba(0, 229, 255, 0.8)`,
          opacity: 0.7
        }} />
      </div>
      
      {/* Glowing Base */}
      <div style={{
        width: `${baseWidth}px`,
        height: `${baseHeight}px`,
        background: 'linear-gradient(180deg, #1a237e 0%, #0d47a1 50%, #01579b 100%)',
        borderRadius: `${75 * scale}px ${75 * scale}px 50% 50%`,
        border: `${4 * scale}px solid #00e5ff`,
        boxShadow: isDragging
          ? `0 0 ${50 * scale}px rgba(0, 229, 255, 1), 0 ${10 * scale}px ${30 * scale}px rgba(0, 0, 0, 0.5), inset 0 ${-4 * scale}px ${20 * scale}px rgba(0, 229, 255, 0.5)`
          : `0 0 ${40 * scale}px rgba(0, 229, 255, 0.8), 0 ${10 * scale}px ${25 * scale}px rgba(0, 0, 0, 0.4), inset 0 ${-4 * scale}px ${15 * scale}px rgba(0, 229, 255, 0.4)`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: `${-15 * scale}px`,
        zIndex: 1,
        transition: 'all 0.15s ease'
      }}>
        {/* Base rings */}
        <div style={{
          position: 'absolute',
          width: `${125 * scale}px`,
          height: `${10 * scale}px`,
          borderRadius: '50%',
          border: `${2 * scale}px solid rgba(0, 229, 255, 0.4)`,
          top: `${10 * scale}px`
        }} />
        <div style={{
          position: 'absolute',
          width: `${105 * scale}px`,
          height: `${10 * scale}px`,
          borderRadius: '50%',
          border: `${2 * scale}px solid rgba(0, 229, 255, 0.3)`,
          top: `${20 * scale}px`
        }} />
        
        {/* "CONTROL" text */}
        <div style={{
          fontSize: `${13 * scale}px`,
          fontWeight: 'bold',
          color: '#00e5ff',
          textShadow: `0 0 ${12 * scale}px rgba(0, 229, 255, 0.9), 0 0 ${6 * scale}px rgba(0, 229, 255, 0.5)`,
          letterSpacing: `${4 * scale}px`,
          textTransform: 'uppercase',
          fontFamily: 'monospace',
          marginTop: `${8 * scale}px`
        }}>
          {isDragging ? 'LAUNCH' : 'PULL'}
        </div>
      </div>
      
      {/* Inline keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
