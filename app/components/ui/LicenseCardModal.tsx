"use client";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";

// Adjustable layout for drivers_license.png
// Tune these rects to align elements precisely on your asset.
const LICENSE_LAYOUT = {
  base: {
    width: 680, // target pixel width of the license image at base
    // rectangles in pixels relative to base.width
    photoRect: { top: 120, left: 52, width: 210, height: 260, radius: 12 },
    nameRect: { top: 110, left: 290, width: 320, height: 40 },
    plateRect: { top: 170, left: 290, width: 220, height: 36 },
    issuedRect: { top: 220, left: 290, width: 140, height: 30 },
    expiryRect: { top: 220, left: 450, width: 160, height: 30 },
    signatureRect: { top: 300, left: 290, width: 300, height: 90 },
  },
  sm: {
    width: 820,
    photoRect: { top: 140, left: 60, width: 250, height: 300, radius: 14 },
    nameRect: { top: 128, left: 330, width: 360, height: 44 },
    plateRect: { top: 190, left: 330, width: 250, height: 40 },
    issuedRect: { top: 246, left: 330, width: 160, height: 34 },
    expiryRect: { top: 246, left: 500, width: 180, height: 34 },
    signatureRect: { top: 328, left: 330, width: 340, height: 100 },
  },
};

type Props = {
  active: boolean;
  photoDataUrl: string; // captured from CameraCaptureModal
  onClose: () => void;
  onSave?: (data: {
    name: string;
    plate: string;
    issued: string;
    expiry: string;
    signatureDataUrl: string | null;
  }) => void;
};

export default function LicenseCardModal({ active, photoDataUrl, onClose, onSave }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [isSm, setIsSm] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(LICENSE_LAYOUT.base.width);

  // Responsive breakpoint
  useEffect(() => {
    const m = window.matchMedia("(min-width: 640px)");
    const update = () => setIsSm(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  const layout = isSm ? LICENSE_LAYOUT.sm : LICENSE_LAYOUT.base;

  // width measurement + scale factor
  useLayoutEffect(() => {
    // no-op: initial width will update via ResizeObserver soon after mount
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
    return () => ro.disconnect();
  }, [layout.width]);
  const s = containerWidth / layout.width;

  // Form state
  const [name, setName] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        return localStorage.getItem("algohub_license_name") || "";
      }
    } catch {}
    return "";
  });
  const [plate] = useState<string>(() => {
    const letters = () => Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
    const digits = () => Math.floor(100 + Math.random() * 900).toString();
    return `${letters()}-${digits()}`;
  });
  const [issued] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleDateString();
  });
  const [expiry] = useState<string>(() => {
    const now = new Date();
    const exp = new Date(now);
    exp.setFullYear(now.getFullYear() + 3);
    return exp.toLocaleDateString();
  });

  // Generate random plate and dates on first mount
  useEffect(() => {
    // no side-effects required for plate/dates; they are initialized on mount
  }, [active]);

  // Signature drawing handlers
  const getCanvasPos = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = (e as TouchEvent).touches?.[0]?.clientX ?? (e as MouseEvent).clientX;
    const clientY = (e as TouchEvent).touches?.[0]?.clientY ?? (e as MouseEvent).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const startDrawMouse = (e: React.MouseEvent) => {
    e.preventDefault();
    drawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getCanvasPos(e.nativeEvent as MouseEvent);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const startDrawTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    drawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getCanvasPos(e.nativeEvent as unknown as TouchEvent);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const moveDrawMouse = (e: React.MouseEvent) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getCanvasPos(e.nativeEvent as MouseEvent);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };
  const moveDrawTouch = (e: React.TouchEvent) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getCanvasPos(e.nativeEvent as unknown as TouchEvent);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };
  const endDraw = () => {
    drawingRef.current = false;
  };
  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Fit signature canvas to display size
  const sigRect = layout.signatureRect;
  const sigW = Math.max(1, Math.round(sigRect.width * s));
  const sigH = Math.max(1, Math.round(sigRect.height * s));
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(sigW * dpr);
    canvas.height = Math.floor(sigH * dpr);
    canvas.style.width = `${sigW}px`;
    canvas.style.height = `${sigH}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    // draw a subtle baseline
    if (ctx) {
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(4, sigH - 6);
      ctx.lineTo(sigW - 4, sigH - 6);
      ctx.stroke();
    }
  }, [sigW, sigH]);

  const handleSave = useCallback(() => {
    let signatureDataUrl: string | null = null;
    try {
      signatureDataUrl = canvasRef.current?.toDataURL("image/png") ?? null;
    } catch {}
    try {
      localStorage.setItem("algohub_license_name", name);
      localStorage.setItem("algohub_license_plate", plate);
      localStorage.setItem("algohub_license_issued", issued);
      localStorage.setItem("algohub_license_expiry", expiry);
      if (signatureDataUrl) localStorage.setItem("algohub_license_signature", signatureDataUrl);
    } catch {}
    onSave?.({ name, plate, issued, expiry, signatureDataUrl });
    onClose();
  }, [expiry, issued, name, onClose, onSave, plate]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[1400]" aria-modal role="dialog">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="relative w-full max-w-[900px] rounded-3xl bg-black/40 p-4 ring-1 ring-white/15 backdrop-blur-md">
          {/* Close */}
          <button
            aria-label="Close license"
            onClick={onClose}
            className="absolute right-4 top-4 inline-grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/20 hover:bg-white/25"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>

          {/* Stage */}
          <div ref={stageRef} className="relative mx-auto" style={{ width: `min(100%, ${layout.width}px)` }}>
            <Image
              src="/drivers_license.png"
              alt="Driver's License"
              width={layout.width}
              height={Math.round(layout.width * 0.6)}
              priority
              className="w-full h-auto select-none"
            />

            {/* Photo placement */}
            <div
              className="absolute overflow-hidden bg-black/20"
              style={{
                top: layout.photoRect.top * s,
                left: layout.photoRect.left * s,
                width: layout.photoRect.width * s,
                height: layout.photoRect.height * s,
                borderRadius: layout.photoRect.radius * s,
              }}
            >
              <div className="relative h-full w-full">
                <Image src={photoDataUrl} alt="Captured" fill unoptimized sizes="100vw" style={{ objectFit: "cover" }} />
              </div>
            </div>

            {/* Name input positioned */}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="FULL NAME"
              className="absolute bg-transparent text-black placeholder:text-black/60 outline-none font-semibold"
              style={{
                top: layout.nameRect.top * s,
                left: layout.nameRect.left * s,
                width: layout.nameRect.width * s,
                height: layout.nameRect.height * s,
                fontSize: Math.max(12, Math.round(18 * s)),
              }}
            />

            {/* Plate / Issued / Expiry - read-only spans */}
            <div
              className="absolute font-bold text-black"
              style={{
                top: layout.plateRect.top * s,
                left: layout.plateRect.left * s,
                width: layout.plateRect.width * s,
                height: layout.plateRect.height * s,
                fontSize: Math.max(12, Math.round(18 * s)),
                display: "flex",
                alignItems: "center",
              }}
            >
              {plate}
            </div>
            <div
              className="absolute font-medium text-black"
              style={{
                top: layout.issuedRect.top * s,
                left: layout.issuedRect.left * s,
                width: layout.issuedRect.width * s,
                height: layout.issuedRect.height * s,
                fontSize: Math.max(11, Math.round(16 * s)),
                display: "flex",
                alignItems: "center",
              }}
            >
              {issued}
            </div>
            <div
              className="absolute font-medium text-black"
              style={{
                top: layout.expiryRect.top * s,
                left: layout.expiryRect.left * s,
                width: layout.expiryRect.width * s,
                height: layout.expiryRect.height * s,
                fontSize: Math.max(11, Math.round(16 * s)),
                display: "flex",
                alignItems: "center",
              }}
            >
              {expiry}
            </div>

            {/* Signature area */}
            <div
              className="absolute rounded-md bg-black/5 ring-1 ring-black/20"
              style={{
                top: sigRect.top * s,
                left: sigRect.left * s,
                width: sigRect.width * s,
                height: sigRect.height * s,
              }}
            >
              <canvas
                ref={canvasRef}
                className="block touch-none"
                onMouseDown={startDrawMouse}
                onMouseMove={moveDrawMouse}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDrawTouch}
                onTouchMove={moveDrawTouch}
                onTouchEnd={endDraw}
              />
              <button
                type="button"
                onClick={clearSignature}
                className="absolute right-2 top-2 rounded-md bg-white/70 px-2 py-1 text-xs font-bold text-black ring-1 ring-black/20 hover:bg-white"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/30"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-extrabold text-white shadow-[0_6px_0_0_rgb(2,132,199)] ring-1 ring-white/20 active:translate-y-[2px] active:shadow-[0_3px_0_0_rgb(2,132,199)]"
            >
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
