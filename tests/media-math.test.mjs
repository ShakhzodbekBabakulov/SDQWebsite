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


import { sceneIndexForScroll, mobileMediaForViewport } from "../src/components/train-story/input.ts";
import { MEDIA, chapters, captionChapterForFrame, GREETING_FADE_START_FRAME, GREETING_FADE_END_FRAME } from "../src/components/train-story/timeline.ts";

test("native scroll selects the nearest stable stop and bounds elastic overscroll", () => {
  for (const [position, expected] of [[-100, 0], [399, 0], [400, 1], [1599, 2], [9000, 5]]) {
    assert.equal(sceneIndexForScroll(position, 800), expected);
  }
  assert.equal(sceneIndexForScroll(9000, 800, 3), 2);
  assert.equal(sceneIndexForScroll(400, 0), 0);
  assert.equal(sceneIndexForScroll(NaN, 800), 0);
});

test("phone media survives rotation while tablets and desktops retain wide desktop media", () => {
  assert.equal(mobileMediaForViewport(390, true, 390, 844), true);
  assert.equal(mobileMediaForViewport(844, true, 844, 390), true);
  assert.equal(mobileMediaForViewport(768, true, 768, 1024), false);
  assert.equal(mobileMediaForViewport(600, false, 1440, 900), true);
  assert.equal(mobileMediaForViewport(390, true, 0, 0), true);
  assert.equal(MEDIA.mobile.forward, "/video/sdq-train-mobile-wide.mp4");
  assert.equal(MEDIA.desktop.forward, "/video/sdq-train-desktop.mp4");
});

test("captions follow inclusive displayed chapter ranges and disappear in transit", () => {
  chapters.forEach((chapter, index) => {
    assert.equal(captionChapterForFrame(chapter.startFrame), index);
    assert.equal(captionChapterForFrame(chapter.centreFrame), index);
    assert.equal(captionChapterForFrame(chapter.endFrame), index);
    assert.equal(captionChapterForFrame(chapter.startFrame - 1), null);
    assert.equal(captionChapterForFrame(chapter.endFrame + 1), null);
  });
  assert.equal(captionChapterForFrame(NaN), null);
  assert.equal(GREETING_FADE_START_FRAME, 84);
  assert.equal(GREETING_FADE_END_FRAME, 95);
});
