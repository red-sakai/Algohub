'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import * as THREE from 'three';
import { subscribeToParkingRadioWheel } from '@/lib/parking/radioWheelBus';

type ParkingSpeedTelemetryOptions = {
  activeMinigame: string | null;
  maxForwardSpeed: number;
  blurThreshold: number;
  blurMaxPixels: number;
  blurMaxOpacity: number;
  speedDisplayMultiplier: number;
  slowMoScale?: number;
};

type GaugeNeedle = {
  x: number;
  y: number;
};

type ParkingSpeedTelemetryResult = {
  speed: number;
  setSpeed: Dispatch<SetStateAction<number>>;
  cameraBlurStyle: CSSProperties;
  canvasStyle: CSSProperties;
  displaySpeed: number;
  desktopSpeedProgress: number;
  desktopGaugeNeedle: GaugeNeedle;
  shouldShowSpeedDisplay: boolean;
  carTimeScale: number;
};

const RADIO_FILTER = 'grayscale(0.92) saturate(0.25) brightness(0.92)';
const CANVAS_TRANSITION = 'filter 220ms ease';
const DEFAULT_SLOW_MO_SCALE = 0.35;

export function useParkingSpeedTelemetry(options: ParkingSpeedTelemetryOptions): ParkingSpeedTelemetryResult {
  const {
    activeMinigame,
    maxForwardSpeed,
    blurThreshold,
    blurMaxPixels,
    blurMaxOpacity,
    speedDisplayMultiplier,
    slowMoScale = DEFAULT_SLOW_MO_SCALE,
  } = options;

  const [speed, setSpeed] = useState(0);
  const [radioWheelEngaged, setRadioWheelEngaged] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToParkingRadioWheel(({ slowMo }) => {
      setRadioWheelEngaged(Boolean(slowMo));
    });
    return unsubscribe;
  }, []);

  const cameraBlurStrength = useMemo(() => {
    const absSpeed = Math.abs(speed);
    if (absSpeed <= blurThreshold) {
      return 0;
    }
    const span = Math.max(0.001, maxForwardSpeed - blurThreshold);
    return THREE.MathUtils.clamp((absSpeed - blurThreshold) / span, 0, 1);
  }, [speed, blurThreshold, maxForwardSpeed]);

  const cameraBlurStyle = useMemo<CSSProperties>(() => {
    if (cameraBlurStrength <= 0) {
      return { opacity: 0, backdropFilter: 'blur(0px)' };
    }
    const blurPx = THREE.MathUtils.lerp(0, blurMaxPixels, cameraBlurStrength);
    return {
      opacity: Math.min(1, cameraBlurStrength * blurMaxOpacity),
      backdropFilter: `blur(${blurPx.toFixed(2)}px)`,
    };
  }, [cameraBlurStrength, blurMaxOpacity, blurMaxPixels]);

  const canvasStyle = useMemo<CSSProperties>(() => ({
    width: '100%',
    height: '100%',
    filter: radioWheelEngaged ? RADIO_FILTER : 'none',
    transition: CANVAS_TRANSITION,
  }), [radioWheelEngaged]);

  const displaySpeed = useMemo(() => Math.max(0, Math.round(Math.abs(speed) * speedDisplayMultiplier)), [
    speed,
    speedDisplayMultiplier,
  ]);

  const desktopSpeedProgress = useMemo(() => {
    if (!Number.isFinite(speed)) {
      return 0;
    }
    return Math.min(1, Math.abs(speed) / Math.max(1, maxForwardSpeed));
  }, [speed, maxForwardSpeed]);

  const desktopGaugeNeedle = useMemo<GaugeNeedle>(() => {
    const radius = 60;
    const centerX = 80;
    const centerY = 80;
    const angle = Math.PI - Math.PI * desktopSpeedProgress;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY - Math.sin(angle) * radius,
    };
  }, [desktopSpeedProgress]);

  const carTimeScale = radioWheelEngaged ? slowMoScale : 1;
  const shouldShowSpeedDisplay = activeMinigame !== 'stack' && activeMinigame !== 'queue';

  return {
    speed,
    setSpeed,
    cameraBlurStyle,
    canvasStyle,
    displaySpeed,
    desktopSpeedProgress,
    desktopGaugeNeedle,
    shouldShowSpeedDisplay,
    carTimeScale,
  };
}
