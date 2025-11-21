'use client';

import type { MutableRefObject } from 'react';
import { useCallback } from '@/hooks/useCallback';
import { useEffect } from '@/hooks/useEffect';
import { useRef } from '@/hooks/useRef';
import { useState } from '@/hooks/useState';

export interface MarkerControllerOptions {
  startValue?: number;
  markerSfx?: string;
  countdownSfx?: string;
  markerVolume?: number;
  countdownVolume?: number;
}

export interface MarkerController {
  isActive: boolean;
  countdown: number;
  handlePresenceChange: (isInside: boolean) => void;
}

function playMediaElement(media: HTMLAudioElement | null) {
  if (!media) return;
  try {
    media.currentTime = 0;
  } catch {}
  try {
    void media.play();
  } catch {}
}

function stopMediaElement(media: HTMLAudioElement | null) {
  if (!media) return;
  try {
    media.pause();
  } catch {}
  try {
    media.currentTime = 0;
  } catch {}
}

export function useMarkerController({
  startValue = 3,
  markerSfx,
  countdownSfx,
  markerVolume = 0.7,
  countdownVolume = 0.8,
}: MarkerControllerOptions): MarkerController {
  const markerAudioRef = useRef<HTMLAudioElement | null>(null);
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const countdownValueRef = useRef<number>(startValue);
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(startValue);

  const stopAudioRef = useCallback((audioRef: MutableRefObject<HTMLAudioElement | null>) => {
    stopMediaElement(audioRef.current);
  }, []);

  const playAudioRef = useCallback((audioRef: MutableRefObject<HTMLAudioElement | null>) => {
    playMediaElement(audioRef.current);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const markerAudio = markerSfx ? new Audio(markerSfx) : null;
    if (markerAudio) {
      markerAudio.preload = 'auto';
      markerAudio.crossOrigin = 'anonymous';
      markerAudio.volume = markerVolume;
      markerAudioRef.current = markerAudio;
    }

    const countdownAudio = countdownSfx ? new Audio(countdownSfx) : null;
    if (countdownAudio) {
      countdownAudio.preload = 'auto';
      countdownAudio.crossOrigin = 'anonymous';
      countdownAudio.volume = countdownVolume;
      countdownAudioRef.current = countdownAudio;
    }

    return () => {
      stopMediaElement(markerAudioRef.current);
      stopMediaElement(countdownAudioRef.current);
      markerAudioRef.current = null;
      countdownAudioRef.current = null;
    };
  }, [markerSfx, countdownSfx, markerVolume, countdownVolume]);

  useEffect(() => {
    if (markerAudioRef.current) {
      markerAudioRef.current.volume = markerVolume;
    }
    if (countdownAudioRef.current) {
      countdownAudioRef.current.volume = countdownVolume;
    }
  }, [markerVolume, countdownVolume]);

  const handlePresenceChange = useCallback(
    (isInside: boolean) => {
      setIsActive((prev) => {
        if (prev === isInside) {
          return prev;
        }
        countdownValueRef.current = startValue;
        setCountdown(startValue);
        if (isInside) {
          playAudioRef(markerAudioRef);
          playAudioRef(countdownAudioRef);
        } else {
          stopAudioRef(countdownAudioRef);
        }
        return isInside;
      });
    },
    [playAudioRef, stopAudioRef, startValue],
  );

  useEffect(() => {
    if (!isActive) {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return undefined;
    }

    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
    }
    const intervalId = window.setInterval(() => {
      countdownValueRef.current = Math.max(0, countdownValueRef.current - 1);
      setCountdown((prev) => (prev <= 0 ? 0 : Math.max(0, prev - 1)));
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
  }, [isActive]);

  useEffect(() => {
    if (countdown <= 0) {
      stopAudioRef(countdownAudioRef);
    }
  }, [countdown, stopAudioRef]);

  useEffect(() => () => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  return {
    isActive,
    countdown,
    handlePresenceChange,
  };
}
