"use client";
import type { MouseEvent as ReactMouseEvent, SyntheticEvent, TouchEvent as ReactTouchEvent } from "react";
import Image from "next/image";
import { useCallback } from "@/hooks/useCallback";
import { useEffect } from "@/hooks/useEffect";
import { useRef } from "@/hooks/useRef";
import { useState } from "@/hooks/useState";
import { uploadImageDataUrl } from "@/lib/supabase/uploadImage";

// Responsive layout definitions for drivers_license3.png.
// mobile: applied when viewport < 640px; desktop: >= 640px.
// Adjust each rect independently; positions are in logical pixels relative to layout.width.
// If something looks off ONLY on mobile, edit the mobile section; if off ONLY on large screens, edit desktop.
const LICENSE_LAYOUT = {
  mobile: {
    width: 680,
    // Photo box (captured image)
    photoRect: { top: 45, left: 52, width: 160, height: 205, radius: 12 },
    // FULL NAME input
    nameRect: { top: 135, left: 375, width: 320, height: 40 },
    // License plate text
    plateRect: { top: 213, left: 375, width: 220, height: 36 },
    // Issued date
    issuedRect: { top: 281, left: 375, width: 140, height: 30 },
    // Expiry date
    expiryRect: { top: 332, left: 375, width: 160, height: 30 },
    // Signature canvas
    signatureRect: { top: 280, left: 50, width: 160, height: 100 },
  },
  desktop: {
    width: 820,
    // These values can diverge if the asset spacing differs on larger screens.
    // For now we start from mobile values proportionally expanded; tweak as needed.
    photoRect: { top: 60, left: 60, width: 190, height: 240, radius: 14 },
    nameRect: { top: 167, left: 450, width: 350, height: 44 },
    plateRect: { top: 257, left: 450, width: 250, height: 40 },
    issuedRect: { top: 340, left: 450, width: 160, height: 34 },
    expiryRect: { top: 403, left: 450, width: 180, height: 34 },
    signatureRect: { top: 340, left: 70, width: 190, height: 120 },
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
    licenseCardPath: string | null;
  }) => void;
  debugRects?: boolean; // optional: show rectangles for alignment tuning
};

const LICENSE_STORAGE_KEY = "algohub-license-card-path";
const LICENSE_EVENT = "algohub-license-card-updated";

export default function LicenseCardModal({ active, photoDataUrl, onClose, onSave, debugRects }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(LICENSE_LAYOUT.mobile.width);

  // Breakpoint detection (matches Tailwind's sm: 640px)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const layout = isDesktop ? LICENSE_LAYOUT.desktop : LICENSE_LAYOUT.mobile;

  // Width measurement parity with camera modal
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect?.width ?? el.clientWidth;
        if (w > 0 && w !== containerWidth) setContainerWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout.width, containerWidth]);
  // Reset width baseline whenever layout changes by scheduling inside microtask to avoid immediate cascade
  useEffect(() => {
    Promise.resolve().then(() => setContainerWidth(layout.width));
  }, [layout.width]);

  // Track natural image dimensions and recompute scaled height on width/layout changes
  const [imageHeight, setImageHeight] = useState<number | null>(null);
  const naturalDimsRef = useRef<{ w: number; h: number } | null>(null);
  const handleImageLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0) {
      naturalDimsRef.current = { w: img.naturalWidth, h: img.naturalHeight };
      const scale = (containerWidth / layout.width) || 1;
      setImageHeight(Math.round(img.naturalHeight * scale));
    }
  }, [containerWidth, layout.width]);
  // Recompute imageHeight when containerWidth or layout changes and we have natural dims
  useEffect(() => {
    if (naturalDimsRef.current) {
      const { h } = naturalDimsRef.current;
      const scale = (containerWidth / layout.width) || 1;
      setImageHeight(Math.round(h * scale));
    }
  }, [containerWidth, layout.width]);
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
  const [hasSignature, setHasSignature] = useState(false);
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
  const startDrawMouse = (e: ReactMouseEvent) => {
    e.preventDefault();
    drawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getCanvasPos(e.nativeEvent as MouseEvent);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasSignature(true);
  };
  const startDrawTouch = (e: ReactTouchEvent) => {
    e.preventDefault();
    drawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getCanvasPos(e.nativeEvent as unknown as TouchEvent);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasSignature(true);
  };
  const moveDrawMouse = (e: ReactMouseEvent) => {
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
  const moveDrawTouch = (e: ReactTouchEvent) => {
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
    // redraw baseline
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(1 / dpr, 1 / dpr); // reset scale to draw baseline at device pixels
    ctx.scale(dpr, dpr); // reapply scale (cheap approach)
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, (canvas.height / (window.devicePixelRatio || 1)) - 6);
    ctx.lineTo((canvas.width / (window.devicePixelRatio || 1)) - 4, (canvas.height / (window.devicePixelRatio || 1)) - 6);
    ctx.stroke();
    setHasSignature(false);
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

  // Compose final license card image and upload to Supabase (license-photos bucket via env)
  const composeAndUpload = useCallback(async () => {
    const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };

    const baseImg = await load("/drivers_license3.png");
    const photoImg = await load(photoDataUrl);
    const sigUrl = (() => { try { return canvasRef.current?.toDataURL("image/png") || null; } catch { return null; } })();
    const sigImg = sigUrl ? await load(sigUrl) : null;

    const outW = baseImg.naturalWidth || baseImg.width;
    const outH = baseImg.naturalHeight || baseImg.height;
    const exLayout = isDesktop ? LICENSE_LAYOUT.desktop : LICENSE_LAYOUT.mobile;
    const exS = outW / exLayout.width;
    const ex = (v: number) => Math.round(v * exS);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    ctx.drawImage(baseImg, 0, 0, outW, outH);

    // Photo
    const pr = exLayout.photoRect;
    const pw = ex(pr.width), ph = ex(pr.height), px = ex(pr.left), py = ex(pr.top);
    const rad = ex(pr.radius || 0);
    ctx.save();
    roundRect(ctx, px, py, pw, ph, rad);
    ctx.clip();
    const scale = Math.max(pw / photoImg.naturalWidth, ph / photoImg.naturalHeight);
    const dw = photoImg.naturalWidth * scale;
    const dh = photoImg.naturalHeight * scale;
    const dx = px + (pw - dw) / 2;
    const dy = py + (ph - dh) / 2;
    ctx.drawImage(photoImg, dx, dy, dw, dh);
    ctx.restore();

    // Text
    ctx.fillStyle = "#000";
    ctx.textBaseline = "middle";
    const drawText = (text: string, rect: { top: number; left: number; width: number; height: number }, pxSize: number, weight: number = 600) => {
      ctx.font = `${weight} ${Math.round(pxSize * exS)}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
      const x = ex(rect.left);
      const y = ex(rect.top) + ex(rect.height) / 2;
      ctx.fillText(text, x, y);
    };
    drawText(name, exLayout.nameRect, 18, 600);
    drawText(plate, exLayout.plateRect, 18, 700);
    drawText(issued, exLayout.issuedRect, 16, 500);
    drawText(expiry, exLayout.expiryRect, 16, 500);

    // Signature
    if (sigImg) {
      const sr = exLayout.signatureRect;
      ctx.drawImage(sigImg, ex(sr.left), ex(sr.top), ex(sr.width), ex(sr.height));
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    return uploadImageDataUrl(dataUrl, { folder: "license_cards", makePublic: true });
  }, [isDesktop, name, plate, issued, expiry, photoDataUrl]);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !hasSignature) return; // guard
    let signatureDataUrl: string | null = null;
    try {
      signatureDataUrl = canvasRef.current?.toDataURL("image/png") ?? null;
    } catch {}
    let licenseCardPath: string | null = null;
    try {
      localStorage.setItem("algohub_license_name", name);
      localStorage.setItem("algohub_license_plate", plate);
      localStorage.setItem("algohub_license_issued", issued);
      localStorage.setItem("algohub_license_expiry", expiry);
      if (signatureDataUrl) localStorage.setItem("algohub_license_signature", signatureDataUrl);
    } catch {}
    // Compose and upload final license image
    try {
      const result = await composeAndUpload();
      if (result?.path) {
        licenseCardPath = result.path;
        try {
          localStorage.setItem(LICENSE_STORAGE_KEY, licenseCardPath);
        } catch {}
        try {
          window.dispatchEvent(new CustomEvent(LICENSE_EVENT, { detail: licenseCardPath }));
        } catch {}
      }
    } catch (e) {
      console.error("License compose/upload failed", e);
    }
    onSave?.({ name, plate, issued, expiry, signatureDataUrl, licenseCardPath });
    onClose();
  }, [expiry, issued, name, onClose, onSave, plate, hasSignature, composeAndUpload]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[1400]" aria-modal role="dialog">
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        {/* Close */}
        <button
          aria-label="Close license"
          onClick={onClose}
          className="absolute right-4 top-4 inline-grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/20 hover:bg-white/25"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <div className="relative w-full">
          {/* Stage */}
          <div ref={stageRef} key={layout.width} className="relative mx-auto" style={{ width: `min(100%, ${layout.width}px)` }}>
            <Image
              src="/drivers_license3.png"
              alt="Driver's License"
              width={layout.width}
              height={imageHeight ?? Math.round(layout.width * 0.6)}
              priority
              onLoad={handleImageLoad}
              className="w-full h-auto select-none drop-shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
            />
            {/* Photo placement */}
            <div
              className={`absolute overflow-hidden bg-black/20 ${debugRects ? "ring-2 ring-cyan-400" : ""}`}
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
              className={`absolute bg-transparent text-black placeholder:text-black/60 outline-none font-semibold ${debugRects ? "ring-1 ring-purple-400" : ""}`}
              style={{
                top: layout.nameRect.top * s,
                left: layout.nameRect.left * s,
                width: layout.nameRect.width * s,
                height: layout.nameRect.height * s,
                fontSize: Math.max(12, Math.round(18 * s)),
              }}
            />
            {/* Plate / Issued / Expiry */}
            <div
              className={`absolute font-bold text-black ${debugRects ? "ring-1 ring-green-400" : ""}`}
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
              className={`absolute font-medium text-black ${debugRects ? "ring-1 ring-yellow-400" : ""}`}
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
              className={`absolute font-medium text-black ${debugRects ? "ring-1 ring-orange-400" : ""}`}
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
              className={`absolute rounded-md bg-black/5 ring-1 ring-black/20 ${debugRects ? "ring-2 ring-red-400" : ""}`}
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
          {/* Action bar */}
          <div className="mx-auto mt-4 flex max-w-[min(100%,_700px)] items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/30"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || !hasSignature}
              aria-disabled={!name.trim() || !hasSignature}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-extrabold text-white shadow-[0_6px_0_0_rgb(2,132,199)] ring-1 ring-white/20 active:translate-y-[2px] active:shadow-[0_3px_0_0_rgb(2,132,199)]"
            >
              Save & Continue
            </button>
          </div>
          {(!name.trim() || !hasSignature) && (
            <div className="mt-2 text-center text-xs font-medium text-white/70">
              Enter your full name and draw your signature to enable saving.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
