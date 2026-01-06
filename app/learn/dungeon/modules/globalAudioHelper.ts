/**
 * Helper module for managing global audio interactions
 * Reduces code duplication when pausing/resuming global audio
 */

interface GlobalAudio {
  pause?: () => void;
  play?: () => Promise<void>;
  ended?: boolean;
}

/**
 * Get the global audio singleton if available
 */
function getGlobalAudio(): GlobalAudio | null {
  if (typeof window === "undefined") return null;

  try {
    const globalAudio = (
      window as unknown as {
        __ALG_HUB_AUDIO?: GlobalAudio;
      }
    ).__ALG_HUB_AUDIO;
    return globalAudio || null;
  } catch (e) {
    console.log("Could not access global audio:", e);
    return null;
  }
}

/**
 * Pause global audio if it exists and is playing
 */
export function pauseGlobalAudio(): void {
  const globalAudio = getGlobalAudio();
  if (globalAudio && typeof globalAudio.pause === "function") {
    globalAudio.pause();
  }
}

/**
 * Resume global audio if it exists and hasn't ended
 */
export function resumeGlobalAudio(): void {
  const globalAudio = getGlobalAudio();
  if (
    globalAudio &&
    typeof globalAudio.play === "function" &&
    !globalAudio.ended
  ) {
    globalAudio.play().catch(() => {
      // Ignore if autoplay is blocked
    });
  }
}
