import { travelPlaybackRate, type Direction } from "./input.ts";
import {
  INPUT_IDLE_MS,
  LAST_FRAME,
  MIN_TRAVEL_RATE,
  chapters,
  loopDurationMs,
  loopPlaybackRate,
} from "./timeline.ts";

export type PlaybackCommand =
  | {
      type: "play" | "cut-and-play";
      direction: Direction;
      fromFrame: number;
      toFrame: number;
      rate: number;
    }
  | { type: "rate"; rate: number }
  | {
      type: "loop";
      startFrame: number;
      endFrame: number;
      rate: number;
      durationMs: number;
    }
  | { type: "hold"; frame: number }
  | { type: "pause" };

type Phase =
  | "opening"
  | "resting"
  | "traveling"
  | "wrap-departure"
  | "wrap-arrival"
  | "paused";

type ControllerOptions = {
  reducedMotion?: boolean;
  startAtRest?: boolean;
};

type Snapshot = {
  chapterIndex: number;
  targetChapterIndex: number | null;
  phase: Phase;
  direction: Direction | 0;
  gestureLocked: boolean;
  reducedMotion: boolean;
};

const restingLoop = (chapterIndex: number): PlaybackCommand => {
  const chapter = chapters[chapterIndex];
  return {
    type: "loop",
    startFrame: chapter.startFrame,
    endFrame: chapter.endFrame,
    rate: loopPlaybackRate(chapter),
    durationMs: loopDurationMs(chapter),
  };
};

export function createPlaybackController(options: ControllerOptions = {}) {
  const reducedMotion = options.reducedMotion ?? false;
  let phase: Phase = reducedMotion || options.startAtRest ? "resting" : "opening";
  let chapterIndex = 0;
  let targetChapterIndex: number | null = phase === "opening" ? 0 : null;
  let departureChapterIndex: number | null = null;
  let direction: Direction | 0 = phase === "opening" ? 1 : 0;
  let gestureLocked = phase === "opening";
  let lastSignalAt = Number.NEGATIVE_INFINITY;
  let lastRateSignalAt = Number.NEGATIVE_INFINITY;
  let strength = 0;
  let gestureHasEnded = true;
  let pausedFrom: Phase | null = null;

  const snapshot = (): Snapshot => ({
    chapterIndex,
    targetChapterIndex,
    phase,
    direction,
    gestureLocked,
    reducedMotion,
  });

  const start = (): PlaybackCommand => {
    if (reducedMotion || phase === "resting") {
      return reducedMotion
        ? { type: "hold", frame: chapters[chapterIndex].centreFrame }
        : restingLoop(chapterIndex);
    }

    return {
      type: "play",
      direction: 1,
      fromFrame: 0,
      toFrame: chapters[0].startFrame,
      rate: MIN_TRAVEL_RATE,
    };
  };

  const releaseGesture = (now: number) => {
    if (now - lastSignalAt < INPUT_IDLE_MS) return;
    gestureHasEnded = true;
    if (phase === "resting") gestureLocked = false;
    strength = 0;
    lastRateSignalAt = Number.NEGATIVE_INFINITY;
  };

  const beginTravel = (
    nextChapterIndex: number,
    nextDirection: Direction,
    frame: number,
    rate: number,
  ): PlaybackCommand => {
    departureChapterIndex = chapterIndex;
    targetChapterIndex = nextChapterIndex;
    direction = nextDirection;
    phase = "traveling";

    const destination = chapters[nextChapterIndex];
    return {
      type: "play",
      direction: nextDirection,
      fromFrame: frame,
      toFrame:
        nextDirection === 1 ? destination.startFrame : destination.endFrame,
      rate,
    };
  };

  const intent = (
    nextDirection: Direction,
    pixels: number,
    now: number,
    displayedFrame: number,
  ): PlaybackCommand | null => {
    if (
      phase === "opening" ||
      phase === "wrap-departure" ||
      phase === "wrap-arrival" ||
      phase === "paused"
    ) {
      lastSignalAt = now;
      return null;
    }

    const elapsed = Number.isFinite(lastRateSignalAt)
      ? now - lastRateSignalAt
      : Number.POSITIVE_INFINITY;
    const rate = Number.isFinite(elapsed)
      ? travelPlaybackRate(pixels, elapsed, strength)
      : MIN_TRAVEL_RATE;
    strength = (rate - MIN_TRAVEL_RATE) / 0.1;
    lastRateSignalAt = now;
    lastSignalAt = now;
    gestureHasEnded = false;

    if (phase === "traveling") {
      if (nextDirection === direction) return { type: "rate", rate };

      const formerTarget = targetChapterIndex;
      targetChapterIndex = departureChapterIndex;
      departureChapterIndex = formerTarget;
      direction = nextDirection;
      const destination = chapters[targetChapterIndex ?? chapterIndex];

      return {
        type: "play",
        direction: nextDirection,
        fromFrame: displayedFrame,
        toFrame:
          nextDirection === 1 ? destination.startFrame : destination.endFrame,
        rate,
      };
    }

    if (gestureLocked) return null;
    gestureLocked = true;

    if (reducedMotion) {
      const lastIndex = chapters.length - 1;
      if (nextDirection === -1 && chapterIndex === 0) return null;
      chapterIndex =
        nextDirection === 1 && chapterIndex === lastIndex
          ? 0
          : chapterIndex + nextDirection;
      return { type: "hold", frame: chapters[chapterIndex].centreFrame };
    }

    if (nextDirection === -1 && chapterIndex === 0) return null;

    if (nextDirection === 1 && chapterIndex === chapters.length - 1) {
      phase = "wrap-departure";
      direction = 1;
      targetChapterIndex = 0;
      departureChapterIndex = chapterIndex;
      return {
        type: "play",
        direction: 1,
        fromFrame: displayedFrame,
        toFrame: LAST_FRAME,
        rate,
      };
    }

    return beginTravel(
      chapterIndex + nextDirection,
      nextDirection,
      displayedFrame,
      rate,
    );
  };

  const complete = (
    displayedFrame: number,
    now: number,
  ): PlaybackCommand | null => {
    void displayedFrame;
    void now;

    if (phase === "opening") {
      chapterIndex = 0;
      targetChapterIndex = null;
      direction = 0;
      phase = "resting";
      gestureLocked = false;
      gestureHasEnded = true;
      return restingLoop(0);
    }

    if (phase === "traveling") {
      chapterIndex = targetChapterIndex ?? chapterIndex;
      targetChapterIndex = null;
      departureChapterIndex = null;
      direction = 0;
      phase = "resting";
      if (gestureHasEnded && now - lastSignalAt >= INPUT_IDLE_MS) {
        gestureLocked = false;
      }
      return restingLoop(chapterIndex);
    }

    if (phase === "wrap-departure") {
      phase = "wrap-arrival";
      direction = 1;
      return {
        type: "cut-and-play",
        direction: 1,
        fromFrame: 0,
        toFrame: chapters[0].startFrame,
        rate: MIN_TRAVEL_RATE,
      };
    }

    if (phase === "wrap-arrival") {
      chapterIndex = 0;
      targetChapterIndex = null;
      departureChapterIndex = null;
      direction = 0;
      phase = "resting";
      if (gestureHasEnded && now - lastSignalAt >= INPUT_IDLE_MS) {
        gestureLocked = false;
      }
      return restingLoop(0);
    }

    return null;
  };

  const jump = (
    destination: "first" | "last",
    now: number,
  ): PlaybackCommand => {
    chapterIndex = destination === "first" ? 0 : chapters.length - 1;
    targetChapterIndex = null;
    departureChapterIndex = null;
    direction = 0;
    phase = "resting";
    gestureLocked = true;
    gestureHasEnded = false;
    lastSignalAt = now;
    return { type: "hold", frame: chapters[chapterIndex].centreFrame };
  };

  const settleForPresentationChange = (
    keepPaused: boolean,
  ): PlaybackCommand => {
    const destinationIndex =
      phase === "opening" ||
      phase === "wrap-departure" ||
      phase === "wrap-arrival"
        ? 0
        : (targetChapterIndex ?? chapterIndex);

    chapterIndex = destinationIndex;
    targetChapterIndex = null;
    departureChapterIndex = null;
    direction = 0;
    gestureLocked = false;
    gestureHasEnded = true;
    strength = 0;
    lastRateSignalAt = Number.NEGATIVE_INFINITY;
    pausedFrom = keepPaused ? "resting" : null;
    phase = keepPaused ? "paused" : "resting";

    return keepPaused || reducedMotion
      ? { type: "hold", frame: chapters[chapterIndex].centreFrame }
      : restingLoop(chapterIndex);
  };

  const pause = (): PlaybackCommand => {
    if (phase !== "paused") {
      pausedFrom = phase;
      phase = "paused";
    }
    return { type: "pause" };
  };

  const togglePause = (): PlaybackCommand => {
    if (phase !== "paused") return pause();
    phase = pausedFrom ?? "resting";
    pausedFrom = null;
    return phase === "resting"
      ? reducedMotion
        ? { type: "hold", frame: chapters[chapterIndex].centreFrame }
        : restingLoop(chapterIndex)
      : { type: "pause" };
  };

  return {
    start,
    intent,
    complete,
    jump,
    settleForPresentationChange,
    pause,
    togglePause,
    releaseGesture,
    snapshot,
  };
}
