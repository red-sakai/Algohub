const KEY = "algohub_iris_point_v1";

type Point = { x: number; y: number; ts: number };

export function setIrisPoint(x: number, y: number) {
  if (typeof window === "undefined") return;
  try {
    const p: Point = { x, y, ts: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

export function consumeIrisPoint(maxAgeMs = 2500): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const p = JSON.parse(raw) as Point;
    if (!p || typeof p.x !== "number" || typeof p.y !== "number" || typeof p.ts !== "number") return null;
    if (Date.now() - p.ts > maxAgeMs) return null;
    return { x: p.x, y: p.y };
  } catch {
    return null;
  }
}
