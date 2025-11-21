export type BusTrack = { title: string; src: string };

const EVENT_NAME = "algohub:playTracks";

type Payload = { tracks: BusTrack[]; index?: number };

export function playTracks(tracks: BusTrack[], index = 0) {
  if (typeof window === "undefined") return;
  const detail: Payload = { tracks, index };
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
}

export const MUSIC_BUS = {
  EVENT_NAME,
  playTracks,
};
