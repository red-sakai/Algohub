"use client";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";

// Adjust these numbers to perfectly align the video "screen" with your camera.png
const CAMERA_LAYOUT = {
  base: {
    // overall camera image width (in px)
    width: 480, // up from 420 — makes the camera and preview a bit bigger
    // the rectangle on the camera image where the preview should appear
    screen: { top: 105, left: 50, width: 272, height: 178, radius: 14 },
  },
  sm: {
    width: 640, // up from 560 — larger on bigger screens
    screen: { top: 137, left: 50, width: 368, height: 236, radius: 16 },
  },
};

// Slight enlargement factor for the live preview without changing layout values
const PREVIEW_SCALE = 1.06; // ~6% bigger

type Props = {
  active: boolean;
  onClose: () => void;
  onCaptured: (dataUrl: string) => void;
};

export default function CameraCaptureModal({ active, onClose, onCaptured }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [hasStream, setHasStream] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const clickSfxRef = useRef<HTMLAudioElement | null>(null);
  const clickPlayedRef = useRef(false);
  const shutterTimerRef = useRef<number | null>(null);
  const captureTimerRef = useRef<number | null>(null);
  const [flashVisible, setFlashVisible] = useState(false);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);

  // Track breakpoint (sm: 640px)
  const [isSm, setIsSm] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(min-width: 640px)");
    const update = () => setIsSm(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  const layout = isSm ? CAMERA_LAYOUT.sm : CAMERA_LAYOUT.base;

  // Measure stage width to compute scale factor s
  const [containerWidth, setContainerWidth] = useState<number>(layout.width);
  // Ensure we have an accurate width before first paint to avoid misalignment flicker
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (el) {
      const w = el.clientWidth || layout.width;
      if (w > 0) setContainerWidth(w);
    }
  }, [layout.width]);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect?.width ?? el.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    });
    ro.observe(el);
    // Initial sync
    setContainerWidth(el.clientWidth || layout.width);
    return () => ro.disconnect();
  }, [layout.width]);

  const s = containerWidth / layout.width;

  const cleanupStream = useCallback(() => {
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (shutterTimerRef.current) {
      window.clearTimeout(shutterTimerRef.current);
      shutterTimerRef.current = null;
    }
    if (captureTimerRef.current) {
      window.clearTimeout(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    const stream = streamRef.current;
    if (stream) {
      for (const t of stream.getTracks()) t.stop();
    }
    streamRef.current = null;
    setHasStream(false);
    setCountdown(null);
  }, []);

  const capturePhoto = useCallback(() => {
    try {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c) throw new Error("Camera not ready");
      const w = v.videoWidth || Math.max(1, Math.round(layout.screen.width * s));
      const h = v.videoHeight || Math.max(1, Math.round(layout.screen.height * s));
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("No 2D context");
      ctx.drawImage(v, 0, 0, w, h);
      const dataUrl = c.toDataURL("image/jpeg", 0.92);
      setCapturedDataUrl(dataUrl);
      // Keep stream active in case user wants to retake
    } catch {
      setError("Failed to capture image.");
    }
  }, [layout.screen.height, layout.screen.width, s]);

  const requestCamera = useCallback(async () => {
    setError(null);
    try {
      // Preload shutter sound on user gesture to satisfy autoplay policies
      try {
        const sfx = new Audio("/camera_click.mp3");
        sfx.preload = "auto";
        sfx.volume = 1.0;
        clickSfxRef.current = sfx;
        clickPlayedRef.current = false;
      } catch {}

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        try {
          await v.play();
        } catch {}
      }
      setHasStream(true);
      setCountdown(5);
      const id = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return prev;
          if (prev <= 1) {
            window.clearInterval(id);
            countdownTimerRef.current = null;
            // Schedule shutter at ~0.5s before capture
            shutterTimerRef.current = window.setTimeout(() => {
              const a = clickSfxRef.current;
              try {
                if (a && !clickPlayedRef.current) {
                  a.currentTime = 0;
                  a.play().catch(() => {});
                  clickPlayedRef.current = true;
                }
              } catch {}
            }, 500);

            // Schedule flash + capture at timer end
            captureTimerRef.current = window.setTimeout(() => {
              try {
                setFlashVisible(true);
                setFlashOpacity(1);
                setTimeout(() => setFlashOpacity(0), 140);
                setTimeout(() => setFlashVisible(false), 320);
              } catch {}
              setTimeout(() => capturePhoto(), 120);
            }, 1000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      countdownTimerRef.current = id;
    } catch (e) {
      console.error(e);
      setError("Camera permission denied or unavailable.");
    }
  }, [capturePhoto]);

  // Cleanup on unmount or when modal is hidden
  useEffect(() => {
    if (!active) cleanupStream();
    return () => cleanupStream();
  }, [active, cleanupStream]);

  // Shutter sound now plays at capture time; no countdown-driven playback

  // Block browser back navigation while modal is active (robust: double-push and forward on pop)
  const historyEntriesRef = useRef(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!active) return;

    // Push two entries so we can always forward(1) to negate a back
    try {
      window.history.pushState({ __algohub_modal__: 1 }, "");
      window.history.pushState({ __algohub_modal__: 2 }, "");
      historyEntriesRef.current = 2;
    } catch {}

    const onPopState = () => {
      // Immediately move forward again while the modal is active
      try {
        window.history.go(1);
      } catch {}
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      // Consume the temporary entries so history length is restored
      const entries = historyEntriesRef.current;
      if (entries > 0) {
        historyEntriesRef.current = 0;
        try {
          window.history.go(-entries);
        } catch {}
      }
    };
  }, [active]);

  // Unified close handler that always cleans up first
  const handleClose = useCallback(() => {
    cleanupStream();
    // Cleanup shutter sound
    if (clickSfxRef.current) {
      try {
        clickSfxRef.current.pause();
        clickSfxRef.current.src = "";
      } catch {}
      clickSfxRef.current = null;
      clickPlayedRef.current = false;
    }
    if (shutterTimerRef.current) {
      window.clearTimeout(shutterTimerRef.current);
      shutterTimerRef.current = null;
    }
    if (captureTimerRef.current) {
      window.clearTimeout(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    // Reset flash
    setFlashVisible(false);
    setFlashOpacity(0);
    // If we pushed history entries to block back, consume them now
    if (typeof window !== "undefined") {
      const entries = historyEntriesRef.current;
      if (entries > 0) {
        historyEntriesRef.current = 0;
        try {
          window.history.go(-entries);
        } catch {}
      }
    }
    setCapturedDataUrl(null);
    onClose();
  }, [cleanupStream, onClose]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[1200]" aria-modal role="dialog">
      {/* Global flash overlay */}
      {flashVisible && (
        <div
          className="pointer-events-none fixed inset-0 z-[2000]"
          style={{
            background: "white",
            opacity: flashOpacity,
            transition: "opacity 160ms ease-in-out",
            willChange: "opacity",
          }}
        />
      )}
      <div className="absolute inset-0 bg-black/90" onClick={!hasStream ? handleClose : undefined} />
      <div className="absolute inset-0 grid place-items-center p-4">
        {/* Persistent Close button in top-right */}
        <button
          aria-label="Close camera"
          onClick={handleClose}
          className="absolute right-4 top-4 inline-grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/20 hover:bg-white/25"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        {hasStream ? (
          // Full-screen camera mode: only the camera stage
          <div className="relative w-full">
            <div
              ref={stageRef}
              className="relative mx-auto"
              style={{ width: `min(100%, ${layout.width}px)` }}
            >
              <div className="motion-safe:animate-[popIn_500ms_ease-out_forwards] motion-safe:opacity-0">
                <Image
                  src="/camera.png"
                  alt="Camera"
                  width={layout.width}
                  height={Math.round(layout.width * 0.66)}
                  priority
                  className="select-none drop-shadow-[0_10px_24px_rgba(0,0,0,0.5)] w-full h-auto"
                />
              </div>
              {/* Clipped screen wrapper to allow scaling the video without shifting the frame */}
              <div
                className="absolute overflow-hidden"
                style={{
                  top: layout.screen.top * s,
                  left: layout.screen.left * s,
                  width: layout.screen.width * s,
                  height: layout.screen.height * s,
                  borderRadius: layout.screen.radius * s,
                  background: "rgba(0,0,0,0.35)",
                }}
              >
                {capturedDataUrl ? (
                  <Image src={capturedDataUrl} alt="Captured preview" fill unoptimized style={{ objectFit: "cover" }} />
                ) : (
                  <video
                    ref={videoRef}
                    className="h-full w-full"
                    style={{
                      objectFit: "cover",
                      transform: `scale(${PREVIEW_SCALE})`,
                      transformOrigin: "center center",
                    }}
                    playsInline
                    muted
                  />
                )}
              </div>
              {countdown !== null && countdown > 0 && (
                <div
                  className="pointer-events-none absolute grid place-items-center"
                  style={{
                    top: layout.screen.top * s,
                    left: layout.screen.left * s,
                    width: layout.screen.width * s,
                    height: layout.screen.height * s,
                    borderRadius: layout.screen.radius * s,
                  }}
                >
                  <div className="text-6xl font-extrabold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">{countdown}</div>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {/* Action bar */}
            <div className="mx-auto mt-4 flex max-w-[min(100%,_600px)] items-center justify-center gap-3">
              {capturedDataUrl ? (
                <>
                  <button
                    onClick={() => {
                      // Clear captured image and let user try again (keep stream running)
                      setCapturedDataUrl(null);
                      setError(null);
                      setCountdown(null);
                    }}
                    className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/30"
                  >
                    Retake
                  </button>
                  <button
                    onClick={() => {
                      try { localStorage.setItem("algohub_license_photo", capturedDataUrl); } catch {}
                      // End stream now that we're done
                      cleanupStream();
                      onCaptured(capturedDataUrl);
                      onClose();
                    }}
                    className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-extrabold text-white shadow-[0_6px_0_0_rgb(2,132,199)] ring-1 ring-white/20 active:translate-y-[2px] active:shadow-[0_3px_0_0_rgb(2,132,199)]"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    // Start (or restart) a short countdown then capture
                    setCountdown(3);
                    const id = window.setInterval(() => {
                      setCountdown((prev) => {
                        if (prev === null) return prev;
                        if (prev <= 1) {
                          window.clearInterval(id);
                          countdownTimerRef.current = null;
                          // Schedule shutter ~0.5s before capture
                          shutterTimerRef.current = window.setTimeout(() => {
                            const a = clickSfxRef.current;
                            try {
                              if (a && !clickPlayedRef.current) {
                                a.currentTime = 0;
                                a.play().catch(() => {});
                                clickPlayedRef.current = true;
                              }
                            } catch {}
                          }, 500);
                          // Flash + capture
                          captureTimerRef.current = window.setTimeout(() => {
                            try {
                              setFlashVisible(true);
                              setFlashOpacity(1);
                              setTimeout(() => setFlashOpacity(0), 140);
                              setTimeout(() => setFlashVisible(false), 320);
                            } catch {}
                            setTimeout(() => capturePhoto(), 120);
                          }, 1000);
                          return 0;
                        }
                        return prev - 1;
                      });
                    }, 1000);
                    countdownTimerRef.current = id;
                  }}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-extrabold text-white shadow-[0_6px_0_0_rgb(2,132,199)] ring-1 ring-white/20 active:translate-y-[2px] active:shadow-[0_3px_0_0_rgb(2,132,199)]"
                >
                  Take Photo
                </button>
              )}
            </div>
          </div>
        ) : (
          // Pre-permission view (same size as after permission)
          <div className="grid place-items-center gap-4">
            <div
              ref={stageRef}
              className="relative"
              style={{ width: `min(100%, ${layout.width}px)` }}
            >
              <div className="motion-safe:animate-[popIn_500ms_ease-out_forwards] motion-safe:opacity-0">
                <Image
                  src="/camera.png"
                  alt="Camera"
                  width={layout.width}
                  height={Math.round(layout.width * 0.66)}
                  priority
                  className="select-none drop-shadow-[0_10px_24px_rgba(0,0,0,0.5)] w-full h-auto"
                />
              </div>
              <div
                className="absolute overflow-hidden"
                style={{
                  top: layout.screen.top * s,
                  left: layout.screen.left * s,
                  width: layout.screen.width * s,
                  height: layout.screen.height * s,
                  borderRadius: layout.screen.radius * s,
                  background: "rgba(0,0,0,0.35)",
                }}
              >
                <video
                  ref={videoRef}
                  className="h-full w-full"
                  style={{
                    objectFit: "cover",
                    transform: `scale(${PREVIEW_SCALE})`,
                    transformOrigin: "center center",
                    opacity: 0,
                  }}
                  playsInline
                  muted
                />
              </div>
              <div
                className="absolute grid place-items-center text-white/80"
                style={{
                  top: layout.screen.top * s,
                  left: layout.screen.left * s,
                  width: layout.screen.width * s,
                  height: layout.screen.height * s,
                  borderRadius: layout.screen.radius * s,
                  background: "rgba(0,0,0,0.35)",
                }}
              >
                <span className="text-sm">Camera preview will appear here</span>
              </div>
            </div>
            <div className="w-full" style={{ maxWidth: layout.width }}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-white/70">
                  {error ? error : "We’ll request camera permission to take your photo."}
                </div>
                <button
                  onClick={requestCamera}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-[0_6px_0_0_rgb(2,132,199)] ring-1 ring-white/15 transition active:translate-y-[2px] active:shadow-[0_3px_0_0_rgb(2,132,199)]"
                >
                  Enable Camera
                </button>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
      </div>
    </div>
  );
}
