'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties, DragEvent, PointerEvent, Dispatch, SetStateAction } from 'react';

type LicenseHandoverOptions = {
  interactPhase: string;
  setInteractPhase: Dispatch<SetStateAction<string>>;
};

type LicenseHandoverResult = {
  licenseDropped: boolean;
  isDragOverDropzone: boolean;
  dropZoneRef: React.MutableRefObject<HTMLDivElement | null>;
  licenseTouchStyle: CSSProperties;
  handleInteractPromptNext: () => void;
  handleLicenseDragStart: (event: DragEvent<HTMLElement>) => void;
  handleDropZoneDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleDropZoneDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  handleLicenseDrop: (event: DragEvent<HTMLDivElement>) => void;
  handleInteractApprovedAcknowledge: () => void;
  handleLicenseDragEnd: () => void;
  handleLicensePointerDown: (event: PointerEvent<HTMLElement>) => void;
  handleLicensePointerMove: (event: PointerEvent<HTMLElement>) => void;
  handleLicensePointerUp: (event: PointerEvent<HTMLElement>) => void;
  handleLicensePointerCancel: (event: PointerEvent<HTMLElement>) => void;
  resetHandoverState: () => void;
};

const pointerStart = { x: 0, y: 0 };

export function useParkingLicenseHandover(options: LicenseHandoverOptions): LicenseHandoverResult {
  const { interactPhase, setInteractPhase } = options;
  const [licenseDropped, setLicenseDropped] = useState(false);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [touchDragState, setTouchDragState] = useState<{ deltaX: number; deltaY: number } | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const touchPointerIdRef = useRef<number | null>(null);
  const touchStartRef = useRef({ ...pointerStart });

  const resetHandoverState = useCallback(() => {
    setLicenseDropped(false);
    setIsDragOverDropzone(false);
    setTouchDragState(null);
    touchPointerIdRef.current = null;
    touchStartRef.current = { ...pointerStart };
  }, []);

  const handleInteractPromptNext = useCallback(() => {
    resetHandoverState();
    setInteractPhase('handover');
  }, [resetHandoverState, setInteractPhase]);

  const handleLicenseDragStart = useCallback((event: DragEvent<HTMLElement>) => {
    try {
      event.dataTransfer?.setData('text/plain', 'drivers-license');
    } catch {}
  }, []);

  const handleDropZoneDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (interactPhase !== 'handover') {
      return;
    }
    event.preventDefault();
    setIsDragOverDropzone(true);
  }, [interactPhase]);

  const handleDropZoneDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsDragOverDropzone(false);
  }, []);

  const completeLicenseDrop = useCallback(() => {
    setIsDragOverDropzone(false);
    if (interactPhase !== 'handover') {
      return;
    }
    setLicenseDropped(true);
    setInteractPhase('checking');
  }, [interactPhase, setInteractPhase]);

  const handleLicenseDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    completeLicenseDrop();
  }, [completeLicenseDrop]);

  const handleInteractApprovedAcknowledge = useCallback(() => {
    setInteractPhase('complete');
  }, [setInteractPhase]);

  const handleLicenseDragEnd = useCallback(() => {
    setIsDragOverDropzone(false);
  }, []);

  const handleLicensePointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') {
      return;
    }
    if (interactPhase !== 'handover' || licenseDropped) {
      return;
    }
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    touchPointerIdRef.current = event.pointerId;
    touchStartRef.current = { x: event.clientX, y: event.clientY };
    setIsDragOverDropzone(false);
    setTouchDragState({ deltaX: 0, deltaY: 0 });
  }, [interactPhase, licenseDropped]);

  const handleLicensePointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') {
      return;
    }
    if (touchPointerIdRef.current !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const deltaX = event.clientX - touchStartRef.current.x;
    const deltaY = event.clientY - touchStartRef.current.y;
    setTouchDragState({ deltaX, deltaY });
    const dropRect = dropZoneRef.current?.getBoundingClientRect();
    if (!dropRect) {
      return;
    }
    const inside = event.clientX >= dropRect.left
      && event.clientX <= dropRect.right
      && event.clientY >= dropRect.top
      && event.clientY <= dropRect.bottom;
    setIsDragOverDropzone(inside);
  }, []);

  const handleLicensePointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') {
      return;
    }
    if (touchPointerIdRef.current !== event.pointerId) {
      return;
    }
    event.preventDefault();
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
    let dropped = false;
    const dropRect = dropZoneRef.current?.getBoundingClientRect();
    if (dropRect) {
      const inside = event.clientX >= dropRect.left
        && event.clientX <= dropRect.right
        && event.clientY >= dropRect.top
        && event.clientY <= dropRect.bottom;
      if (inside) {
        completeLicenseDrop();
        dropped = true;
      }
    }
    if (!dropped) {
      setIsDragOverDropzone(false);
    }
    touchPointerIdRef.current = null;
    touchStartRef.current = { ...pointerStart };
    setTouchDragState(null);
  }, [completeLicenseDrop]);

  const handleLicensePointerCancel = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') {
      return;
    }
    if (touchPointerIdRef.current !== event.pointerId) {
      return;
    }
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
    setIsDragOverDropzone(false);
    touchPointerIdRef.current = null;
    touchStartRef.current = { ...pointerStart };
    setTouchDragState(null);
  }, []);

  const licenseTouchStyle = useMemo<CSSProperties>(() => {
    if (!touchDragState) {
      return { touchAction: 'none' };
    }
    return {
      touchAction: 'none',
      transform: `translate3d(${touchDragState.deltaX}px, ${touchDragState.deltaY}px, 0)`,
    };
  }, [touchDragState]);

  return {
    licenseDropped,
    isDragOverDropzone,
    dropZoneRef,
    licenseTouchStyle,
    handleInteractPromptNext,
    handleLicenseDragStart,
    handleDropZoneDragOver,
    handleDropZoneDragLeave,
    handleLicenseDrop,
    handleInteractApprovedAcknowledge,
    handleLicenseDragEnd,
    handleLicensePointerDown,
    handleLicensePointerMove,
    handleLicensePointerUp,
    handleLicensePointerCancel,
    resetHandoverState,
  };
}
