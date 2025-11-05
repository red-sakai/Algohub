declare global {
  interface Window {
    __ALG_HUB_SFX_POOL__?: HTMLAudioElement[];
  }
}

function getPool(): HTMLAudioElement[] {
  if (typeof window === "undefined") return [];
  if (!window.__ALG_HUB_SFX_POOL__) window.__ALG_HUB_SFX_POOL__ = [];
  return window.__ALG_HUB_SFX_POOL__;
}

export function playSfx(src: string, volume = 0.6) {
  if (typeof window === "undefined") return;
  try {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = Math.max(0, Math.min(1, volume));
    const pool = getPool();
    pool.push(a);
    const cleanup = () => {
      const idx = pool.indexOf(a);
      if (idx >= 0) pool.splice(idx, 1);
      a.onended = null;
      a.onerror = null;
    };
    a.onended = cleanup;
    a.onerror = cleanup;
    void a.play();
  } catch {
    // ignore
  }
}
