import { FPS, LAST_FRAME } from "./timeline.ts";
import type { Direction } from "./input.ts";

export function clampSourceFrame(frame: number): number {
  return Math.min(LAST_FRAME, Math.max(0, Math.round(frame)));
}

export function sourceFrameToMediaTime(
  sourceFrame: number,
  direction: Direction,
): number {
  const frame = clampSourceFrame(sourceFrame);
  return (direction === 1 ? frame : LAST_FRAME - frame) / FPS;
}

export function mediaTimeToSourceFrame(
  mediaTime: number,
  direction: Direction,
): number {
  const mediaFrame = mediaTime * FPS;
  return clampSourceFrame(
    direction === 1 ? mediaFrame : LAST_FRAME - mediaFrame,
  );
}
