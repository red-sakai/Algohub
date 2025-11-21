declare global {
  interface Window {
    __ALG_HUB_AUDIO?: HTMLAudioElement;
  }
}

export function getGlobalAudio(): HTMLAudioElement {
  if (typeof window === "undefined") {
    // SSR safety: return a dummy Audio-like object; won't be used client-side
    // but keeps types happy when imported in a server context accidentally.
    return new (class extends Audio {
      // no-op placeholder
    })();
  }
  if (!window.__ALG_HUB_AUDIO) {
    const a = new Audio();
    a.preload = "auto";
    window.__ALG_HUB_AUDIO = a;
  }
  return window.__ALG_HUB_AUDIO!;
}
