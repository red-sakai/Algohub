export const PARKING_RADIO_WHEEL_EVENT = "algohub:parking-radio-wheel";

export type ParkingRadioWheelDetail = {
  slowMo: boolean;
};

export type ParkingRadioWheelHandler = (detail: ParkingRadioWheelDetail) => void;

export function emitParkingRadioWheelEvent(detail: ParkingRadioWheelDetail) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(PARKING_RADIO_WHEEL_EVENT, { detail }));
}

export function subscribeToParkingRadioWheel(handler: ParkingRadioWheelHandler) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = (event: Event) => {
    const custom = event as CustomEvent<ParkingRadioWheelDetail>;
    handler(custom.detail ?? { slowMo: false });
  };
  window.addEventListener(PARKING_RADIO_WHEEL_EVENT, listener as EventListener);
  return () => window.removeEventListener(PARKING_RADIO_WHEEL_EVENT, listener as EventListener);
}
