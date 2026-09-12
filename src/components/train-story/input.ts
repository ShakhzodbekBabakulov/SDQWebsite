import {
  MAX_TRAVEL_RATE,
  MIN_TRAVEL_RATE,
} from "./timeline.ts";

const LINE_HEIGHT_PX = 16;
const FULL_STRENGTH_PX_PER_MS = 2;
const STRENGTH_MEMORY = 0.65;

type WheelLike = {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
};

type SwipeLike = {
  deltaX: number;
  deltaY: number;
};

export type Direction = -1 | 1;
export type KeyboardIntent =
  | Direction
  | "first"
  | "last"
  | "toggle-pause"
  | "pause";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function normalizeWheel(
  event: WheelLike,
  viewportHeight: number,
): { direction: Direction; pixels: number } | null {
  if (event.ctrlKey || event.metaKey || event.altKey || event.deltaY === 0) {
    return null;
  }

  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
    return null;
  }

  const multiplier =
    event.deltaMode === 1
      ? LINE_HEIGHT_PX
      : event.deltaMode === 2
        ? viewportHeight
        : 1;

  return {
    direction: event.deltaY > 0 ? 1 : -1,
    pixels: Math.abs(event.deltaY * multiplier),
  };
}

export function normalizeSwipe(
  gesture: SwipeLike,
): { direction: Direction; pixels: number } | null {
  const horizontalDistance = Math.abs(gesture.deltaX);
  const verticalDistance = Math.abs(gesture.deltaY);

  if (verticalDistance < 48 || verticalDistance < horizontalDistance * 1.25) {
    return null;
  }

  return {
    direction: gesture.deltaY < 0 ? 1 : -1,
    pixels: verticalDistance,
  };
}

export function travelPlaybackRate(
  pixels: number,
  elapsedMs: number,
  previousStrength: number,
): number {
  const velocity = pixels / Math.max(elapsedMs, 1);
  const immediateStrength = clamp(
    velocity / FULL_STRENGTH_PX_PER_MS,
    0,
    1,
  );
  const strength =
    immediateStrength === 1
      ? 1
      : previousStrength * STRENGTH_MEMORY +
        immediateStrength * (1 - STRENGTH_MEMORY);

  return (
    MIN_TRAVEL_RATE +
    clamp(strength, 0, 1) * (MAX_TRAVEL_RATE - MIN_TRAVEL_RATE)
  );
}

export function keyboardIntent(
  key: string,
  shiftKey = false,
): KeyboardIntent | null {
  if (key === "ArrowDown" || key === "PageDown") return 1;
  if (key === "ArrowUp" || key === "PageUp") return -1;
  if (key === " ") return shiftKey ? -1 : 1;
  if (key === "Home") return "first";
  if (key === "End") return "last";
  if (key.toLowerCase() === "p") return "toggle-pause";
  if (key === "Escape") return "pause";
  return null;
}
