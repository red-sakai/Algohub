declare global {
  interface Window {
    __ALG_HUB_GAME_AUDIO__?: HTMLAudioElement;
  }
}

export function getGameAudio(): HTMLAudioElement {
  if (typeof window === "undefined") {
    return new (class extends Audio {})();
  }
  if (!window.__ALG_HUB_GAME_AUDIO__) {
    const a = new Audio();
    a.preload = "auto";
    window.__ALG_HUB_GAME_AUDIO__ = a;
  }
  return window.__ALG_HUB_GAME_AUDIO__!;
}
