import assert from "node:assert/strict";
import test from "node:test";

import {
  clampSourceFrame,
  mediaTimeToSourceFrame,
  sourceFrameToMediaTime,
} from "../src/components/train-story/media-math.ts";

test("source frames map directly into the forward movie", () => {
  assert.equal(sourceFrameToMediaTime(120, 1), 5);
  assert.equal(mediaTimeToSourceFrame(5, 1), 120);
});

test("source frames map to their exact counterpart in the reverse movie", () => {
  assert.equal(sourceFrameToMediaTime(720, -1), 0);
  assert.equal(sourceFrameToMediaTime(176, -1), 544 / 24);
  assert.equal(mediaTimeToSourceFrame(544 / 24, -1), 176);
  assert.equal(sourceFrameToMediaTime(0, -1), 30);
});

test("reported frames are rounded and kept inside the approved film", () => {
  assert.equal(clampSourceFrame(-20), 0);
  assert.equal(clampSourceFrame(120.49), 120);
  assert.equal(clampSourceFrame(900), 720);
});
