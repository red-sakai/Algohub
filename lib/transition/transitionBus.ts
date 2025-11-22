const IRIS_POINT_KEY = "algohub_iris_point_v1";
const SKIP_OPEN_KEY = "algohub_skip_iris_open_v1";
const SKIP_AUTH_MODAL_KEY = "algohub_skip_auth_modal_v1";

type Point = { x: number; y: number; ts: number };

export function setIrisPoint(x: number, y: number) {
  if (typeof window === "undefined") return;
  try {
    const p: Point = { x, y, ts: Date.now() };
    sessionStorage.setItem(IRIS_POINT_KEY, JSON.stringify(p));
  } catch {}
}

export function consumeIrisPoint(maxAgeMs = 2500): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(IRIS_POINT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(IRIS_POINT_KEY);
    const p = JSON.parse(raw) as Point;
    if (!p || typeof p.x !== "number" || typeof p.y !== "number" || typeof p.ts !== "number") return null;
    if (Date.now() - p.ts > maxAgeMs) return null;
    return { x: p.x, y: p.y };
  } catch {
    return null;
  }
}

export function setSkipNextIrisOpen() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SKIP_OPEN_KEY, "1");
  } catch {}
}

export function consumeSkipNextIrisOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const flag = sessionStorage.getItem(SKIP_OPEN_KEY);
    if (!flag) return false;
    sessionStorage.removeItem(SKIP_OPEN_KEY);
    return true;
  } catch {
    return false;
  }
}

export function setSkipNextAuthModal() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SKIP_AUTH_MODAL_KEY, "1");
  } catch {}
}

export function consumeSkipNextAuthModal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const flag = sessionStorage.getItem(SKIP_AUTH_MODAL_KEY);
    if (!flag) return false;
    sessionStorage.removeItem(SKIP_AUTH_MODAL_KEY);
    return true;
  } catch {
    return false;
  }
}
