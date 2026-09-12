import assert from "node:assert/strict";
import test from "node:test";

import {
  FPS,
  INPUT_IDLE_MS,
  LAST_FRAME,
  LOOP_DURATION_MS,
  chapters,
  loopPlaybackRate,
} from "../src/components/train-story/timeline.ts";
import {
  createPlaybackController,
} from "../src/components/train-story/controller.ts";
import * as trainInput from "../src/components/train-story/input.ts";

const { keyboardIntent, normalizeWheel, travelPlaybackRate } = trainInput;

test("the approved six carriage ranges are the source of truth", () => {
  assert.equal(FPS, 24);
  assert.equal(LAST_FRAME, 720);
  assert.deepEqual(
    chapters.map(({ id, startFrame, centreFrame, endFrame }) => ({
      id,
      startFrame,
      centreFrame,
      endFrame,
    })),
    [
      { id: "sdq", startFrame: 108, centreFrame: 120, endFrame: 132 },
      { id: "official-1c-partner", startFrame: 228, centreFrame: 243, endFrame: 258 },
      { id: "trusted-partnerships", startFrame: 324, centreFrame: 339, endFrame: 354 },
      { id: "support-team", startFrame: 408, centreFrame: 420, endFrame: 432 },
      { id: "artificial-intelligence", startFrame: 504, centreFrame: 512, endFrame: 519 },
      { id: "lets-talk", startFrame: 606, centreFrame: 624, endFrame: 642 },
    ],
  );
});

test("the first four resting ranges make one forward-and-back trip in exactly four seconds", () => {
  assert.equal(LOOP_DURATION_MS, 4_000);

  for (const chapter of chapters.slice(0, 4)) {
    const framesPerLeg = chapter.endFrame - chapter.startFrame;
    const secondsPerLeg = framesPerLeg / FPS / loopPlaybackRate(chapter);
    assert.equal(secondsPerLeg * 2 * 1_000, LOOP_DURATION_MS);
  }
});

test("the final two resting loops preserve their natural playback speed", () => {
  const controller = createPlaybackController({ startAtRest: true });
  controller.jump("last", 1_000);
  controller.releaseGesture(1_000 + INPUT_IDLE_MS);

  controller.intent(-1, 80, 1_500, 624);
  const aiLoop = controller.complete(519, 5_000);
  assert.equal(aiLoop?.type, "loop");
  assert.equal(aiLoop?.rate, 0.875);
  assert.ok(Math.abs(aiLoop.durationMs - 10_000 / 7) < 0.001);

  controller.releaseGesture(5_000);
  controller.intent(1, 80, 5_500, 512);
  const contactLoop = controller.complete(606, 9_000);
  assert.equal(contactLoop?.type, "loop");
  assert.equal(contactLoop?.rate, 0.875);
  assert.ok(Math.abs(contactLoop.durationMs - 24_000 / 7) < 0.001);
});

test("wheel input is normalized without stealing zoom or horizontal gestures", () => {
  assert.deepEqual(
    normalizeWheel({ deltaX: 0, deltaY: 3, deltaMode: 1 }, 900),
    { direction: 1, pixels: 48 },
  );
  assert.deepEqual(
    normalizeWheel({ deltaX: 0, deltaY: -1, deltaMode: 2 }, 900),
    { direction: -1, pixels: 900 },
  );
  assert.equal(
    normalizeWheel({ deltaX: 30, deltaY: 10, deltaMode: 0 }, 900),
    null,
  );
  assert.equal(
    normalizeWheel(
      { deltaX: 0, deltaY: 10, deltaMode: 0, ctrlKey: true },
      900,
    ),
    null,
  );
});

test("vertical phone swipes map to the same carriage directions as desktop scroll", () => {
  const normalizeSwipe = trainInput.normalizeSwipe ?? (() => null);

  assert.deepEqual(normalizeSwipe({ deltaX: 8, deltaY: -96 }), {
    direction: 1,
    pixels: 96,
  });
  assert.deepEqual(normalizeSwipe({ deltaX: -6, deltaY: 72 }), {
    direction: -1,
    pixels: 72,
  });
});

test("short or mostly sideways phone gestures do not move the train", () => {
  const normalizeSwipe = trainInput.normalizeSwipe ?? (() => null);

  assert.equal(normalizeSwipe({ deltaX: 2, deltaY: -47 }), null);
  assert.equal(normalizeSwipe({ deltaX: 80, deltaY: -60 }), null);
});

test("gesture strength can change travel speed but never leaves the 1.10x-1.20x band", () => {
  assert.ok(travelPlaybackRate(1, 100, 0) >= 1.1);
  assert.equal(travelPlaybackRate(1_000, 1, 0), 1.2);
  assert.ok(travelPlaybackRate(60, 50, 0.4) > 1.1);
  assert.ok(travelPlaybackRate(60, 50, 0.4) < 1.2);
});

test("the opening arrives automatically at SDQ and begins its resting loop", () => {
  const controller = createPlaybackController();
  assert.deepEqual(controller.start(), {
    type: "play",
    direction: 1,
    fromFrame: 0,
    toFrame: 108,
    rate: 1.1,
  });

  const arrival = controller.complete(108, 5_000);
  assert.equal(controller.snapshot().chapterIndex, 0);
  assert.equal(controller.snapshot().phase, "resting");
  assert.equal(arrival?.type, "loop");
  assert.equal(arrival?.durationMs, 4_000);
});

test("one gesture selects one carriage while its momentum only adjusts speed", () => {
  const controller = createPlaybackController({ startAtRest: true });

  const first = controller.intent(1, 80, 1_000, 120);
  assert.equal(first?.type, "play");
  assert.equal(first?.toFrame, 228);
  assert.equal(controller.snapshot().targetChapterIndex, 1);

  const momentum = controller.intent(1, 500, 1_020, 140);
  assert.equal(momentum?.type, "rate");
  assert.equal(controller.snapshot().targetChapterIndex, 1);
  assert.ok(momentum.rate >= 1.1 && momentum.rate <= 1.2);

  controller.complete(228, 3_000);
  const residual = controller.intent(1, 30, 3_050, 230);
  assert.equal(residual, null);
  assert.equal(controller.snapshot().chapterIndex, 1);

  controller.releaseGesture(3_050 + INPUT_IDLE_MS);
  const next = controller.intent(1, 80, 3_300, 243);
  assert.equal(next?.toFrame, 324);
});

test("opposite input reverses immediately from the exact displayed frame", () => {
  const controller = createPlaybackController({ startAtRest: true });
  controller.intent(1, 80, 1_000, 120);

  const reversal = controller.intent(-1, 80, 1_040, 176);
  assert.deepEqual(reversal, {
    type: "play",
    direction: -1,
    fromFrame: 176,
    toFrame: 132,
    rate: 1.2,
  });
  assert.equal(controller.snapshot().targetChapterIndex, 0);
});

test("changing film shape settles on the intended carriage", () => {
  const controller = createPlaybackController({ startAtRest: true });
  controller.intent(1, 80, 1_000, 120);

  const command = controller.settleForPresentationChange?.(false);

  assert.deepEqual(command, {
    type: "loop",
    startFrame: 228,
    endFrame: 258,
    rate: 0.625,
    durationMs: 4_000,
  });
  assert.equal(controller.snapshot().chapterIndex, 1);
  assert.equal(controller.snapshot().phase, "resting");
});

test("changing film shape keeps a paused journey paused on a visible frame", () => {
  const controller = createPlaybackController({ startAtRest: true });
  controller.intent(1, 80, 1_000, 120);

  const command = controller.settleForPresentationChange?.(true);

  assert.deepEqual(command, { type: "hold", frame: 243 });
  assert.equal(controller.snapshot().chapterIndex, 1);
  assert.equal(controller.snapshot().phase, "paused");
});

test("the first boundary is blocked and the last boundary performs the full wrap", () => {
  const controller = createPlaybackController({ startAtRest: true });
  assert.equal(controller.intent(-1, 80, 1_000, 120), null);
  assert.equal(controller.snapshot().chapterIndex, 0);

  controller.jump("last", 2_000);
  controller.releaseGesture(2_000 + INPUT_IDLE_MS);
  const departure = controller.intent(1, 80, 2_500, 627);
  assert.deepEqual(departure, {
    type: "play",
    direction: 1,
    fromFrame: 627,
    toFrame: LAST_FRAME,
    rate: 1.1,
  });

  const replayArrival = controller.complete(LAST_FRAME, 6_000);
  assert.deepEqual(replayArrival, {
    type: "cut-and-play",
    direction: 1,
    fromFrame: 0,
    toFrame: 108,
    rate: 1.1,
  });
  assert.equal(controller.intent(1, 500, 6_020, 20), null);

  controller.complete(108, 10_000);
  assert.equal(controller.snapshot().chapterIndex, 0);
  assert.equal(controller.snapshot().phase, "resting");
});

test("reduced motion jumps between paused centre frames", () => {
  const controller = createPlaybackController({ reducedMotion: true });
  assert.deepEqual(controller.start(), { type: "hold", frame: 120 });

  assert.deepEqual(controller.intent(1, 80, 1_000, 120), {
    type: "hold",
    frame: 243,
  });
  controller.releaseGesture(1_000 + INPUT_IDLE_MS);
  controller.jump("last", 2_000);
  controller.releaseGesture(2_000 + INPUT_IDLE_MS);
  assert.deepEqual(controller.intent(1, 80, 2_500, 627), {
    type: "hold",
    frame: 120,
  });
});

test("keyboard controls use native browsing conventions", () => {
  assert.equal(keyboardIntent("ArrowDown"), 1);
  assert.equal(keyboardIntent("PageDown"), 1);
  assert.equal(keyboardIntent(" "), 1);
  assert.equal(keyboardIntent(" ", true), -1);
  assert.equal(keyboardIntent("ArrowUp"), -1);
  assert.equal(keyboardIntent("Home"), "first");
  assert.equal(keyboardIntent("End"), "last");
  assert.equal(keyboardIntent("p"), "toggle-pause");
  assert.equal(keyboardIntent("Escape"), "pause");
  assert.equal(keyboardIntent("Enter"), null);
});
