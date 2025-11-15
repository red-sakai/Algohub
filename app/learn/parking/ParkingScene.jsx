"use client";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Sky, Stats, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Simple key input
const pressed = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { pressed.add(e.key.toLowerCase()); });
  window.addEventListener('keyup', (e) => { pressed.delete(e.key.toLowerCase()); });
}
const key = (k) => pressed.has(k.toLowerCase());

const STACK_MARKER_POSITION = [40, 0.08, -19];
const STACK_MARKER_SIZE = 4.5;
const STACK_COUNTDOWN_START = 3;

function CarModel(props) {
  const { scene } = useGLTF('/car-show/models/car/scene.gltf');
  return <primitive object={scene} {...props} />;
}

function Car({ onSpeedChange, carRef }) {
  const internalRef = useRef();
  const ref = carRef ? carRef : internalRef;
  const vel = useRef(0);
  const heading = useRef(0);
  // Web Audio engine: more reliable playback and smooth fades
  const audioCtxRef = useRef(null);
  const gainRef = useRef(null);
  const bufferRef = useRef(null);
  const sourceRef = useRef(null);
  // Brake sound refs
  const brakeGainRef = useRef(null);
  const brakeBufferRef = useRef(null);
  const brakeSourceRef = useRef(null);
  // Reverse sound refs
  const reverseGainRef = useRef(null);
  const reverseBufferRef = useRef(null);
  const reverseSourceRef = useRef(null);
  const unlockedRef = useRef(false);
  const loadingRef = useRef(false);
  const lastMovingRef = useRef(false);

  // Setup unlock and preload buffer after first gesture
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ensureCtx = () => {
      if (audioCtxRef.current) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { console.warn('[CarAudio] Web Audio API not supported'); return; }
      audioCtxRef.current = new Ctx();
      const g = audioCtxRef.current.createGain();
      g.gain.value = 0;
      g.connect(audioCtxRef.current.destination);
      gainRef.current = g;
    };
    const preload = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      const ctx = audioCtxRef.current;
      try {
        if (!bufferRef.current) {
          const res = await fetch('/car-audio/car_driving_sfx2.mp3', { cache: 'force-cache' });
          const ab = await res.arrayBuffer();
          if (ctx) bufferRef.current = await ctx.decodeAudioData(ab.slice(0));
        }
        if (!brakeBufferRef.current) {
          const res2 = await fetch('/car-audio/car_brake.mp3', { cache: 'force-cache' });
          const ab2 = await res2.arrayBuffer();
          if (ctx) brakeBufferRef.current = await ctx.decodeAudioData(ab2.slice(0));
        }
        if (!reverseBufferRef.current) {
          const res3 = await fetch('/car-audio/car_reverse.mp3', { cache: 'force-cache' });
          const ab3 = await res3.arrayBuffer();
          if (ctx) reverseBufferRef.current = await ctx.decodeAudioData(ab3.slice(0));
        }
      } catch (e) {
        console.warn('[CarAudio] Failed to preload audio', e);
      } finally {
        loadingRef.current = false;
      }
    };
    const unlock = async () => {
      try {
        ensureCtx();
        if (!audioCtxRef.current) return;
        await audioCtxRef.current.resume().catch(() => {});
        unlockedRef.current = true;
        preload();
      } catch {}
      try { window.removeEventListener('pointerdown', unlock); } catch {}
      try { window.removeEventListener('keydown', unlock); } catch {}
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      try { window.removeEventListener('pointerdown', unlock); } catch {}
      try { window.removeEventListener('keydown', unlock); } catch {}
    };
  }, []);

  const ensureEnginePlaying = () => {
    const ctx = audioCtxRef.current;
    if (!ctx || !gainRef.current || !bufferRef.current) return false;
    if (sourceRef.current) return true;
    try {
      const src = ctx.createBufferSource();
      src.buffer = bufferRef.current;
      src.loop = true;
      src.connect(gainRef.current);
      src.start(0);
      sourceRef.current = src;
      return true;
    } catch (e) {
      console.debug('[CarAudio] Failed to start buffer source', e);
      return false;
    }
  };

  const ensureBrakePlaying = () => {
    const ctx = audioCtxRef.current;
    if (!ctx || !brakeGainRef.current || !brakeBufferRef.current) return false;
    if (brakeSourceRef.current) return true;
    try {
      const src = ctx.createBufferSource();
      src.buffer = brakeBufferRef.current;
      src.loop = true;
      src.connect(brakeGainRef.current);
      src.start(0);
      brakeSourceRef.current = src;
      return true;
    } catch (e) {
      console.debug('[CarAudio] Failed to start brake source', e);
      return false;
    }
  };

  const ensureReversePlaying = () => {
    const ctx = audioCtxRef.current;
    if (!ctx || !reverseGainRef.current || !reverseBufferRef.current) return false;
    if (reverseSourceRef.current) return true;
    try {
      const src = ctx.createBufferSource();
      src.buffer = reverseBufferRef.current;
      src.loop = true;
      src.connect(reverseGainRef.current);
      src.start(0);
      reverseSourceRef.current = src;
      return true;
    } catch (e) {
      console.debug('[CarAudio] Failed to start reverse source', e);
      return false;
    }
  };

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const up = key('w') || key('arrowup');
    const down = key('s') || key('arrowdown');
    const left = key('a') || key('arrowleft');
    const right = key('d') || key('arrowright');

    const accel = 10;
    const decel = 12;
    if (up) vel.current = Math.min(vel.current + accel * dt, 14);
    else if (down) vel.current = Math.max(vel.current - accel * dt, -8);
    else {
      if (vel.current > 0) vel.current = Math.max(0, vel.current - decel * dt);
      else if (vel.current < 0) vel.current = Math.min(0, vel.current + decel * dt);
    }

    const turnScale = Math.min(1, Math.abs(vel.current) / 6);
    const turnRate = 2.4 * turnScale;
    if (left) heading.current += turnRate * dt;
    if (right) heading.current -= turnRate * dt;

    g.rotation.y = heading.current;

    // Movement direction: model appears oriented toward +Z, so use +Z as "forward".
    const forwardMove = new THREE.Vector3(0, 0, 1).applyEuler(g.rotation).multiplyScalar(vel.current * dt);
    g.position.add(forwardMove);

    // Engine/brake/reverse audio behavior via Web Audio
    const speedVal = vel.current;
    const speedAbs = Math.abs(speedVal);
    const moving = speedAbs > 0.25;
    const reversing = speedVal < -0.25;
    const ctx = audioCtxRef.current;
    const gain = gainRef.current;
    const braking = key('s') || key('arrowdown');
    if (unlockedRef.current && ctx && gain && bufferRef.current) {
      if (braking) {
        // Fade engine out quickly when braking
        try {
          const t = ctx.currentTime;
          gain.gain.cancelScheduledValues(t);
          gain.gain.setTargetAtTime(0, t, 0.08);
        } catch {}
        if (moving && speedVal > 0) {
          // Forward braking: play brake, not reverse
          if (!brakeGainRef.current) {
            const bg = ctx.createGain();
            bg.gain.value = 0;
            bg.connect(ctx.destination);
            brakeGainRef.current = bg;
          }
          if (ensureBrakePlaying()) {
            const targetBrake = Math.min(0.9, 0.4 + (speedAbs / 14) * 0.5);
            try {
              const t2 = ctx.currentTime;
              brakeGainRef.current.gain.cancelScheduledValues(t2);
              brakeGainRef.current.gain.setTargetAtTime(targetBrake, t2, 0.05);
            } catch {}
          }
          // Fade reverse out if present
          if (reverseGainRef.current) {
            try {
              const t3 = ctx.currentTime;
              reverseGainRef.current.gain.cancelScheduledValues(t3);
              reverseGainRef.current.gain.setTargetAtTime(0, t3, 0.1);
            } catch {}
          }
        } else if (reversing) {
          // Into reverse: stop brake and play reverse while S held
          if (brakeGainRef.current) {
            try {
              const t4 = ctx.currentTime;
              brakeGainRef.current.gain.cancelScheduledValues(t4);
              brakeGainRef.current.gain.setTargetAtTime(0, t4, 0.08);
            } catch {}
          }
          if (!reverseGainRef.current) {
            const rg = ctx.createGain();
            rg.gain.value = 0;
            rg.connect(ctx.destination);
            reverseGainRef.current = rg;
          }
            if (ensureReversePlaying()) {
              const targetRev = Math.min(0.85, 0.35 + (speedAbs / 8) * 0.5);
              try {
                const t5 = ctx.currentTime;
                reverseGainRef.current.gain.cancelScheduledValues(t5);
                reverseGainRef.current.gain.setTargetAtTime(targetRev, t5, 0.08);
              } catch {}
            }
        } else {
          // Near zero: fade brake & reverse down
          if (brakeGainRef.current) {
            try {
              const t6 = ctx.currentTime;
              brakeGainRef.current.gain.cancelScheduledValues(t6);
              brakeGainRef.current.gain.setTargetAtTime(0, t6, 0.08);
            } catch {}
          }
          if (reverseGainRef.current) {
            try {
              const t7 = ctx.currentTime;
              reverseGainRef.current.gain.cancelScheduledValues(t7);
              reverseGainRef.current.gain.setTargetAtTime(0, t7, 0.08);
            } catch {}
          }
        }
      } else {
        // Normal engine logic
        if (moving && !reversing) {
          if (ensureEnginePlaying()) {
            const target = Math.min(0.85, 0.25 + (speedAbs / 14) * 0.6);
            try {
              const t = ctx.currentTime;
              gain.gain.cancelScheduledValues(t);
              gain.gain.setTargetAtTime(target, t, 0.12);
            } catch {}
          }
        } else if (lastMovingRef.current && !moving) {
          try {
            const t = ctx.currentTime;
            gain.gain.cancelScheduledValues(t);
            gain.gain.setTargetAtTime(0, t, 0.2);
          } catch {}
        }
        // If brake gain exists, fade it out
        if (brakeGainRef.current) {
          try {
            const t3 = ctx.currentTime;
            brakeGainRef.current.gain.cancelScheduledValues(t3);
            brakeGainRef.current.gain.setTargetAtTime(0, t3, 0.15);
          } catch {}
        }
        // Fade reverse out if not reversing
        if (reverseGainRef.current && !reversing) {
          try {
            const t8 = ctx.currentTime;
            reverseGainRef.current.gain.cancelScheduledValues(t8);
            reverseGainRef.current.gain.setTargetAtTime(0, t8, 0.15);
          } catch {}
        }
      }
    }
    lastMovingRef.current = moving;

    // Report speed upward (throttle updates)
    if (typeof onSpeedChange === 'function') {
      if (!Car._lastReport) Car._lastReport = 0;
      if (Math.abs(Car._lastReport - speedVal) > 0.02) {
        Car._lastReport = speedVal;
        try { onSpeedChange(speedVal); } catch {}
      }
    }
  });

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      try { if (sourceRef.current) sourceRef.current.stop(0); } catch {}
      try { if (sourceRef.current) sourceRef.current.disconnect(); } catch {}
      try { if (gainRef.current) gainRef.current.disconnect(); } catch {}
      try { if (brakeSourceRef.current) brakeSourceRef.current.stop(0); } catch {}
      try { if (brakeSourceRef.current) brakeSourceRef.current.disconnect(); } catch {}
      try { if (brakeGainRef.current) brakeGainRef.current.disconnect(); } catch {}
      sourceRef.current = null;
      gainRef.current = null;
      brakeSourceRef.current = null;
      brakeGainRef.current = null;
      try { if (reverseSourceRef.current) reverseSourceRef.current.stop(0); } catch {}
      try { if (reverseSourceRef.current) reverseSourceRef.current.disconnect(); } catch {}
      try { if (reverseGainRef.current) reverseGainRef.current.disconnect(); } catch {}
      reverseSourceRef.current = null;
      reverseGainRef.current = null;
      // Do not close AudioContext to avoid interfering with other audio; leave it for GC
    };
  }, []);

  return (
    <group ref={ref} position={[0, 0.3, 5]}>
      <CarModel scale={0.01} />
    </group>
  );
}

function CameraRig({ targetRef }) {
  const { camera } = useThree();
  const smoothPos = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  useFrame(() => {
    const target = targetRef.current;
    if (!target) return;
    const targetPos = target.position.clone();
  // Bird's-eye offset (raised higher for more top-down view)
  const offset = new THREE.Vector3(50, 40, 25);
    const desired = targetPos.clone().add(offset);
    if (!initialized.current) {
      smoothPos.current.copy(desired);
      initialized.current = true;
    } else {
      smoothPos.current.lerp(desired, 0.1);
    }
    camera.position.copy(smoothPos.current);
    const lookAt = targetPos.clone().add(new THREE.Vector3(0, 1, 0));
    camera.lookAt(lookAt);
  });
  return null;
}

function ParkingArea() {
  const { scene } = useGLTF('/models/modern_parking_area.glb');
  const parkingScene = useMemo(() => {
    const cloned = scene.clone(true);
    const tempBox = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    tempBox.getSize(size);
    const targetSpan = 150;
    const maxSpan = Math.max(size.x || 1, size.z || 1);
    const scale = maxSpan > 0 ? targetSpan / maxSpan : 1;
    cloned.scale.setScalar(scale);
    cloned.updateMatrixWorld(true);

    const adjustedBox = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    adjustedBox.getCenter(center);
    const minY = adjustedBox.min.y;
    cloned.position.set(-center.x, -minY, -center.z);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);
  return <primitive object={parkingScene} />;
}

function StackMarker({ position = STACK_MARKER_POSITION, size = STACK_MARKER_SIZE, carRef, onPresenceChange, countdown, active }) {
  const planeSize = useMemo(() => [size, size], [size]);
  const textFontSize = useMemo(() => size * 0.32, [size]);
  const frameGeometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(size * 1.15, size * 1.15);
    const edges = new THREE.EdgesGeometry(plane);
    plane.dispose();
    return edges;
  }, [size]);
  const lastInsideRef = useRef(false);

  useFrame(() => {
    const car = carRef?.current;
    if (!car) return;
    const carPos = car.position;
    const half = size * 0.5;
    const dx = carPos.x - position[0];
    const dz = carPos.z - position[2];
    const dy = Math.abs((carPos.y || 0) - (position[1] || 0));
    const inside = Math.abs(dx) <= half && Math.abs(dz) <= half && dy <= 2.2;
    if (inside !== lastInsideRef.current) {
      lastInsideRef.current = inside;
      if (typeof onPresenceChange === 'function') {
        onPresenceChange(inside);
      }
    }
  });

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
        <planeGeometry args={planeSize} />
        <meshStandardMaterial
          color="#0bff9b"
          emissive="#0bff9b"
          emissiveIntensity={active ? 4.2 : 2.2}
          roughness={0.12}
          metalness={0.08}
          opacity={0.96}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} geometry={frameGeometry}>
        <lineBasicMaterial color={active ? '#4dffcf' : '#0bff9b'} linewidth={2} />
      </lineSegments>
      <Text
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.08, 0]}
        fontSize={textFontSize}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.08}
        outlineColor="#024d31"
        letterSpacing={0.06}
      >
        STACK
      </Text>
      <Text
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.36, 0]}
        fontSize={textFontSize * 0.9}
        color={active ? '#ffffff' : '#d9ffe9'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.12}
        outlineColor={active ? '#069363' : '#1b664a'}
        letterSpacing={0.04}
      >
        {Math.max(0, countdown).toString()}
      </Text>
    </group>
  );
}

export default function ParkingScene() {
  useEffect(() => {
    useGLTF.preload('/car-show/models/car/scene.gltf');
    useGLTF.preload('/models/modern_parking_area.glb');
  }, []);
  const [speed, setSpeed] = useState(0);
  const [carOnMarker, setCarOnMarker] = useState(false);
  const [stackCountdown, setStackCountdown] = useState(STACK_COUNTDOWN_START);
  const countdownValueRef = useRef(STACK_COUNTDOWN_START);
  const countdownIntervalRef = useRef(null);
  const carRef = useRef(null);

  const handleMarkerPresence = useCallback((isInside) => {
    setCarOnMarker((prev) => {
      if (prev === isInside) return prev;
      countdownValueRef.current = STACK_COUNTDOWN_START;
      setStackCountdown(STACK_COUNTDOWN_START);
      return isInside;
    });
  }, []);

  useEffect(() => {
    if (carOnMarker) {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
      }
      const intervalId = window.setInterval(() => {
        countdownValueRef.current = Math.max(0, countdownValueRef.current - 1);
        setStackCountdown((prev) => {
          if (prev <= 0) return 0;
          return Math.max(0, prev - 1);
        });
        if (countdownValueRef.current <= 0) {
          window.clearInterval(intervalId);
          countdownIntervalRef.current = null;
        }
      }, 1000);
      countdownIntervalRef.current = intervalId;
      return () => {
        window.clearInterval(intervalId);
        countdownIntervalRef.current = null;
      };
    }

    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    return undefined;
  }, [carOnMarker]);

  return (
    <div className="relative w-full h-full">
      <Canvas shadows camera={{ position: [10, 18, 15], fov: 50 }} style={{ width: '100%', height: '100%' }}>
        <color attach="background" args={[ '#9cc9ff' ]} />
        <fog attach="fog" args={[ '#cde4ff', 80, 260 ]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[38, 52, 24]} intensity={1.6} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <Suspense fallback={null}>
          <Sky sunPosition={[30, 160, -20]} turbidity={6} rayleigh={2.2} mieCoefficient={0.005} mieDirectionalG={0.7} inclination={0.38} azimuth={0.12} />
          <ParkingArea />
          <StackMarker
            carRef={carRef}
            onPresenceChange={handleMarkerPresence}
            countdown={stackCountdown}
            active={carOnMarker}
          />
          <Car onSpeedChange={setSpeed} carRef={carRef} />
          <Environment preset="sunset" background />
        </Suspense>
        <CameraRig targetRef={carRef} />
        <Stats />
      </Canvas>
      <div className="pointer-events-none absolute right-4 bottom-24 z-10 select-none rounded-2xl bg-black/60 px-3 py-2 text-white ring-1 ring-white/20 backdrop-blur-sm sm:right-6 sm:bottom-28">
        <div className="text-xs uppercase tracking-wider text-white/80">Speed</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <div className="text-2xl font-extrabold tabular-nums">{Math.max(0, Math.round(Math.abs(speed) * 6))}</div>
          <div className="text-[10px] opacity-80">km/h</div>
        </div>
      </div>
      <div className="pointer-events-none absolute left-4 bottom-24 z-10 select-none rounded-2xl bg-emerald-500/40 px-3 py-2 text-white ring-1 ring-white/30 backdrop-blur-sm sm:left-6 sm:bottom-28">
        <div className="text-xs uppercase tracking-wider text-white/80">Stack Timer</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <div className="text-2xl font-extrabold tabular-nums">{Math.max(0, stackCountdown)}</div>
          <div className="text-[10px] opacity-80">secs</div>
        </div>
        <div className="text-[10px] opacity-75">{carOnMarker ? 'Holding position…' : 'Drive onto STACK zone'}</div>
      </div>
    </div>
  );
}

// Ensure model is preloaded when module evaluated (optional redundancy)
try {
  if (useGLTF.preload) {
    useGLTF.preload('/car-show/models/car/scene.gltf');
    useGLTF.preload('/models/modern_parking_area.glb');
  }
} catch {}
