type LoaderState = {
  active: boolean;
  zIndex?: number;
};

export const GLOBAL_LOADER_MIN_MS = 2400;

const listeners = new Set<(state: LoaderState) => void>();
let state: LoaderState = { active: false };
let lastActivatedAt = 0;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach((listener) => listener(state));
}

function finalizeHide() {
  hideTimeout = null;
  state = { active: false };
  notify();
}

export function subscribeGlobalLoader(listener: (state: LoaderState) => void) {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function showGlobalLoader(options?: { zIndex?: number }) {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  lastActivatedAt = Date.now();
  state = { active: true, zIndex: options?.zIndex };
  notify();
}

export function hideGlobalLoader() {
  const elapsed = Date.now() - lastActivatedAt;
  if (elapsed >= GLOBAL_LOADER_MIN_MS) {
    finalizeHide();
    return;
  }

  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
  hideTimeout = setTimeout(finalizeHide, GLOBAL_LOADER_MIN_MS - elapsed);
}
