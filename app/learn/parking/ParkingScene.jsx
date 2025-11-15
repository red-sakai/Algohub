"use client";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Sky, Stats, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getSupabaseClient } from '@/lib/supabase/client';

// Simple key input
const pressed = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { pressed.add(e.key.toLowerCase()); });
  window.addEventListener('keyup', (e) => { pressed.delete(e.key.toLowerCase()); });
}
const key = (k) => pressed.has(k.toLowerCase());

const STACK_MARKER_POSITION = [40, 0.08, -19];
const STACK_MARKER_SIZE = 7;
const QUEUE_MARKER_POSITION = [-40, 0.08, 19];
const QUEUE_MARKER_SIZE = 7;
const INTERACT_MARKER_POSITION = [40, 0.2, -53];
const INTERACT_MARKER_SIZE = 6.5;
const STREET_ROAD_POSITION = [37, 0.02, -585];
const STREET_ROAD_ROTATION = [0, Math.PI, 0];
const STREET_ROAD_SCALE = 1.7; // tweak these three constants to align the road with the garage
const PARKING_TOLL_POSITION = [22, 0.4, -48];
const PARKING_TOLL_ROTATION = [0, Math.PI * 0.5, 0];
const PARKING_TOLL_SCALE = 2; // adjust these to line the toll booth up with the roadway
const ROAD_BARRIER_POSITION = [38, 0.02, -48];
const ROAD_BARRIER_ROTATION = [0, Math.PI * 0, 0];
const ROAD_BARRIER_SCALE = 5; // tweak to align barrier with the entrance
const STACK_COUNTDOWN_START = 3;
const COUNTDOWN_MODEL_SCALE = 4;
const BARRIER_OPEN_ANGLE = 0.9;
const COUNTDOWN_MODELS = {
  3: '/models/3.glb',
  2: '/models/2.glb',
  1: '/models/1.glb',
};
const MARKER_SFX_URL = '/marker_sfx.mp3';
const COUNTDOWN_SFX_URL = '/321countdown.mp3';
const STACK_MARKER_COLORS = Object.freeze({
  plane: {
    color: '#2fffc0',
    emissive: '#12c68e',
    intensity: { active: 1.4, inactive: 0.6 },
  },
  frame: {
    color: '#46ffd4',
    emissive: '#2af8b2',
    intensity: { active: 0.9, inactive: 0.4 },
  },
  baseLine: {
    active: '#7dffe2',
    inactive: '#3affc4',
  },
  upperLine: {
    active: '#ffffff',
    inactive: '#aaffe8',
  },
  lowerLine: {
    active: '#b9fff0',
    inactive: '#6effd0',
  },
  text: {
    color: '#ffffff',
    outline: '#1b8064',
  },
  stripe: {
    base: 'rgba(50, 255, 185, 0.12)',
    highlight: 'rgba(50, 255, 185, 0.55)',
  },
});
const QUEUE_MARKER_COLORS = Object.freeze({
  plane: {
    color: '#ffbd66',
    emissive: '#d97500',
    intensity: { active: 1.35, inactive: 0.55 },
  },
  frame: {
    color: '#ffc978',
    emissive: '#ff8c1a',
    intensity: { active: 0.95, inactive: 0.45 },
  },
  baseLine: {
    active: '#ffe1ad',
    inactive: '#ffb764',
  },
  upperLine: {
    active: '#fff3d6',
    inactive: '#ffcfa0',
  },
  lowerLine: {
    active: '#ffd9a1',
    inactive: '#ffae59',
  },
  text: {
    color: '#ffffff',
    outline: '#8a4d00',
  },
  stripe: {
    base: 'rgba(255, 196, 120, 0.12)',
    highlight: 'rgba(255, 153, 0, 0.55)',
  },
});
const INTERACT_MARKER_COLORS = Object.freeze({
  plane: {
    color: '#6fb8ff',
    emissive: '#2265d8',
    intensity: { active: 1.4, inactive: 0.55 },
  },
  frame: {
    color: '#8accff',
    emissive: '#3e8bff',
    intensity: { active: 1, inactive: 0.45 },
  },
  baseLine: {
    active: '#d1e7ff',
    inactive: '#8fc2ff',
  },
  upperLine: {
    active: '#f0f6ff',
    inactive: '#b5d7ff',
  },
  lowerLine: {
    active: '#b7d8ff',
    inactive: '#7db7ff',
  },
  text: {
    color: '#ffffff',
    outline: '#1b3c66',
  },
  stripe: {
    base: 'rgba(110, 180, 255, 0.12)',
    highlight: 'rgba(70, 132, 238, 0.55)',
  },
});
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const LICENSE_STORAGE_KEY = 'algohub-license-card-path';
const LICENSE_EVENT = 'algohub-license-card-updated';
const DEFAULT_LICENSE_IMAGE = '/drivers_license.png';

const easeOutCubic = (t) => {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
};

function useMarkerController({ startValue, markerSfx, countdownSfx, markerVolume = 0.7, countdownVolume = 0.8 }) {
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(startValue);
  const countdownValueRef = useRef(startValue);
  const countdownIntervalRef = useRef(null);
  const markerAudioRef = useRef(null);
  const countdownAudioRef = useRef(null);

  const playAudio = useCallback((audioRef) => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
    } catch {}
    audio.play().catch(() => {});
  }, []);

  const stopAudio = useCallback((audioRef) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const markerAudio = new Audio(markerSfx);
    markerAudio.preload = 'auto';
    markerAudio.crossOrigin = 'anonymous';
    markerAudio.volume = markerVolume;
    markerAudioRef.current = markerAudio;

    const countdownAudio = new Audio(countdownSfx);
    countdownAudio.preload = 'auto';
    countdownAudio.crossOrigin = 'anonymous';
    countdownAudio.volume = countdownVolume;
    countdownAudioRef.current = countdownAudio;

    return () => {
      stopAudio(markerAudioRef);
      stopAudio(countdownAudioRef);
      markerAudioRef.current = null;
      countdownAudioRef.current = null;
    };
  }, [markerSfx, countdownSfx, markerVolume, countdownVolume, stopAudio]);

  const handlePresenceChange = useCallback((isInside) => {
    setIsActive((prev) => {
      if (prev === isInside) return prev;
      countdownValueRef.current = startValue;
      setCountdown(startValue);
      if (isInside) {
        playAudio(markerAudioRef);
        playAudio(countdownAudioRef);
      } else {
        stopAudio(countdownAudioRef);
      }
      return isInside;
    });
  }, [playAudio, stopAudio, startValue]);

  useEffect(() => {
    if (isActive) {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
      }
      const intervalId = window.setInterval(() => {
        countdownValueRef.current = Math.max(0, countdownValueRef.current - 1);
        setCountdown((prev) => {
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
  }, [isActive]);

  useEffect(() => {
    if (countdown <= 0) {
      stopAudio(countdownAudioRef);
    }
  }, [countdown, stopAudio]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  return {
    isActive,
    countdown,
    handlePresenceChange,
  };
}

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
    <group ref={ref} position={[40, 0.3, -100]}>
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

function StreetRoad() {
  const { scene } = useGLTF('/models/street_road.glb');
  const roadScene = useMemo(() => {
    const cloned = scene.clone(true);
    const tempBox = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    tempBox.getCenter(center);
    const minY = tempBox.min.y;
    cloned.position.set(-center.x, -minY, -center.z);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  return (
    <group position={STREET_ROAD_POSITION} rotation={STREET_ROAD_ROTATION} scale={STREET_ROAD_SCALE}>
      <primitive object={roadScene} />
    </group>
  );
}

function ParkingToll() {
  const { scene } = useGLTF('/models/parking_toll.glb');
  const tollScene = useMemo(() => {
    const cloned = scene.clone(true);
    const tempBox = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    tempBox.getCenter(center);
    const minY = tempBox.min.y;
    cloned.position.set(-center.x, -minY, -center.z);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  return (
    <group position={PARKING_TOLL_POSITION} rotation={PARKING_TOLL_ROTATION} scale={PARKING_TOLL_SCALE}>
      <primitive object={tollScene} />
    </group>
  );
}

function RoadBarrier({ open = false }) {
  const { scene } = useGLTF('/models/road_barrier.glb');
  const barrierScene = useMemo(() => {
    const cloned = scene.clone(true);
    const tempBox = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    tempBox.getCenter(center);
    const minY = tempBox.min.y;
    cloned.position.set(-center.x, -minY, -center.z);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  const pivotRef = useRef(null);
  const progressRef = useRef(open ? 1 : 0);
  const targetRef = useRef(0);

  useEffect(() => {
    targetRef.current = open ? 1 : 0;
  }, [open]);

  useFrame((_, dt) => {
    const pivot = pivotRef.current;
    if (!pivot) return;
    const lerpSpeed = open ? 6 : 4;
    progressRef.current = THREE.MathUtils.damp(progressRef.current, targetRef.current, lerpSpeed, dt);
    const eased = easeOutCubic(progressRef.current);
    const angle = eased * BARRIER_OPEN_ANGLE;
    pivot.rotation.set(0, 0, angle);
  });

  return (
    <group position={ROAD_BARRIER_POSITION} rotation={ROAD_BARRIER_ROTATION} scale={ROAD_BARRIER_SCALE}>
      <group ref={pivotRef}>
        <primitive object={barrierScene} />
      </group>
    </group>
  );
}

function GameMarker({
  label,
  position = STACK_MARKER_POSITION,
  size = STACK_MARKER_SIZE,
  carRef,
  onPresenceChange,
  active = false,
  colors = STACK_MARKER_COLORS,
}) {
  const planeSize = useMemo(() => [size, size], [size]);
  const textFontSize = useMemo(() => size * 0.18, [size]);
  const outerFrameMaterialRef = useRef(null);
  const stripeTextureRef = useRef(null);
  const outerFrameGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const half = size * 0.55;
    shape.moveTo(-half, -half);
    shape.lineTo(half, -half);
    shape.lineTo(half, half);
    shape.lineTo(-half, half);
    shape.lineTo(-half, -half);
    const hole = new THREE.Path();
    const inner = size * 0.4;
    hole.moveTo(-inner, -inner);
    hole.lineTo(-inner, inner);
    hole.lineTo(inner, inner);
    hole.lineTo(inner, -inner);
    hole.lineTo(-inner, -inner);
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, 1);
  }, [size]);
  const upperOutlineGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(size * 0.88, size * 0.88)), [size]);
  const lowerOutlineGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(size * 0.7, size * 0.7)), [size]);
  const baseOutlineGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(size, size)), [size]);
  const lastInsideRef = useRef(false);
  const liftGroupRef = useRef(null);
  const liftValueRef = useRef(0.14);
  const baseLift = 0.14;
  const raisedLift = baseLift + 0.12;
  const scrollSpeed = 0.45;
  const {
    plane = {
      color: '#ffffff',
      emissive: '#ffffff',
      intensity: { active: 1, inactive: 1 },
    },
    frame = {
      color: '#ffffff',
      emissive: '#ffffff',
      intensity: { active: 1, inactive: 1 },
    },
    baseLine = { active: '#ffffff', inactive: '#999999' },
    upperLine = { active: '#ffffff', inactive: '#cccccc' },
    lowerLine = { active: '#ffffff', inactive: '#bbbbbb' },
    text = { color: '#ffffff', outline: '#000000' },
    stripe = { base: 'rgba(255,255,255,0.12)', highlight: 'rgba(255,255,255,0.5)' },
  } = colors || {};
  const stripeBaseColor = stripe.base;
  const stripeHighlightColor = stripe.highlight;

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    if (stripeTextureRef.current) {
      stripeTextureRef.current.dispose();
      stripeTextureRef.current = null;
    }
    const canvas = document.createElement('canvas');
    const px = 128;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, px, px);
      ctx.fillStyle = stripeBaseColor;
      ctx.fillRect(0, 0, px, px);
      ctx.save();
      ctx.translate(px / 2, px / 2);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = stripeHighlightColor;
      const band = px * 0.34;
      ctx.fillRect(-px, -band / 2, px * 2, band);
      ctx.translate(0, px * 0.75);
      ctx.fillRect(-px, -band / 2, px * 2, band);
      ctx.restore();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.center.set(0.5, 0.5);
    texture.rotation = Math.PI / 4;
    texture.anisotropy = 4;
    stripeTextureRef.current = texture;
    const material = outerFrameMaterialRef.current;
    if (material) {
      material.map = texture;
      material.needsUpdate = true;
    }
    return () => {
      texture.dispose();
      stripeTextureRef.current = null;
      if (material && material.map === texture) {
        material.map = null;
      }
    };
  }, [stripeBaseColor, stripeHighlightColor]);

  useEffect(() => {
    if (liftGroupRef.current) {
      liftGroupRef.current.position.y = liftValueRef.current;
    }
  }, []);

  useFrame((_, dt) => {
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

    const targetLift = active ? raisedLift : baseLift;
    const lerpFactor = Math.min(1, dt * 6.5);
    liftValueRef.current = THREE.MathUtils.lerp(liftValueRef.current, targetLift, lerpFactor);
    if (liftGroupRef.current) {
      liftGroupRef.current.position.y = liftValueRef.current;
    }

    if (stripeTextureRef.current) {
      stripeTextureRef.current.offset.x = (stripeTextureRef.current.offset.x + dt * scrollSpeed) % 1;
      stripeTextureRef.current.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
        <planeGeometry args={planeSize} />
        <meshStandardMaterial
          color={plane.color}
          emissive={plane.emissive}
          emissiveIntensity={active ? plane.intensity.active : plane.intensity.inactive}
          roughness={0.35}
          metalness={0.1}
          opacity={0.25}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={liftGroupRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={outerFrameGeometry}>
          <meshStandardMaterial
            ref={outerFrameMaterialRef}
            color={frame.color}
            emissive={frame.emissive}
            emissiveIntensity={active ? frame.intensity.active : frame.intensity.inactive}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
        <lineSegments rotation={[-Math.PI / 2, 0, 0]} geometry={baseOutlineGeometry} position={[0, -0.11, 0]}>
          <lineBasicMaterial color={active ? baseLine.active : baseLine.inactive} linewidth={1} />
        </lineSegments>
        <lineSegments rotation={[-Math.PI / 2, 0, 0]} geometry={upperOutlineGeometry} position={[0, 0.08, 0]}>
          <lineBasicMaterial color={active ? upperLine.active : upperLine.inactive} linewidth={1} />
        </lineSegments>
        <lineSegments rotation={[-Math.PI / 2, 0, 0]} geometry={lowerOutlineGeometry} position={[0, -0.04, 0]}>
          <lineBasicMaterial color={active ? lowerLine.active : lowerLine.inactive} linewidth={1} />
        </lineSegments>
        <Text
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.1, 0]}
          fontSize={textFontSize}
          color={text.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.08}
          outlineColor={text.outline}
          letterSpacing={0.12}
        >
          {label}
        </Text>
      </group>
    </group>
  );
}

function FloatingCountdown({ carRef, countdown, active }) {
  const groupRef = useRef(null);
  const offset = useMemo(() => new THREE.Vector3(0, 4.5, 0), []);
  const lerpTarget = useRef(new THREE.Vector3());
  const smoothPos = useRef(new THREE.Vector3());
  const initializedRef = useRef(false);
  const scaleValueRef = useRef(0);
  const rotationOffsetRef = useRef(0);
  const lookTargetRef = useRef(new THREE.Vector3());
  const displayValue = Math.max(1, Math.min(3, Math.ceil(Math.max(0, countdown))));
  const { scene } = useGLTF(COUNTDOWN_MODELS[displayValue]);
  const countdownScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    initializedRef.current = false;
    scaleValueRef.current = 0;
    rotationOffsetRef.current = 0;
    if (groupRef.current) {
      groupRef.current.scale.setScalar(0);
    }
  }, [active]);

  useFrame(({ camera }, dt) => {
    const car = carRef?.current;
    if (!car || !groupRef.current) return;
    lerpTarget.current.copy(car.position).add(offset);
    if (!initializedRef.current) {
      smoothPos.current.copy(lerpTarget.current);
      initializedRef.current = true;
    } else {
      smoothPos.current.lerp(lerpTarget.current, Math.min(1, dt * 8));
    }
    groupRef.current.position.copy(smoothPos.current);
    const shouldShow = active && countdown > 0;
    const targetScale = shouldShow ? COUNTDOWN_MODEL_SCALE : 0;
    scaleValueRef.current = THREE.MathUtils.lerp(scaleValueRef.current, targetScale, Math.min(1, dt * 9));
    groupRef.current.scale.setScalar(scaleValueRef.current);
    rotationOffsetRef.current = (rotationOffsetRef.current + dt * 0.9) % (Math.PI * 2);
    if (camera) {
      const group = groupRef.current;
      const target = lookTargetRef.current;
      target.copy(camera.position);
      target.y = group.position.y;
      group.lookAt(target);
      group.rotateY(rotationOffsetRef.current);
    }
    groupRef.current.visible = scaleValueRef.current > COUNTDOWN_MODEL_SCALE * 0.08;
  });

  return (
    <group ref={groupRef}>
      <primitive object={countdownScene} />
    </group>
  );
}

export default function ParkingScene() {
  useEffect(() => {
    useGLTF.preload('/car-show/models/car/scene.gltf');
    useGLTF.preload('/models/modern_parking_area.glb');
    useGLTF.preload('/models/street_road.glb');
    useGLTF.preload('/models/parking_toll.glb');
    useGLTF.preload('/models/road_barrier.glb');
    Object.values(COUNTDOWN_MODELS).forEach((path) => useGLTF.preload(path));
  }, []);
  const [speed, setSpeed] = useState(0);
  const carRef = useRef(null);

  const {
    isActive: carOnStackMarker,
    countdown: stackCountdown,
    handlePresenceChange: handleStackMarkerPresence,
  } = useMarkerController({
    startValue: STACK_COUNTDOWN_START,
    markerSfx: MARKER_SFX_URL,
    countdownSfx: COUNTDOWN_SFX_URL,
    markerVolume: 0.7,
    countdownVolume: 0.8,
  });

  const {
    isActive: carOnQueueMarker,
    countdown: queueCountdown,
    handlePresenceChange: handleQueueMarkerPresence,
  } = useMarkerController({
    startValue: STACK_COUNTDOWN_START,
    markerSfx: MARKER_SFX_URL,
    countdownSfx: COUNTDOWN_SFX_URL,
    markerVolume: 0.7,
    countdownVolume: 0.8,
  });

  const {
    isActive: carOnInteractMarker,
    countdown: interactCountdown,
    handlePresenceChange: rawHandleInteractPresence,
  } = useMarkerController({
    startValue: STACK_COUNTDOWN_START,
    markerSfx: MARKER_SFX_URL,
    countdownSfx: COUNTDOWN_SFX_URL,
    markerVolume: 0.7,
    countdownVolume: 0.8,
  });
  const [interactPhase, setInteractPhase] = useState('idle');
  const [licenseDropped, setLicenseDropped] = useState(false);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [licenseImageUrl, setLicenseImageUrl] = useState(DEFAULT_LICENSE_IMAGE);
  const currentLicenseImageSrc = licenseImageUrl || DEFAULT_LICENSE_IMAGE;
  const [barrierShouldOpen, setBarrierShouldOpen] = useState(false);

  const handleInteractMarkerPresence = useCallback((isInside) => {
    rawHandleInteractPresence(isInside);
    if (!isInside) {
      setInteractPhase('idle');
      setLicenseDropped(false);
      setIsDragOverDropzone(false);
    }
  }, [rawHandleInteractPresence]);

  useEffect(() => {
    if (carOnInteractMarker && interactCountdown <= 0 && interactPhase === 'idle') {
      const schedule = typeof queueMicrotask === 'function' ? queueMicrotask : (fn) => Promise.resolve().then(fn);
      schedule(() => setInteractPhase('prompt'));
    }
  }, [carOnInteractMarker, interactCountdown, interactPhase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let active = true;

    const supabaseClient = SUPABASE_URL && SUPABASE_ANON_KEY ? getSupabaseClient() : null;

    const resolveLicenseUrl = async (objectPath) => {
      if (!objectPath) return null;
      if (objectPath.startsWith('http')) return objectPath;
      if (!supabaseClient) return null;
      try {
        const { data: signedData, error: signedError } = await supabaseClient.storage.from('license-photos').createSignedUrl(objectPath, 60 * 60);
        if (!signedError && signedData?.signedUrl) {
          return signedData.signedUrl;
        }
        const { data: publicData } = supabaseClient.storage.from('license-photos').getPublicUrl(objectPath);
        return publicData?.publicUrl || null;
      } catch (err) {
        console.warn('[InteractMarker] Failed to resolve license URL', err);
        return null;
      }
    };

    const loadFromLocalStorage = async () => {
      try {
        const stored = window.localStorage.getItem(LICENSE_STORAGE_KEY);
        if (stored) {
          const url = await resolveLicenseUrl(stored);
          if (url && active) {
            setLicenseImageUrl(url);
            return true;
          }
        }
      } catch {}
      return false;
    };

    const loadFromSupabase = async () => {
      if (!supabaseClient) {
        return;
      }
      try {
        const { data, error } = await supabaseClient.storage.from('license-photos').list('license_cards', {
          limit: 20,
          sortBy: { column: 'created_at', order: 'desc' },
        });
        if (error) {
          throw error;
        }
        const candidate = data?.find((file) => file.name && !file.name.startsWith('.'));
        if (!candidate) return;
        const objectPath = `license_cards/${candidate.name}`;
        const resolvedUrl = await resolveLicenseUrl(objectPath);
        if (resolvedUrl && active) {
          setLicenseImageUrl(resolvedUrl);
          try {
            window.localStorage.setItem(LICENSE_STORAGE_KEY, objectPath);
          } catch {}
        }
      } catch (err) {
        console.warn('[InteractMarker] Failed to load license image from Supabase', err);
      }
    };

    const run = async () => {
      const hasLocal = await loadFromLocalStorage();
      if (!hasLocal) {
        await loadFromSupabase();
      }
    };

    run();

    const handleLicenseUpdated = (event) => {
      const detail = event && typeof event === 'object' && 'detail' in event ? event.detail : null;
      const objectPath = typeof detail === 'string' && detail.trim().length > 0 ? detail : null;
      if (!objectPath) {
        setLicenseImageUrl(DEFAULT_LICENSE_IMAGE);
        try {
          window.localStorage.removeItem(LICENSE_STORAGE_KEY);
        } catch {}
        return;
      }
      resolveLicenseUrl(objectPath).then((url) => {
        if (!url || !active) return;
        setLicenseImageUrl(url);
        try {
          window.localStorage.setItem(LICENSE_STORAGE_KEY, objectPath);
        } catch {}
      }).catch(() => {});
    };
    window.addEventListener(LICENSE_EVENT, handleLicenseUpdated);

    return () => {
      active = false;
      try {
        window.removeEventListener(LICENSE_EVENT, handleLicenseUpdated);
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!licenseImageUrl || licenseImageUrl === DEFAULT_LICENSE_IMAGE) {
      return undefined;
    }
    let cancelled = false;
    const validateImage = async () => {
      try {
        const res = await fetch(licenseImageUrl, { method: 'HEAD', cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('[InteractMarker] License image unreachable, falling back', err);
        setLicenseImageUrl(DEFAULT_LICENSE_IMAGE);
        try {
          window.localStorage.removeItem(LICENSE_STORAGE_KEY);
        } catch {}
      }
    };
    validateImage();
    return () => {
      cancelled = true;
    };
  }, [licenseImageUrl]);

  useEffect(() => {
    if (interactPhase === 'checking') {
      const timer = window.setTimeout(() => {
        setInteractPhase('approved');
      }, 1800);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [interactPhase]);

  useEffect(() => {
    if (interactPhase === 'approved' || interactPhase === 'complete') {
      setBarrierShouldOpen(true);
      return;
    }
    if (interactPhase === 'idle') {
      setBarrierShouldOpen(false);
    }
  }, [interactPhase]);

  const handleInteractPromptNext = useCallback(() => {
    setLicenseDropped(false);
    setIsDragOverDropzone(false);
    setInteractPhase('handover');
  }, []);

  const handleLicenseDragStart = useCallback((event) => {
    try {
      event.dataTransfer.setData('text/plain', 'drivers-license');
    } catch {}
  }, []);

  const handleDropZoneDragOver = useCallback((event) => {
    if (interactPhase !== 'handover') return;
    event.preventDefault();
    setIsDragOverDropzone(true);
  }, [interactPhase]);

  const handleDropZoneDragLeave = useCallback((event) => {
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDragOverDropzone(false);
  }, []);

  const handleLicenseDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragOverDropzone(false);
    if (interactPhase !== 'handover') return;
    setLicenseDropped(true);
    setInteractPhase('checking');
  }, [interactPhase]);

  const handleInteractApprovedAcknowledge = useCallback(() => {
    setInteractPhase('complete');
  }, []);

  const handleLicenseDragEnd = useCallback(() => {
    setIsDragOverDropzone(false);
  }, []);

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
          <StreetRoad />
          <ParkingToll />
          <RoadBarrier open={barrierShouldOpen} />
          <GameMarker
            label="STACK"
            position={STACK_MARKER_POSITION}
            size={STACK_MARKER_SIZE}
            carRef={carRef}
            onPresenceChange={handleStackMarkerPresence}
            active={carOnStackMarker}
            colors={STACK_MARKER_COLORS}
          />
          <GameMarker
            label="QUEUE"
            position={QUEUE_MARKER_POSITION}
            size={QUEUE_MARKER_SIZE}
            carRef={carRef}
            onPresenceChange={handleQueueMarkerPresence}
            active={carOnQueueMarker}
            colors={QUEUE_MARKER_COLORS}
          />
          <GameMarker
            label="INTERACT"
            position={INTERACT_MARKER_POSITION}
            size={INTERACT_MARKER_SIZE}
            carRef={carRef}
            onPresenceChange={handleInteractMarkerPresence}
            active={carOnInteractMarker}
            colors={INTERACT_MARKER_COLORS}
          />
          <FloatingCountdown carRef={carRef} countdown={stackCountdown} active={carOnStackMarker} />
          <FloatingCountdown carRef={carRef} countdown={queueCountdown} active={carOnQueueMarker} />
          <FloatingCountdown carRef={carRef} countdown={interactCountdown} active={carOnInteractMarker} />
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
      {interactPhase === 'prompt' && interactCountdown <= 0 && carOnInteractMarker && (
        <div className="pointer-events-auto absolute left-1/2 bottom-12 z-20 w-[min(90vw,24rem)] -translate-x-1/2 rounded-3xl bg-slate-900/85 px-5 py-4 text-white shadow-xl ring-1 ring-white/20 backdrop-blur">
          <div className="text-xs uppercase tracking-[0.18em] text-sky-300">Security Guard</div>
          <div className="mt-2 text-sm leading-relaxed text-sky-50">
            Good afternoon! Before you head in, may I see your driver&apos;s license, please?
          </div>
          <button
            type="button"
            onClick={handleInteractPromptNext}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            Next
          </button>
        </div>
      )}
      {interactPhase === 'handover' && (
        <div className="pointer-events-auto absolute left-1/2 bottom-10 z-20 w-[min(92vw,32rem)] -translate-x-1/2 rounded-3xl shadow-2xl ring-1 ring-white/20">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900/95">
            <div
              className="pointer-events-none absolute inset-0 opacity-45"
              style={{ backgroundImage: "url('/desk_topview.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div className="relative z-10 px-6 py-5 text-sky-50">
              <div className="text-xs uppercase tracking-[0.18em] text-sky-200">Security Desk</div>
              <div className="mt-2 text-sm leading-relaxed text-sky-100">Drag your license onto the tray so I can take a look.</div>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                {!licenseDropped && (
                  <Image
                    src={currentLicenseImageSrc}
                    alt="Driver&apos;s license"
                    width={320}
                    height={200}
                    draggable
                    onDragStart={handleLicenseDragStart}
                    onDragEnd={handleLicenseDragEnd}
                    className="h-24 w-auto cursor-grab rounded-xl border border-white/30 bg-white/80 p-2 text-slate-900 shadow-md transition hover:scale-[1.02] active:cursor-grabbing"
                    sizes="(max-width: 640px) 160px, 200px"
                  />
                )}
                <div
                  onDragOver={handleDropZoneDragOver}
                  onDrop={handleLicenseDrop}
                  onDragLeave={handleDropZoneDragLeave}
                  className={`flex h-28 flex-1 items-center justify-center rounded-2xl border-2 border-dashed transition ${licenseDropped ? 'border-emerald-300 bg-emerald-500/15 text-emerald-100' : isDragOverDropzone ? 'border-sky-300 bg-sky-500/10 text-sky-100' : 'border-white/30 bg-slate-900/50 text-white/70'}`}
                >
                  {licenseDropped ? (
                    <Image
                      src={currentLicenseImageSrc}
                      alt="Submitted license"
                      width={300}
                      height={190}
                      draggable={false}
                      className="h-20 w-auto rounded-md shadow-md"
                      sizes="180px"
                    />
                  ) : (
                    <span className="text-sm">Drop license here</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {interactPhase === 'checking' && (
        <div className="pointer-events-none absolute left-1/2 bottom-12 z-20 w-[min(90vw,24rem)] -translate-x-1/2 rounded-3xl bg-slate-900/85 px-5 py-4 text-white shadow-xl ring-1 ring-white/20 backdrop-blur">
          <div className="text-xs uppercase tracking-[0.18em] text-sky-300">Security Guard</div>
          <div className="mt-2 text-sm leading-relaxed text-sky-50">
            Alright, let me take a quick look at this.
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-sky-200/80">
            <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-sky-300" />
            Checking license…
          </div>
        </div>
      )}
      {interactPhase === 'approved' && (
        <div className="pointer-events-auto absolute left-1/2 bottom-12 z-20 w-[min(90vw,24rem)] -translate-x-1/2 rounded-3xl bg-slate-900/90 px-5 py-4 text-white shadow-xl ring-1 ring-emerald-300/40 backdrop-blur">
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-300">Security Guard</div>
          <div className="mt-2 text-sm leading-relaxed text-emerald-50">
            Looks good. You&apos;re all set—enjoy your time inside!
          </div>
          <button
            type="button"
            onClick={handleInteractApprovedAcknowledge}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            Thanks!
          </button>
        </div>
      )}
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
