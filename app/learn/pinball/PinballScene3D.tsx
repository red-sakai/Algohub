'use client';

/**
 * PinballScene3D - ARCADE EDITION
 * Full pinball machine with cabinet, spline rails, and thick bumpers
 */

import React, { useRef, useEffect, Suspense, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TreeNode3D, PinballState, TraversalType, TRAVERSAL_CONFIGS } from '@/types/pinball';
import { PinballAnimator, NodeVisualStateManager } from '@/lib/pinball/animationController';
import {
  ArcadeCabinetFrame,
  TexturedPlayfield,
  MetallicSideRails,
  GlassCover,
  CornerPosts
} from '@/lib/pinball/playfieldRenderer';
import { CabinetIntro, ArcadeCabinetShell } from './CabinetIntro';

interface Props {
  tree: TreeNode3D | null;
  pinballState: PinballState | null;
  visualStateManager: NodeVisualStateManager;
  traversalType: TraversalType;
  animationController: PinballAnimator | null;
  onLaunchStart?: (startY: number) => void;
  onLaunchChange?: (currentY: number) => void;
  onLaunchEnd?: () => void;
  showCabinetIntro?: boolean;
  skipIntro?: boolean;
  onIntroComplete?: () => void;
}

export default function PinballScene3D({ 
  tree, 
  pinballState, 
  visualStateManager, 
  traversalType,
  animationController,
  onLaunchStart,
  onLaunchChange,
  onLaunchEnd,
  showCabinetIntro = false,
  skipIntro = false,
  onIntroComplete
}: Props) {
  return (
    <Canvas 
      shadows
      onPointerMissed={() => {
        // Reset cursor when clicking outside objects
        document.body.style.cursor = 'default';
      }}
      onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
    >
      <Suspense fallback={null}>
        <SceneContent
          tree={tree}
          pinballState={pinballState}
          visualStateManager={visualStateManager}
          traversalType={traversalType}
          animationController={animationController}
          onLaunchStart={onLaunchStart}
          onLaunchChange={onLaunchChange}
          onLaunchEnd={onLaunchEnd}
          showCabinetIntro={showCabinetIntro}
          skipIntro={skipIntro}
          onIntroComplete={onIntroComplete}
        />
      </Suspense>
    </Canvas>
  );
}

function SceneContent({ 
  tree, 
  pinballState, 
  visualStateManager, 
  traversalType,
  animationController,
  onLaunchStart,
  onLaunchChange,
  onLaunchEnd,
  showCabinetIntro = false,
  skipIntro = false,
  onIntroComplete
}: Props) {
  const { camera } = useThree();
  const orbitControlsRef = useRef<any>(null);

  // Use cabinet intro camera controller
  CabinetIntro({
    isPlaying: showCabinetIntro,
    skipIntro,
    onComplete: onIntroComplete || (() => {}),
    targetCameraPosition: new THREE.Vector3(0, 12, 35),
    targetCameraLookAt: new THREE.Vector3(0, -2, 0)
  });

  useEffect(() => {
    // Responsive camera positioning based on viewport
    const updateCamera = () => {
      if (showCabinetIntro) return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspect = width / height;
      
      // Adjust camera distance based on screen size
      let z = 50;
      let y = 5;
      let fov = 60;
      
      // Mobile portrait
      if (aspect < 0.75) {
        z = 65;
        y = 3;
        fov = 70;
      }
      // Mobile landscape / tablet portrait
      else if (aspect < 1.2) {
        z = 55;
        y = 4;
        fov = 65;
      }
      // Narrow desktop
      else if (aspect < 1.5) {
        z = 50;
        y = 5;
        fov = 60;
      }
      // Wide desktop
      else {
        z = 48;
        y = 5;
        fov = 58;
      }
      
      camera.position.set(0, y, z);
      camera.lookAt(0, 0, 0);
      
      if ('fov' in camera && 'updateProjectionMatrix' in camera) {
        (camera as THREE.PerspectiveCamera).fov = fov;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    };
    
    updateCamera();
    window.addEventListener('resize', updateCamera);
    
    return () => {
      window.removeEventListener('resize', updateCamera);
    };
  }, [camera, tree, showCabinetIntro]);

  return (
    <>
      {/* Arcade Cabinet Shell - always visible for depth */}
      <ArcadeCabinetShell />

      {/* Premium Arcade Pinball Machine Lighting */}
      {/* Soft ambient base */}
      <ambientLight intensity={0.5} color="#2a1a4a" />
      
      {/* Main overhead light - simulates arcade cabinet top light */}
      <directionalLight 
        position={[0, 30, 25]} 
        intensity={2.5} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      
      {/* Colorful accent lights for arcade feel */}
      <pointLight position={[12, -8, 10]} intensity={12} color="#ff6600" distance={20} decay={2} /> {/* Orange launcher glow */}
      <pointLight position={[0, 10, 10]} intensity={8} color="#00ffff" distance={30} decay={2} /> {/* Cyan tree area */}
      <pointLight position={[-8, 0, 10]} intensity={6} color="#ff00ff" distance={22} decay={2} /> {/* Magenta left accent */}
      <pointLight position={[8, 0, 10]} intensity={6} color="#ffff00" distance={22} decay={2} /> {/* Yellow right accent */}
      
      {/* Dramatic spotlight from above (arcade cabinet glass reflection simulation) */}
      <spotLight
        position={[0, 25, 28]}
        angle={0.8}
        intensity={5}
        decay={2}
        penumbra={0.5}
        castShadow
      />
      
      {/* Rim lights for depth */}
      <pointLight position={[-15, 0, 5]} intensity={3} color="#4400ff" distance={25} decay={2} />
      <pointLight position={[15, 0, 5]} intensity={3} color="#ff0044" distance={25} decay={2} />

      {/* Arcade viewing angle */}
      <OrbitControls
        ref={orbitControlsRef}
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={22}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 6}
      />

      {/* Environment */}
      <Environment preset="night" />

      {/* ARCADE INFRASTRUCTURE */}
      <ArcadeCabinetFrame />
      <TexturedPlayfield />
      <MetallicSideRails />
      <CornerPosts />

      {/* ARCADE BUMPERS (Thick Rims) */}
      {tree && <TreeBumpers tree={tree} visualStateManager={visualStateManager} />}

      {/* SPLINE RAILS (Glowing trajectory path) */}
      {animationController && <SplineRails animationController={animationController} />}

      {/* Render Pinball */}
      {pinballState && (
        <Pinball
          position={pinballState.currentPosition}
          traversalType={traversalType}
        />
      )}

      {/* Launcher Mechanism */}
      {pinballState && !pinballState.isLaunched && (
        <Launcher
          position={TRAVERSAL_CONFIGS[traversalType].launcherPosition}
          charge={pinballState.launcherCharge}
          traversalType={traversalType}
          onDragStart={onLaunchStart}
          onDragChange={onLaunchChange}
          onDragEnd={onLaunchEnd}
          orbitControlsRef={orbitControlsRef}
        />
      )}

      {/* Entry Point Marker - only show before launch */}
      {pinballState && !pinballState.isLaunched && (
        <EntryPointMarker traversalType={traversalType} />
      )}
    </>
  );
}

// ============================================================================
// ARCADE BUMPERS (Thick Rims + Glowing Cores)
// ============================================================================

interface TreeBumpersProps {
  tree: TreeNode3D;
  visualStateManager: NodeVisualStateManager;
}

function TreeBumpers({ tree, visualStateManager }: TreeBumpersProps) {
  const nodes: TreeNode3D[] = [];

  function collectNodes(node: TreeNode3D | null) {
    if (node === null) return;
    nodes.push(node);
    if (node.left) collectNodes(node.left as TreeNode3D);
    if (node.right) collectNodes(node.right as TreeNode3D);
  }

  collectNodes(tree);

  return (
    <>
      {nodes.map(node => (
        <ArcadeBumper
          key={node.nodeId}
          node={node}
          visualStateManager={visualStateManager}
        />
      ))}
    </>
  );
}

function ArcadeBumper({ node, visualStateManager }: { node: TreeNode3D; visualStateManager: NodeVisualStateManager }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const rimRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const [showParticles, setShowParticles] = useState(false);
  const prevActiveRef = useRef(false);

  useFrame((state) => {
    const visualState = visualStateManager.getNodeState(node.nodeId);
    if (!visualState) return;

    // Trigger particles on hit
    if (visualState.isActive && !prevActiveRef.current) {
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 500);
    }
    prevActiveRef.current = visualState.isActive;

    // Pulse glow on hit
    if (glowRef.current) {
      glowRef.current.intensity = visualState.glowIntensity * 15;
    }

    // Expand core on hit
    if (coreRef.current) {
      const targetScale = visualState.isActive ? 1.6 : 1.0;
      coreRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);
    }

    // Rotate rim
    if (rimRef.current) {
      rimRef.current.rotation.z += 0.018;
    }

    // Counter-rotate inner ring
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= 0.025;
    }
  });

  const state = visualStateManager.getNodeState(node.nodeId);
  const wasVisited = state?.wasVisited || false;
  const isActive = state?.isActive || false;

  const baseColor = wasVisited ? '#44ff44' : '#ff2222';
  const emissiveColor = isActive ? '#ffaa00' : (wasVisited ? '#22aa22' : '#aa0000');

  return (
    <group position={[node.worldPosition.x, node.worldPosition.y, node.worldPosition.z]}>
      {/* THICK OUTER RIM */}
      <mesh ref={rimRef} castShadow receiveShadow>
        <torusGeometry args={[1.0, 0.25, 16, 32]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.95}
          roughness={0.15}
          emissive={emissiveColor}
          emissiveIntensity={isActive ? 1.2 : 0.5}
        />
      </mesh>

      {/* INNER CORE (glowing center) */}
      <mesh ref={coreRef} castShadow receiveShadow>
        <sphereGeometry args={[0.75, 32, 32]} />
        <meshStandardMaterial
          color={isActive ? '#ffff00' : (wasVisited ? '#88ff88' : '#ff6666')}
          metalness={0.85}
          roughness={0.25}
          emissive={isActive ? '#ffaa00' : (wasVisited ? '#44ff44' : '#ff2222')}
          emissiveIntensity={isActive ? 2.5 : 0.8}
        />
      </mesh>

      {/* INNER ROTATING RING */}
      <mesh ref={innerRingRef}>
        <torusGeometry args={[0.65, 0.08, 16, 32]} />
        <meshStandardMaterial
          color={isActive ? '#ffff00' : (wasVisited ? '#88ff88' : '#ff8888')}
          metalness={0.9}
          roughness={0.1}
          emissive={isActive ? '#ffaa00' : (wasVisited ? '#66ff66' : '#ff6666')}
          emissiveIntensity={isActive ? 2.5 : 0.6}
        />
      </mesh>

      {/* TOP/BOTTOM POSTS */}
      <mesh position={[0, 0, 0.7]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.25, 16]} />
        <meshStandardMaterial color="#555555" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -0.7]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.25, 16]} />
        <meshStandardMaterial color="#555555" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* INTENSE POINT LIGHT */}
      <pointLight
        ref={glowRef}
        color={isActive ? '#ffaa00' : (wasVisited ? '#44ff44' : '#ff2222')}
        intensity={0}
        distance={15}
        decay={2}
      />
      
      {/* Particle burst on hit */}
      {showParticles && (
        <>
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 2 + Math.random();
            return (
              <mesh 
                key={i} 
                position={[
                  Math.cos(angle) * distance, 
                  Math.sin(angle) * distance, 
                  (Math.random() - 0.5) * 2
                ]}
              >
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshBasicMaterial 
                  color={isActive ? '#ffff00' : '#44ff44'} 
                  transparent 
                  opacity={0.8}
                />
              </mesh>
            );
          })}
        </>
      )}

      {/* VALUE LABEL - Arcade style */}
      <Html center distanceFactor={8}>
        <div
          className="px-3 py-1.5 rounded-lg text-white font-black text-lg shadow-2xl border-2 pointer-events-none relative"
          style={{
            background: isActive 
              ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.98), rgba(245, 158, 11, 0.98))' 
              : wasVisited 
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95))' 
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))',
            borderColor: isActive ? '#fbbf24' : (wasVisited ? '#44ff44' : '#ff2222'),
            textShadow: `0 0 20px ${isActive ? '#fbbf24' : (wasVisited ? '#44ff44' : '#ff2222')}, 0 0 40px ${isActive ? '#fbbf24' : (wasVisited ? '#44ff44' : '#ff2222')}`,
            boxShadow: `0 0 30px ${isActive ? 'rgba(251, 191, 36, 0.9)' : (wasVisited ? 'rgba(68, 255, 68, 0.7)' : 'rgba(239, 68, 68, 0.7)')}, inset 0 0 20px rgba(255, 255, 255, 0.2)`,
            transform: isActive ? 'scale(1.15)' : 'scale(1)',
            transition: 'all 0.3s ease'
          }}
        >
          {node.value}
          {state?.visitOrder !== null && state?.visitOrder !== undefined && (
            <span className="ml-2 text-lg font-extrabold text-yellow-200 drop-shadow-[0_0_10px_rgba(253,224,71,1)]">
              #{state.visitOrder + 1}
            </span>
          )}
          {isActive && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full animate-ping" />
          )}
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// SPLINE RAILS (Glowing trajectory path)
// ============================================================================

interface SplineRailsProps {
  animationController: PinballAnimator | null;
}

function SplineRails({ animationController }: SplineRailsProps) {
  const railRef = useRef<THREE.Mesh>(null);
  const spline = animationController?.getSpline();

  // Enhanced pulse animation with color shift
  useFrame((state) => {
    if (railRef.current) {
      const time = state.clock.elapsedTime;
      const material = railRef.current.material as THREE.MeshStandardMaterial;
      
      // Pulsing intensity
      material.emissiveIntensity = 1.2 + Math.sin(time * 4) * 0.4;
      
      // Subtle color shift for arcade effect
      const hue = (Math.sin(time * 0.5) + 1) * 0.5;
      material.emissive.setHSL(0.5 + hue * 0.1, 1, 0.5);
    }
  });

  // Early return after all hooks
  if (!spline || !spline.curve) {
    return null;
  }

  // Generate tube geometry from spline with larger radius
  const tubeGeometry = new THREE.TubeGeometry(
    spline.curve,
    250, // more segments for smoother look
    0.18, // slightly thicker radius
    12,   // more radial segments
    false // closed
  );

  return (
    <mesh ref={railRef} geometry={tubeGeometry}>
      <meshStandardMaterial
        color="#00ccff"
        metalness={0.95}
        roughness={0.05}
        emissive="#0088ff"
        emissiveIntensity={1.2}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

// ============================================================================
// PINBALL COMPONENT
// ============================================================================

function Pinball({ position, traversalType }: {
  position: { x: number; y: number; z: number };
  traversalType: TraversalType;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const config = TRAVERSAL_CONFIGS[traversalType];

  useFrame((state) => {
    // Rotate pinball for reflective effect
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.2;
      meshRef.current.rotation.y += 0.2;
    }
    
    // Pulsing glow
    if (glowRef.current) {
      glowRef.current.intensity = 10 + Math.sin(state.clock.elapsedTime * 8) * 2;
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Main Pinball Sphere - Chrome-like */}
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={config.accentColor}
          metalness={0.95}
          roughness={0.05}
          emissive={config.accentColor}
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* Dynamic Point Light */}
      <pointLight
        ref={glowRef}
        color={config.accentColor}
        intensity={10}
        distance={10}
      />

      {/* Large outer glow ring (pulsing) */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial 
          color={config.accentColor} 
          transparent 
          opacity={0.25} 
        />
      </mesh>

      {/* Motion trail layers */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial 
          color={config.accentColor} 
          transparent 
          opacity={0.4} 
        />
      </mesh>
      
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial 
          color={config.accentColor} 
          transparent 
          opacity={0.2} 
        />
      </mesh>
      
      {/* Spark ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.08, 16, 32]} />
        <meshBasicMaterial 
          color={config.accentColor} 
          transparent 
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// LAUNCHER COMPONENT (Arcade Plunger)
// ============================================================================

function Launcher({ position, charge, traversalType, onDragStart, onDragChange, onDragEnd, orbitControlsRef }: {
  position: { x: number; y: number; z: number };
  charge: number;
  traversalType: TraversalType;
  onDragStart?: (startY: number) => void;
  onDragChange?: (currentY: number) => void;
  onDragEnd?: () => void;
  orbitControlsRef?: React.MutableRefObject<any>;
}) {
  const plungerRef = useRef<THREE.Mesh>(null);
  const springRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startMouseY, setStartMouseY] = useState(0);
  const config = TRAVERSAL_CONFIGS[traversalType];

  // Add window-level event listeners for drag tracking (mouse and touch)
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      
      // Normalize Y coordinate relative to viewport height (zoom-independent)
      const normalizedY = (e.clientY / window.innerHeight) * 1000;
      onDragChange?.(normalizedY);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      
      // Get first touch point
      const touch = e.touches[0];
      if (touch) {
        const normalizedY = (touch.clientY / window.innerHeight) * 1000;
        onDragChange?.(normalizedY);
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        // Re-enable orbit controls
        if (orbitControlsRef?.current) {
          orbitControlsRef.current.enabled = true;
          orbitControlsRef.current.enableRotate = true;
        }
        
        // Re-enable text selection
        document.body.style.userSelect = '';
        document.body.style.cursor = 'default';
        
        onDragEnd?.();
      }
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        // Re-enable orbit controls
        if (orbitControlsRef?.current) {
          orbitControlsRef.current.enabled = true;
          orbitControlsRef.current.enableRotate = true;
        }
        
        // Re-enable text selection
        document.body.style.userSelect = '';
        document.body.style.cursor = 'default';
        
        onDragEnd?.();
      }
    };

    const handleSelectStart = (e: Event) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMouseMove, { capture: true });
      window.addEventListener('mouseup', handleWindowMouseUp, { capture: true });
      window.addEventListener('touchmove', handleWindowTouchMove, { capture: true, passive: false });
      window.addEventListener('touchend', handleWindowTouchEnd, { capture: true });
      window.addEventListener('selectstart', handleSelectStart, { capture: true });
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove, { capture: true });
      window.removeEventListener('mouseup', handleWindowMouseUp, { capture: true });
      window.removeEventListener('touchmove', handleWindowTouchMove, { capture: true });
      window.removeEventListener('touchend', handleWindowTouchEnd, { capture: true });
      window.removeEventListener('selectstart', handleSelectStart, { capture: true });
    };
  }, [isDragging, startMouseY, onDragChange, onDragEnd, orbitControlsRef]);

  const handlePointerDown = (e: any) => {
    console.log('🎯 Plunger clicked!', e);
    e.stopPropagation();
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    
    // Immediately disable orbit controls
    if (orbitControlsRef?.current) {
      orbitControlsRef.current.enabled = false;
    }
    
    // Get Y position from either mouse or touch event
    let clientY = e.clientY;
    if (e.touches && e.touches[0]) {
      clientY = e.touches[0].clientY;
    }
    
    // Normalize start position (zoom-independent)
    const normalizedStartY = (clientY / window.innerHeight) * 1000;
    setIsDragging(true);
    setStartMouseY(normalizedStartY);
    onDragStart?.(normalizedStartY);
  };

  useFrame(() => {
    if (plungerRef.current) {
      // Pull plunger DOWN (player pulls it back)
      plungerRef.current.position.y = -charge * 3;
    }
    if (springRef.current) {
      // Compress spring rings
      springRef.current.scale.y = 1 - charge * 0.5;
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* LAUNCHER LANE - Vertical channel */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[2.5, 8, 0.5]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Left lane wall */}
      <mesh position={[-1.3, 2, 0]}>
        <boxGeometry args={[0.2, 8, 1]} />
        <meshStandardMaterial
          color="#ff6600"
          metalness={0.8}
          roughness={0.2}
          emissive="#ff6600"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Right lane wall */}
      <mesh position={[1.3, 2, 0]}>
        <boxGeometry args={[0.2, 8, 1]} />
        <meshStandardMaterial
          color="#ff6600"
          metalness={0.8}
          roughness={0.2}
          emissive="#ff6600"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* PLUNGER TIP (visible part) - DRAGGABLE */}
      <mesh
        ref={plungerRef}
        castShadow
        position={[0, -2, 0]}
        onPointerDown={(e) => {
          console.log('👆 Pointer down on plunger mesh');
          e.stopPropagation();
          handlePointerDown(e);
        }}
        onPointerMove={(e) => {
          if (isDragging) {
            e.stopPropagation();
            // Get Y position from pointer event
            let clientY = e.clientY;
            if (e.nativeEvent && (e.nativeEvent as any).touches && (e.nativeEvent as any).touches[0]) {
              clientY = (e.nativeEvent as any).touches[0].clientY;
            }
            const normalizedY = (clientY / window.innerHeight) * 1000;
            onDragChange?.(normalizedY);
          }
        }}
        onPointerUp={(e) => {
          if (isDragging) {
            console.log('🚀 Pointer up - releasing plunger');
            e.stopPropagation();
            setIsDragging(false);
            
            // Re-enable orbit controls
            if (orbitControlsRef?.current) {
              orbitControlsRef.current.enabled = true;
              orbitControlsRef.current.enableRotate = true;
            }
            
            // Re-enable text selection
            document.body.style.userSelect = '';
            document.body.style.cursor = 'default';
            
            onDragEnd?.();
          }
        }}
        onPointerEnter={(e) => {
          console.log('🖱️ Pointer entered plunger');
          e.stopPropagation();
          if (!isDragging) {
            document.body.style.cursor = 'grab';
            // Pre-disable orbit controls on hover for smoother drag start
            if (orbitControlsRef?.current) {
              orbitControlsRef.current.enableRotate = false;
            }
          }
        }}
        onPointerLeave={(e) => {
          console.log('🚪 Pointer left plunger');
          e.stopPropagation();
          if (!isDragging) {
            document.body.style.cursor = 'default';
            // Re-enable orbit rotate when not hovering
            if (orbitControlsRef?.current) {
              orbitControlsRef.current.enableRotate = true;
            }
          }
        }}
      >
        <cylinderGeometry args={[1.2, 1.2, 2.5, 32]} />
        <meshStandardMaterial
          color={isDragging ? '#ffff00' : config.accentColor}
          metalness={0.9}
          roughness={0.1}
          emissive={isDragging ? '#ffff00' : config.accentColor}
          emissiveIntensity={isDragging ? 2 : (charge * 1.5)}
        />
      </mesh>

      {/* SPRING COILS (visible compression) */}
      <group ref={springRef} position={[0, -3.5, 0]}>
        {[0, 0.4, 0.8, 1.2, 1.6].map((offset, i) => (
          <mesh key={i} position={[0, offset, 0]}>
            <torusGeometry args={[0.6, 0.12, 16, 32]} />
            <meshStandardMaterial
              color="#ffaa00"
              emissive="#ffaa00"
              emissiveIntensity={charge * (2 - i * 0.3)}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Base plate */}
      <mesh position={[0, -5.5, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.5, 32]} />
        <meshStandardMaterial
          color="#333333"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Charge glow effect */}
      <pointLight
        color={config.accentColor}
        intensity={charge * 15}
        distance={12}
        position={[0, -2, 0]}
      />

      {/* Upward launch arrow when charging */}
      {charge > 0 && (
        <>
          <mesh position={[0, 4, 1]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.8, 1.5, 3]} />
            <meshBasicMaterial 
              color={config.accentColor} 
              transparent 
              opacity={0.7}
            />
          </mesh>
          <mesh position={[0, 5.5, 1]}>
            <coneGeometry args={[0.6, 1.2, 3]} />
            <meshBasicMaterial 
              color={config.accentColor} 
              transparent 
              opacity={0.5}
            />
          </mesh>
        </>
      )}

      {/* Label */}
      <Html center distanceFactor={8} position={[0, 7, 0]}>
        <div className="bg-slate-900/95 px-4 py-2 rounded-lg text-white font-bold border-2 border-orange-500 shadow-xl whitespace-nowrap pointer-events-none">
          🎮 PLUNGER
          {isDragging && (
            <div className="text-yellow-400 text-xs mt-1 animate-pulse">
              🟡 DRAGGING...
            </div>
          )}
          {!isDragging && charge > 0 && (
            <div className="text-orange-400 text-xs mt-1 animate-pulse">
              ⚡ {Math.floor(charge * 100)}% - RELEASE!
            </div>
          )}
          {!isDragging && charge === 0 && (
            <div className="text-slate-400 text-xs mt-1">
              👆 Click & Drag Down
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// ENTRY POINT MARKER
// ============================================================================

function EntryPointMarker({ traversalType }: { traversalType: TraversalType }) {
  const config = TRAVERSAL_CONFIGS[traversalType];
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Pulsing animation pointing downward
      meshRef.current.position.y = config.entryPoint.y + Math.sin(state.clock.elapsedTime * 3) * 0.2 + 1;
      meshRef.current.rotation.z += 0.02;
    }
  });

  return (
    <group position={[config.entryPoint.x, config.entryPoint.y, config.entryPoint.z]}>
      {/* Downward arrow indicator */}
      <mesh ref={meshRef} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.8, 1.5, 3]} />
        <meshStandardMaterial
          color={config.accentColor}
          emissive={config.accentColor}
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>
      
      {/* Entry rings showing descent path */}
      <mesh position={[0, 1.5, 0]}>
        <torusGeometry args={[1, 0.1, 16, 32]} />
        <meshBasicMaterial color={config.accentColor} transparent opacity={0.4} />
      </mesh>
      
      <mesh position={[0, 2.5, 0]}>
        <torusGeometry args={[1.5, 0.1, 16, 32]} />
        <meshBasicMaterial color={config.accentColor} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ============================================================================
// PINBALL TABLE BORDER (Arcade Machine Look)
// ============================================================================

function PinballTableBorder() {
  return (
    <group>
      {/* Left wall */}
      <mesh position={[-11, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 30, 1]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.7}
          roughness={0.3}
          emissive="#0066ff"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Right wall (behind launcher) */}
      <mesh position={[13, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 30, 1]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.7}
          roughness={0.3}
          emissive="#ff6600"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Top wall */}
      <mesh position={[0, 13, 0]} castShadow>
        <boxGeometry args={[26, 0.5, 1]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.7}
          roughness={0.3}
          emissive="#00ffff"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Bottom wall (drain area) */}
      <mesh position={[0, -13, 0]} castShadow>
        <boxGeometry args={[26, 0.5, 1]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Decorative corner bumpers */}
      <mesh position={[-9, 11, 0]} castShadow>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#ff0066"
          metalness={0.6}
          roughness={0.4}
          emissive="#ff0066"
          emissiveIntensity={0.3}
        />
      </mesh>

      <mesh position={[9, 11, 0]} castShadow>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#0066ff"
          metalness={0.6}
          roughness={0.4}
          emissive="#0066ff"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Decorative corner bumpers */}
      <mesh position={[-11, 10, 0]} castShadow>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial
          color="#ff0066"
          metalness={0.6}
          roughness={0.4}
          emissive="#ff0066"
          emissiveIntensity={0.2}
        />
      </mesh>

      <mesh position={[11, 10, 0]} castShadow>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial
          color="#0066ff"
          metalness={0.6}
          roughness={0.4}
          emissive="#0066ff"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}
