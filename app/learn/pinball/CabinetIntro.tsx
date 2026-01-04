'use client';

/**
 * Arcade Cabinet Cinematic Intro
 * 
 * Creates an immersive intro sequence showing the full arcade cabinet
 * before zooming into the playfield for gameplay.
 * 
 * Phase 1: Full cabinet view (establishing shot)
 * Phase 2: Camera push toward playfield
 * Phase 3: Seamless transition to gameplay camera
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CabinetIntroProps {
  isPlaying: boolean;
  skipIntro?: boolean;
  onComplete: () => void;
  targetCameraPosition: THREE.Vector3;
  targetCameraLookAt: THREE.Vector3;
}

export function CabinetIntro({ 
  isPlaying, 
  skipIntro = false,
  onComplete,
  targetCameraPosition,
  targetCameraLookAt 
}: CabinetIntroProps) {
  const { camera } = useThree();
  const startTimeRef = useRef<number>(0);
  const hasStartedRef = useRef(false);
  
  // Intro sequence config
  const INTRO_DURATION = 3.5; // seconds
  const introStartPos = new THREE.Vector3(0, 8, 50); // Far back, viewing full cabinet
  const introStartLookAt = new THREE.Vector3(0, 2, 0); // Looking at cabinet center

  useEffect(() => {
    if (isPlaying && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startTimeRef.current = performance.now() / 1000;
      
      // Set initial camera position
      camera.position.copy(introStartPos);
      camera.lookAt(introStartLookAt);
    }
    
    if (!isPlaying) {
      hasStartedRef.current = false;
    }
  }, [isPlaying, camera]);

  // Handle skip intro
  useEffect(() => {
    if (skipIntro && isPlaying && hasStartedRef.current) {
      camera.position.copy(targetCameraPosition);
      camera.lookAt(targetCameraLookAt);
      hasStartedRef.current = false;
      onComplete();
    }
  }, [skipIntro, isPlaying, camera, targetCameraPosition, targetCameraLookAt, onComplete]);

  useFrame((state) => {
    if (!isPlaying || !hasStartedRef.current) return;

    const currentTime = state.clock.elapsedTime;
    const elapsed = currentTime - startTimeRef.current;
    
    // Calculate progress (0 to 1)
    let t = Math.min(elapsed / INTRO_DURATION, 1);
    
    // Ease-in-out curve for smooth motion
    t = t < 0.5 
      ? 2 * t * t 
      : -1 + (4 - 2 * t) * t;

    // Interpolate camera position
    camera.position.lerpVectors(introStartPos, targetCameraPosition, t);
    
    // Interpolate look-at target
    const currentLookAt = new THREE.Vector3().lerpVectors(
      introStartLookAt,
      targetCameraLookAt,
      t
    );
    camera.lookAt(currentLookAt);

    // Complete animation
    if (elapsed >= INTRO_DURATION) {
      camera.position.copy(targetCameraPosition);
      camera.lookAt(targetCameraLookAt);
      hasStartedRef.current = false;
      onComplete();
    }
  });

  return null;
}

// ============================================================================
// FULL ARCADE CABINET SHELL (Visual Only)
// ============================================================================

export function ArcadeCabinetShell() {
  const backboxRef = useRef<THREE.Mesh>(null);
  const glassRef = useRef<THREE.Mesh>(null);
  const sidePanelLeftRef = useRef<THREE.Mesh>(null);
  const sidePanelRightRef = useRef<THREE.Mesh>(null);
  const lastUpdate = useRef(0);

  useFrame((state) => {
    // Throttle to ~20fps for subtle ambient effects
    if (state.clock.elapsedTime - lastUpdate.current < 0.05) return;
    lastUpdate.current = state.clock.elapsedTime;
    
    const time = state.clock.elapsedTime;
    
    // Subtle backbox glow pulse
    if (backboxRef.current) {
      const material = backboxRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.8 + Math.sin(time * 2) * 0.3;
    }
    
    // Glass reflection shimmer
    if (glassRef.current) {
      const material = glassRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = 0.12 + Math.sin(time * 1.5) * 0.04;
    }
  });

  return (
    <group>
      {/* BACKBOX (Top Display Area) - More authentic proportions */}
      <group position={[0, 22, -10]}>
        {/* Backbox outer casing - woodgrain brown with black trim */}
        <mesh castShadow>
          <boxGeometry args={[22, 14, 5]} />
          <meshStandardMaterial
            color="#3a1f0f"
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
        
        {/* Black frame border */}
        <mesh position={[0, 0, 2.6]}>
          <boxGeometry args={[21, 13, 0.4]} />
          <meshStandardMaterial
            color="#0a0a0a"
            roughness={0.5}
            metalness={0.6}
          />
        </mesh>
        
        {/* Backbox display screen with vibrant artwork */}
        <mesh ref={backboxRef} position={[0, 0, 2.8]}>
          <planeGeometry args={[19, 11]} />
          <meshStandardMaterial
            color="#ff3366"
            emissive="#ff0066"
            emissiveIntensity={0.8}
            roughness={0.2}
            metalness={0.4}
          />
        </mesh>
        
        {/* Marquee title area - vibrant orange/yellow */}
        <mesh position={[0, 5, 2.9]}>
          <boxGeometry args={[18, 2.5, 0.2]} />
          <meshStandardMaterial
            color="#ff9900"
            emissive="#ffaa00"
            emissiveIntensity={1.5}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
        
        {/* Colorful artwork panels on backbox */}
        <mesh position={[0, -1, 2.9]}>
          <planeGeometry args={[17, 6]} />
          <meshStandardMaterial
            color="#ffdd00"
            emissive="#ffaa00"
            emissiveIntensity={0.6}
            roughness={0.3}
          />
        </mesh>
        
        {/* Side accent strips - chrome/metallic */}
        {[-10, 10].map((x, i) => (
          <mesh key={i} position={[x, 0, 2.9]}>
            <boxGeometry args={[1, 12, 0.3]} />
            <meshStandardMaterial
              color="#ffcc00"
              emissive="#ff8800"
              emissiveIntensity={1.2}
              roughness={0.1}
              metalness={0.95}
            />
          </mesh>
        ))}
        
        {/* Top marquee lights */}
        {[-6, -2, 2, 6].map((x, i) => (
          <mesh key={`top-light-${i}`} position={[x, 6.5, 3]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#ff0066" : "#00ffff"}
              emissive={i % 2 === 0 ? "#ff0066" : "#00ffff"}
              emissiveIntensity={3}
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}
        
        {/* Backbox point lights - more dramatic */}
        <pointLight position={[0, 2, 4]} color="#ff3366" intensity={25} distance={35} />
        <pointLight position={[-8, 0, 4]} color="#ffaa00" intensity={18} distance={25} />
        <pointLight position={[8, 0, 4]} color="#00ffff" intensity={18} distance={25} />
      </group>

      {/* GLASS COVER - angled like real pinball */}
      <mesh 
        ref={glassRef}
        position={[0, 0, 1.5]} 
        rotation={[-0.15, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[24, 32]} />
        <meshStandardMaterial
          color="#aaddff"
          transparent
          opacity={0.12}
          roughness={0.02}
          metalness={0.98}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* CABINET BODY - main playfield housing (positioned behind playfield) */}
      <mesh position={[0, -2, -12]} castShadow>
        <boxGeometry args={[26, 28, 8]} />
        <meshStandardMaterial
          color="#1a0f0a"
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>

      {/* CABINET LEGS - more robust chrome legs */}
      {[
        [-11, -18, 6],
        [11, -18, 6],
        [-11, -18, -10],
        [11, -18, -10],
      ].map((pos, i) => (
        <group key={`leg-${i}`} position={pos as [number, number, number]}>
          {/* Main leg post - chrome */}
          <mesh rotation={[0.05, 0, 0]}>
            <cylinderGeometry args={[0.7, 0.9, 10, 12]} />
            <meshStandardMaterial
              color="#c0c0c0"
              roughness={0.2}
              metalness={0.95}
            />
          </mesh>
          
          {/* Leg leveler foot */}
          <mesh position={[0, -5.5, 0]}>
            <cylinderGeometry args={[1.2, 1.4, 1, 12]} />
            <meshStandardMaterial
              color="#222222"
              roughness={0.6}
              metalness={0.7}
            />
          </mesh>
          
          {/* Leg bracket */}
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.8, 0.8, 1.5, 12]} />
            <meshStandardMaterial
              color="#ffaa00"
              roughness={0.3}
              metalness={0.9}
            />
          </mesh>
        </group>
      ))}

      {/* CABINET SIDE ART PANELS - vibrant artwork (positioned at edges) */}
      {[-15, 15].map((x, i) => (
        <group key={`side-panel-${i}`}>
          {/* Main side panel */}
          <mesh 
            position={[x, 2, -12]} 
            rotation={[0, i === 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            castShadow
          >
            <planeGeometry args={[22, 24]} />
            <meshStandardMaterial
              color="#ff3366"
              emissive="#cc0044"
              emissiveIntensity={0.4}
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
          
          {/* Side panel accent stripe - yellow/orange */}
          <mesh 
            position={[x, 2, -12]} 
            rotation={[0, i === 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[3, 24]} />
            <meshStandardMaterial
              color="#ffcc00"
              emissive="#ff9900"
              emissiveIntensity={0.6}
              roughness={0.2}
              metalness={0.7}
            />
          </mesh>
          
          {/* Side decorative elements */}
          <mesh 
            position={[x, 8, -12]} 
            rotation={[0, i === 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <circleGeometry args={[2, 16]} />
            <meshStandardMaterial
              color="#00ffff"
              emissive="#00ddff"
              emissiveIntensity={0.8}
              roughness={0.3}
              metalness={0.6}
            />
          </mesh>
        </group>
      ))}

      {/* FRONT LOCKDOWN BAR - chrome strip (at front edge) */}
      <mesh position={[0, 12, 3]} castShadow>
        <boxGeometry args={[26, 1.5, 0.8]} />
        <meshStandardMaterial
          color="#d0d0d0"
          roughness={0.1}
          metalness={0.98}
        />
      </mesh>

      {/* COIN DOOR (Front lower panel) */}
      <mesh position={[0, -14, 3.5]} castShadow>
        <boxGeometry args={[10, 4, 1]} />
        <meshStandardMaterial
          color="#1a1a1a"
          roughness={0.4}
          metalness={0.8}
        />
      </mesh>

      {/* COIN SLOT with metallic frame */}
      <group position={[0, -14, 4.1]}>
        <mesh>
          <boxGeometry args={[4, 0.8, 0.3]} />
          <meshStandardMaterial
            color="#ffaa00"
            emissive="#ff8800"
            emissiveIntensity={1}
            roughness={0.1}
            metalness={0.95}
          />
        </mesh>
        <pointLight position={[0, 0, 1]} color="#ffaa00" intensity={8} distance={6} />
      </group>

      {/* START BUTTON - red illuminated */}
      <mesh position={[6, -14, 4.1]} castShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.5, 32]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={1.5}
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>

      {/* CABINET TRIM - yellow/orange accent strips */}
      {[
        { pos: [0, 12, -9], rot: [0, 0, 0], size: [24, 0.8, 0.5] },
        { pos: [0, -16, -9], rot: [0, 0, 0], size: [24, 0.8, 0.5] },
      ].map((trim, i) => (
        <mesh 
          key={`trim-${i}`} 
          position={trim.pos as [number, number, number]}
          rotation={trim.rot as [number, number, number]}
          castShadow
        >
          <boxGeometry args={trim.size as [number, number, number]} />
          <meshStandardMaterial
            color="#ffcc00"
            emissive="#ff9900"
            emissiveIntensity={0.8}
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>
      ))}

      {/* ATTRACT MODE LIGHTS - colorful bulbs */}
      {[
        { pos: [-10, 20, -8], color: '#ff0066' },
        { pos: [10, 20, -8], color: '#00ffff' },
        { pos: [-10, 26, -8], color: '#ffff00' },
        { pos: [10, 26, -8], color: '#ff00ff' },
        { pos: [0, 28, -8], color: '#00ff00' },
      ].map((light, i) => (
        <group key={`attract-${i}`} position={light.pos as [number, number, number]}>
          <mesh>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial
              color={light.color}
              emissive={light.color}
              emissiveIntensity={3}
              transparent
              opacity={0.9}
            />
          </mesh>
          <pointLight color={light.color} intensity={6} distance={12} />
        </group>
      ))}

      {/* SPEAKER GRILLS (on sides of backbox) */}
      {[-9, 9].map((x, i) => (
        <mesh 
          key={`speaker-${i}`} 
          position={[x, 22, -7.4]}
        >
          <circleGeometry args={[1.5, 32]} />
          <meshStandardMaterial
            color="#0a0a0a"
            roughness={0.8}
            metalness={0.4}
          />
        </mesh>
      ))}

      {/* CABINET AMBIENT GLOW */}
      <pointLight position={[0, 8, 10]} color="#4a2a8a" intensity={20} distance={50} decay={2} />
      <pointLight position={[0, -10, 5]} color="#ff6600" intensity={15} distance={40} decay={2} />
    </group>
  );
}
