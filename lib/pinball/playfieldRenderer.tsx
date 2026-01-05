/**
 * Arcade Cabinet Playfield Renderer
 * 
 * Renders full pinball machine aesthetic:
 * - Cabinet frame (wood/metal)
 * - Angled playfield board
 * - Textured background
 * - Metallic rails
 * - Glass cover effect
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// ARCADE CABINET FRAME
// ============================================================================

export function ArcadeCabinetFrame() {
  return (
    <group position={[0, 0, -3]}>
      {/* Left cabinet side - dark wood/metal */}
      <mesh position={[-13, 0, 0]} castShadow>
        <boxGeometry args={[1, 32, 6]} />
        <meshStandardMaterial
          color="#1a0f0a"
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Right cabinet side */}
      <mesh position={[13, 0, 0]} castShadow>
        <boxGeometry args={[1, 32, 6]} />
        <meshStandardMaterial
          color="#1a0f0a"
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Top frame with neon strip */}
      <mesh position={[0, 14.5, 0]} castShadow>
        <boxGeometry args={[28, 1, 6]} />
        <meshStandardMaterial
          color="#2a1a0f"
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      
      {/* Neon top strip */}
      <mesh position={[0, 15, 0.5]}>
        <boxGeometry args={[26, 0.3, 0.3]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={2}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Bottom frame (drain area) */}
      <mesh position={[0, -14.5, 0]} castShadow>
        <boxGeometry args={[28, 1, 6]} />
        <meshStandardMaterial
          color="#2a1a0f"
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>

      {/* Cabinet back panel - Enhanced with arcade artwork */}
      <mesh position={[0, 0, -3]} receiveShadow>
        <planeGeometry args={[26, 30]} />
        <meshStandardMaterial
          color="#1a0a2e"
          roughness={0.6}
          metalness={0.3}
          emissive="#0f051a"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Decorative back panel pattern - Geometric arcade design */}
      <group position={[0, 0, -2.9]}>
        {/* Large center circle (arcade coin slot style) */}
        <mesh position={[0, 0, 0]}>
          <circleGeometry args={[8, 32]} />
          <meshStandardMaterial
            color="#2a1a4a"
            roughness={0.5}
            metalness={0.4}
            emissive="#1a0a3a"
            emissiveIntensity={0.2}
          />
        </mesh>
        
        {/* Concentric rings */}
        {[5, 6, 7].map((radius, i) => (
          <mesh key={`ring-${i}`} position={[0, 0, 0.01]}>
            <ringGeometry args={[radius, radius + 0.2, 32]} />
            <meshBasicMaterial
              color={i === 1 ? "#00ffff" : "#ff00ff"}
              transparent
              opacity={0.4}
            />
          </mesh>
        ))}
        
        {/* Corner decorative panels */}
        {[
          [-10, 12, 0],
          [10, 12, 0],
          [-10, -12, 0],
          [10, -12, 0]
        ].map((pos, i) => (
          <mesh key={`corner-${i}`} position={pos as [number, number, number]}>
            <boxGeometry args={[3, 3, 0.1]} />
            <meshStandardMaterial
              color="#3a2a5a"
              roughness={0.4}
              metalness={0.6}
              emissive="#2a1a4a"
              emissiveIntensity={0.3}
            />
          </mesh>
        ))}
        
        {/* Vertical accent stripes */}
        {[-8, -4, 0, 4, 8].map((x, i) => (
          <mesh key={`stripe-${i}`} position={[x, 0, 0.01]}>
            <planeGeometry args={[0.3, 28]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? "#4a00ff" : "#ff0088"}
              transparent
              opacity={0.15}
            />
          </mesh>
        ))}
        
        {/* Horizontal accent lines */}
        {[-10, -5, 5, 10].map((y, i) => (
          <mesh key={`hline-${i}`} position={[0, y, 0.02]}>
            <planeGeometry args={[24, 0.15]} />
            <meshBasicMaterial
              color="#00ffff"
              transparent
              opacity={0.3}
            />
          </mesh>
        ))}
        
        {/* Glowing dots pattern */}
        {[-6, 0, 6].map((x) => [-8, -4, 0, 4, 8].map((y, i) => (
          <mesh key={`dot-${x}-${y}`} position={[x, y, 0.03]}>
            <circleGeometry args={[0.2, 16]} />
            <meshBasicMaterial
              color="#ffff00"
              transparent
              opacity={0.5}
            />
          </mesh>
        )))}
      </group>

      {/* Corner braces (decorative) - enhanced with glow */}
      {[
        [-12, 13, 0],
        [12, 13, 0],
        [-12, -13, 0],
        [12, -13, 0]
      ].map((pos, i) => (
        <group key={i}>
          <mesh position={pos as [number, number, number]}>
            <boxGeometry args={[1.5, 1.5, 1]} />
            <meshStandardMaterial
              color="#ff6600"
              emissive="#ff3300"
              emissiveIntensity={0.8}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
          <pointLight 
            position={pos as [number, number, number]} 
            color="#ff6600" 
            intensity={3} 
            distance={8}
          />
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// TEXTURED PLAYFIELD
// ============================================================================

export const TexturedPlayfield = React.memo(() => {
  const meshRef = useRef<THREE.Mesh>(null);
  const lastUpdate = useRef(0);

  useFrame((state) => {
    // Throttle to ~30fps for subtle effects
    if (state.clock.elapsedTime - lastUpdate.current < 0.033) return;
    lastUpdate.current = state.clock.elapsedTime;

    // Animated scanlines and subtle pulse
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      if (material.emissiveIntensity !== undefined) {
        material.emissiveIntensity = 0.2 + Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
      }
    }
  });

  return (
    <group>
      {/* Main playfield surface - angled for arcade cabinet view */}
      <mesh 
        ref={meshRef}
        position={[0, -1, -2.5]} 
        rotation={[-0.12, 0, 0]} 
        receiveShadow
      >
        <planeGeometry args={[24, 30]} />
        <meshStandardMaterial
          color="#0f1a2e"
          roughness={0.2}
          metalness={0.7}
          emissive="#1a2848"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Neon circuit board pattern (decorative arcade aesthetic) */}
      <group position={[0, -1, -2.35]} rotation={[-0.12, 0, 0]}>
        {/* Horizontal glowing lines */}
        {[-9, -6, -3, 0, 3, 6, 9].map((y, i) => (
          <mesh key={`h${i}`} position={[0, y, 0]}>
            <planeGeometry args={[22, 0.15]} />
            <meshBasicMaterial 
              color="#00ffff" 
              transparent 
              opacity={0.2}
            />
          </mesh>
        ))}
        
        {/* Vertical glowing lines */}
        {[-7, -4, -1, 2, 5, 8].map((x, i) => (
          <mesh key={`v${i}`} position={[x, 0, 0]}>
            <planeGeometry args={[0.15, 28]} />
            <meshBasicMaterial 
              color="#ff00ff" 
              transparent 
              opacity={0.15}
            />
          </mesh>
        ))}
        
        {/* Circuit nodes (decorative dots) */}
        {[-6, 0, 6].map((x) => [-6, 0, 6].map((y) => (
          <mesh key={`node-${x}-${y}`} position={[x, y, 0.01]}>
            <circleGeometry args={[0.15, 8]} />
            <meshBasicMaterial 
              color="#ffff00" 
              transparent 
              opacity={0.6}
            />
          </mesh>
        )))}
      </group>

      {/* Starfield background effect (deep space arcade feel) */}
      <Stars count={300} />
      
      {/* Additional pinball machine decorations */}
      <PinballDecorations />
    </group>
  );
});

// ============================================================================
// STARFIELD EFFECT
// ============================================================================

function Stars({ count = 300 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const lastUpdate = useRef(0);

  const positions = React.useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 32;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 38;
      arr[i * 3 + 2] = -5 - Math.random() * 4;
    }
    return arr;
  }, [count]);

  const colors = React.useMemo(() => {
    const arr = new Float32Array(count * 3);
    const arcadeColors = [
      [0.0, 1.0, 1.0], // Cyan
      [1.0, 0.0, 1.0], // Magenta
      [1.0, 1.0, 0.0], // Yellow
      [1.0, 1.0, 1.0], // White
      [0.5, 0.5, 1.0], // Light blue
    ];
    
    for (let i = 0; i < count; i++) {
      const color = arcadeColors[Math.floor(Math.random() * arcadeColors.length)];
      arr[i * 3] = color[0];
      arr[i * 3 + 1] = color[1];
      arr[i * 3 + 2] = color[2];
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    // Throttle to ~20fps for star effects
    if (state.clock.elapsedTime - lastUpdate.current < 0.05) return;
    lastUpdate.current = state.clock.elapsedTime;

    if (pointsRef.current) {
      // Slow rotation for depth
      pointsRef.current.rotation.z = state.clock.elapsedTime * 0.015;
      
      // Twinkle effect
      const material = pointsRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ============================================================================
// METALLIC SIDE RAILS
// ============================================================================

export function MetallicSideRails() {
  return (
    <group>
      {/* Left outer rail */}
      <mesh position={[-11.5, 0, 0]} rotation={[-0.1, 0, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 30, 16]} />
        <meshStandardMaterial
          color="#c0c0c0"
          roughness={0.2}
          metalness={0.95}
          emissive="#666666"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Left inner rail */}
      <mesh position={[-10, 0, 0]} rotation={[-0.1, 0, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 30, 16]} />
        <meshStandardMaterial
          color="#888888"
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* Right inner rail */}
      <mesh position={[10, 0, 0]} rotation={[-0.1, 0, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 30, 16]} />
        <meshStandardMaterial
          color="#888888"
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* Right outer rail (behind launcher) */}
      <mesh position={[11.5, 0, 0]} rotation={[-0.1, 0, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 30, 16]} />
        <meshStandardMaterial
          color="#c0c0c0"
          roughness={0.2}
          metalness={0.95}
          emissive="#666666"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Top bumper rail */}
      <mesh position={[0, 13.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 24, 16]} />
        <meshStandardMaterial
          color="#c0c0c0"
          roughness={0.2}
          metalness={0.95}
        />
      </mesh>

      {/* Bottom drain rail */}
      <mesh position={[0, -13.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 24, 16]} />
        <meshStandardMaterial
          color="#c0c0c0"
          roughness={0.2}
          metalness={0.95}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// GLASS COVER EFFECT (Optional overlay)
// ============================================================================

export function GlassCover() {
  const glassRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glassRef.current) {
      // Subtle reflection shimmer
      glassRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  return (
    <mesh 
      ref={glassRef}
      position={[0, 0, 2]} 
      rotation={[-0.1, 0, 0]}
    >
      <planeGeometry args={[25, 31]} />
      <meshPhysicalMaterial
        color="#ffffff"
        transparent
        opacity={0.08}
        roughness={0.1}
        metalness={0.0}
        transmission={0.9}
        thickness={0.5}
        reflectivity={0.5}
      />
    </mesh>
  );
}

// ============================================================================
// DECORATIVE CORNER POSTS
// ============================================================================

export function CornerPosts() {
  const positions: [number, number, number][] = [
    [-10, 12, 0.5],
    [10, 12, 0.5],
    [-10, -12, 0.5],
    [10, -12, 0.5]
  ];

  return (
    <group>
      {positions.map((pos, i) => (
        <group key={i} position={pos}>
          {/* Post cylinder */}
          <mesh castShadow>
            <cylinderGeometry args={[0.5, 0.6, 3, 16]} />
            <meshStandardMaterial
              color="#ff6600"
              roughness={0.3}
              metalness={0.8}
              emissive="#ff3300"
              emissiveIntensity={0.5}
            />
          </mesh>

          {/* Top cap */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshStandardMaterial
              color="#ffaa00"
              roughness={0.2}
              metalness={0.9}
              emissive="#ff8800"
              emissiveIntensity={0.6}
            />
          </mesh>

          {/* Glow ring */}
          <pointLight color="#ff6600" intensity={3} distance={8} />
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// PINBALL DECORATIONS (Additional arcade elements)
// ============================================================================

function PinballDecorations() {
  const spinner1Ref = useRef<THREE.Mesh>(null);
  const spinner2Ref = useRef<THREE.Mesh>(null);
  const flasher1Ref = useRef<THREE.PointLight>(null);
  const flasher2Ref = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Rotating spinners
    if (spinner1Ref.current) {
      spinner1Ref.current.rotation.z += 0.05;
    }
    if (spinner2Ref.current) {
      spinner2Ref.current.rotation.z -= 0.05;
    }
    
    // Flashing lights
    if (flasher1Ref.current) {
      flasher1Ref.current.intensity = 5 + Math.sin(time * 3) * 4;
    }
    if (flasher2Ref.current) {
      flasher2Ref.current.intensity = 5 + Math.cos(time * 2.5) * 4;
    }
  });

  return (
    <group>
      {/* Lane guides (left side) - on playfield surface */}
      {[-9, -7.5, -6].map((x, i) => (
        <mesh key={`lane-l-${i}`} position={[x, 8, -2]} rotation={[-0.12, 0, Math.PI / 12]}>
          <cylinderGeometry args={[0.15, 0.15, 4, 16]} />
          <meshStandardMaterial
            color="#ffaa00"
            metalness={0.9}
            roughness={0.2}
            emissive="#ff8800"
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}

      {/* Lane guides (right side) - on playfield surface */}
      {[6, 7.5, 9].map((x, i) => (
        <mesh key={`lane-r-${i}`} position={[x, 8, -2]} rotation={[-0.12, 0, -Math.PI / 12]}>
          <cylinderGeometry args={[0.15, 0.15, 4, 16]} />
          <meshStandardMaterial
            color="#ffaa00"
            metalness={0.9}
            roughness={0.2}
            emissive="#ff8800"
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}

      {/* Rollover lanes (top) - flush with surface */}
      {[-3, 0, 3].map((x, i) => (
        <group key={`rollover-${i}`} position={[x, 10, -2]}>
          <mesh rotation={[-0.12, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
            <meshStandardMaterial
              color="#00ffff"
              metalness={0.8}
              roughness={0.3}
              emissive="#00aaff"
              emissiveIntensity={0.6}
            />
          </mesh>
          <pointLight color="#00ffff" intensity={2} distance={5} />
        </group>
      ))}

      {/* Target banks (decorative) - on surface */}
      {[
        { pos: [-8, 4, -2], color: '#ff0088' },
        { pos: [-7, 3, -2], color: '#ff00ff' },
        { pos: [-6, 2, -2], color: '#8800ff' },
      ].map((target, i) => (
        <mesh key={`target-${i}`} position={target.pos as [number, number, number]} rotation={[-0.12, 0, 0]}>
          <boxGeometry args={[0.8, 1.5, 0.2]} />
          <meshStandardMaterial
            color={target.color}
            metalness={0.7}
            roughness={0.3}
            emissive={target.color}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}

      {/* Spinners (rotating targets) - on surface */}
      <group position={[-5, 6, -2]}>
        <mesh ref={spinner1Ref}>
          <boxGeometry args={[0.1, 2, 1]} />
          <meshStandardMaterial
            color="#ffff00"
            metalness={0.9}
            roughness={0.1}
            emissive="#ffaa00"
            emissiveIntensity={0.8}
          />
        </mesh>
        <pointLight color="#ffff00" intensity={3} distance={6} />
      </group>

      <group position={[5, 6, -2]}>
        <mesh ref={spinner2Ref}>
          <boxGeometry args={[0.1, 2, 1]} />
          <meshStandardMaterial
            color="#00ffff"
            metalness={0.9}
            roughness={0.1}
            emissive="#00aaff"
            emissiveIntensity={0.8}
          />
        </mesh>
        <pointLight color="#00ffff" intensity={3} distance={6} />
      </group>

      {/* Kicker/Saucer holes - embedded in surface */}
      {[
        { pos: [-7, -3, -2.4], color: '#ff00ff' },
        { pos: [7, -3, -2.4], color: '#00ffff' },
      ].map((saucer, i) => (
        <group key={`saucer-${i}`} position={saucer.pos as [number, number, number]}>
          <mesh rotation={[-0.12, 0, 0]}>
            <cylinderGeometry args={[0.8, 0.6, 0.4, 32]} />
            <meshStandardMaterial
              color={saucer.color}
              metalness={0.8}
              roughness={0.2}
              emissive={saucer.color}
              emissiveIntensity={0.7}
            />
          </mesh>
          <mesh position={[0, 0, 0.3]} rotation={[-0.12, 0, 0]}>
            <circleGeometry args={[0.5, 32]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </group>
      ))}

      {/* Flasher domes (pulsing lights) - on surface */}
      <group position={[-4, -8, -2]}>
        <mesh>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial
            color="#ff0000"
            metalness={0.5}
            roughness={0.3}
            emissive="#ff0000"
            emissiveIntensity={1.5}
            transparent
            opacity={0.7}
          />
        </mesh>
        <pointLight ref={flasher1Ref} color="#ff0000" intensity={5} distance={10} />
      </group>

      <group position={[4, -8, -2]}>
        <mesh>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial
            color="#00ff00"
            metalness={0.5}
            roughness={0.3}
            emissive="#00ff00"
            emissiveIntensity={1.5}
            transparent
            opacity={0.7}
          />
        </mesh>
        <pointLight ref={flasher2Ref} color="#00ff00" intensity={5} distance={10} />
      </group>

      {/* Pop bumper rings (decorative circles) - on surface */}
      {[
        { pos: [-8, -6, -2.3], color: '#ff0088' },
        { pos: [8, -6, -2.3], color: '#0088ff' },
        { pos: [0, -10, -2.3], color: '#ffff00' },
      ].map((ring, i) => (
        <mesh key={`ring-${i}`} position={ring.pos as [number, number, number]} rotation={[-0.12, 0, 0]}>
          <torusGeometry args={[1, 0.2, 16, 32]} />
          <meshStandardMaterial
            color={ring.color}
            metalness={0.9}
            roughness={0.1}
            emissive={ring.color}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}

      {/* Ramp guides (curved rails) - slightly above surface */}
      <group position={[0, 2, -2]}>
        <mesh rotation={[-0.12, 0, Math.PI / 6]}>
          <torusGeometry args={[3, 0.15, 16, 32, Math.PI]} />
          <meshStandardMaterial
            color="#888888"
            metalness={0.95}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* Side rubber posts - on surface */}
      {[-9.5, 9.5].map((x, i) => (
        <React.Fragment key={`rubber-${i}`}>
          {[-4, 0, 4, 8].map((y, j) => (
            <mesh key={`${i}-${j}`} position={[x, y, -2]} rotation={[-0.12, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.6, 16]} />
              <meshStandardMaterial
                color="#ff3300"
                metalness={0.4}
                roughness={0.6}
              />
            </mesh>
          ))}
        </React.Fragment>
      ))}

      {/* Decorative star targets - on surface */}
      {[
        { pos: [-3, -5, -2], rotation: 0 },
        { pos: [3, -5, -2], rotation: Math.PI / 5 },
      ].map((star, i) => (
        <mesh key={`star-${i}`} position={star.pos as [number, number, number]} rotation={[-0.12, 0, star.rotation]}>
          <cylinderGeometry args={[0.5, 0.5, 0.2, 5]} />
          <meshStandardMaterial
            color="#ffff00"
            metalness={0.8}
            roughness={0.2}
            emissive="#ffaa00"
            emissiveIntensity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}
