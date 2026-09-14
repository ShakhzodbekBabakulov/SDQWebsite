import { expect, test, type Page } from "@playwright/test";

import {
  chapters,
  LAST_FRAME,
} from "../../src/components/train-story/timeline.ts";

const PREVIEW_URL = process.env.SDQ_PREVIEW_URL ?? "http://127.0.0.1:3000";
const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.use({ viewport: MOBILE_VIEWPORT, hasTouch: true });

const stage = (page: Page) => page.locator(".video-stage");
const forwardFilm = (page: Page) => page.locator('video[data-direction="1"]');
const reverseFilm = (page: Page) => page.locator('video[data-direction="-1"]');

async function openStory(page: Page) {
  await page.goto(new URL("/", PREVIEW_URL).href);
  await expect(stage(page)).toHaveAttribute("data-variant", "mobile");
  await expect(page.locator(".train-story")).toHaveAttribute("data-mobile", "true");
  await expect(page.locator("video")).toHaveCount(2);
}

async function scrollToChapter(page: Page, index: number) {
  await page.evaluate((chapterIndex) => {
    const stops = document.querySelectorAll<HTMLElement>(".mobile-story-stop");
    const height = stops[0]?.getBoundingClientRect().height ?? innerHeight;
    window.scrollTo({ top: chapterIndex * height, behavior: "instant" });
  }, index);
}

async function waitForRest(page: Page, index: number) {
  const chapter = chapters[index];
  await page.waitForFunction(
    ({ chapterId, destination, minimum, maximum }) => {
      const story = document.querySelector<HTMLElement>(".train-story");
      const film = document.querySelector<HTMLElement>(".video-stage");
      const frame = Number(film?.dataset.frame);
      return story?.dataset.mode === "resting" &&
        story.dataset.scene === chapterId &&
        story.dataset.destination === String(destination) &&
        frame >= minimum && frame <= maximum;
    },
    {
      chapterId: chapter.id,
      destination: index,
      minimum: chapter.startFrame,
      maximum: chapter.endFrame,
    },
  );
}

async function waitForDirection(page: Page, direction: -1 | 1) {
  await expect(stage(page)).toHaveAttribute("data-direction", String(direction));
  await expect(direction === 1 ? forwardFilm(page) : reverseFilm(page)).toHaveAttribute(
    "data-active",
    "true",
  );
}

async function sampleFrames(page: Page, durationMs: number) {
  return page.evaluate(async (duration) => {
    const samples: Array<{ at: number; frame: number; direction: number; rate: number }> = [];
    const started = performance.now();
    while (performance.now() - started < duration) {
      const film = document.querySelector<HTMLElement>(".video-stage");
      samples.push({
        at: performance.now() - started,
        frame: Number(film?.dataset.frame),
        direction: Number(film?.dataset.direction),
        rate: Number(film?.dataset.rate),
      });
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return samples;
  }, durationMs);
}

async function measureLoopRoundTrips(page: Page, changeCount: number) {
  return page.evaluate(async (wantedChanges) => {
    const samples: Array<{ at: number; frame: number; direction: number; rate: number }> = [];
    const changes: Array<{ at: number; frame: number; direction: number }> = [];
    const started = performance.now();
    let previousDirection = Number(
      document.querySelector<HTMLElement>(".video-stage")?.dataset.direction,
    );
    while (changes.length < wantedChanges && performance.now() - started < 15_000) {
      const film = document.querySelector<HTMLElement>(".video-stage");
      const sample = {
        at: performance.now() - started,
        frame: Number(film?.dataset.frame),
        direction: Number(film?.dataset.direction),
        rate: Number(film?.dataset.rate),
      };
      samples.push(sample);
      if (sample.direction !== previousDirection) {
        previousDirection = sample.direction;
        changes.push(sample);
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    return { samples, changes };
  }, changeCount);
}

async function expectContinuousDirectionChange(page: Page, direction: -1 | 1) {
  const before = Number(await stage(page).getAttribute("data-frame"));
  await waitForDirection(page, direction);
  const after = Number(await stage(page).getAttribute("data-frame"));
  expect(Math.abs(after - before)).toBeLessThanOrEqual(12);
}

async function setSyntheticVisibility(page: Page) {
  await page.evaluate(() => {
    let hidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    (window as typeof window & { __setHidden: (value: boolean) => void }).__setHidden =
      (value) => {
        hidden = value;
        document.dispatchEvent(new Event("visibilitychange"));
      };
  });
}

async function dispatchTouch(
  page: Page,
  type: "touchstart" | "touchend",
  y: number,
) {
  await page.evaluate(({ eventType, clientY }) => {
    const target = document.querySelector(".train-story") ?? document.body;
    const touch = {
      clientX: innerWidth / 2,
      clientY,
      pageX: innerWidth / 2,
      pageY: clientY + scrollY,
      screenX: innerWidth / 2,
      screenY: clientY,
    };
    const event = new Event(eventType, {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperties(event, {
      touches: { value: eventType === "touchstart" ? [touch] : [] },
      targetTouches: { value: eventType === "touchstart" ? [touch] : [] },
      changedTouches: { value: [touch] },
    });
    target.dispatchEvent(event);
  }, { eventType: type, clientY: y });
}

test("native scrolling reaches all six chapters and honors changed destinations in both directions", async ({ page }) => {
  test.setTimeout(150_000);
  await openStory(page);
  await waitForRest(page, 0);

  for (let index = 1; index < chapters.length; index += 1) {
    await scrollToChapter(page, index);
    await waitForRest(page, index);
  }

  for (let index = chapters.length - 2; index >= 0; index -= 1) {
    await scrollToChapter(page, index);
    await waitForRest(page, index);
  }

  await page.evaluate(() => {
    const film = document.querySelector<HTMLElement>(".video-stage")!;
    const samples: Array<{ frame: number; direction: number }> = [];
    new MutationObserver(() => {
      const story = document.querySelector<HTMLElement>(".train-story");
      if (story?.dataset.mode !== "traveling") return;
      samples.push({
        frame: Number(film.dataset.frame),
        direction: Number(film.dataset.direction),
      });
    }).observe(film, { attributes: true, attributeFilter: ["data-frame", "data-direction"] });
    (window as typeof window & {
      __travelSamples: () => Array<{ frame: number; direction: number }>;
    }).__travelSamples = () => samples;
  });

  await scrollToChapter(page, chapters.length - 1);
  await waitForDirection(page, 1);
  await page.waitForFunction(() => Number(document.querySelector<HTMLElement>(".video-stage")?.dataset.frame) > 180);
  await scrollToChapter(page, 0);
  await expectContinuousDirectionChange(page, -1);
  await page.waitForFunction(() => Number(document.querySelector<HTMLElement>(".video-stage")?.dataset.frame) < 170);
  await scrollToChapter(page, 4);
  await expectContinuousDirectionChange(page, 1);
  await page.waitForFunction(() => Number(document.querySelector<HTMLElement>(".video-stage")?.dataset.frame) > 280);
  await scrollToChapter(page, 1);
  await expectContinuousDirectionChange(page, -1);
  await waitForRest(page, 1);

  const samples = await page.evaluate(() => (
    window as typeof window & {
      __travelSamples: () => Array<{ frame: number; direction: number }>;
    }
  ).__travelSamples());
  expect(samples.length).toBeGreaterThan(20);
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (previous.direction !== current.direction) continue;
    const delta = current.frame - previous.frame;
    expect(Math.abs(delta)).toBeLessThanOrEqual(12);
    expect(delta * current.direction).toBeGreaterThanOrEqual(-1);
  }
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
});

test("decoded chapter loops remain inside their frame bounds and use the approved timing", async ({ page }) => {
  test.setTimeout(60_000);
  await openStory(page);
  await waitForRest(page, 0);

  const { samples: firstLoop, changes: directionChanges } = await measureLoopRoundTrips(page, 5);
  expect(Math.min(...firstLoop.map(({ frame }) => frame))).toBeGreaterThanOrEqual(chapters[0].startFrame);
  expect(Math.max(...firstLoop.map(({ frame }) => frame))).toBeLessThanOrEqual(chapters[0].endFrame);
  expect(new Set(firstLoop.map(({ direction }) => direction)).has(-1)).toBe(true);
  expect(new Set(firstLoop.map(({ direction }) => direction)).has(1)).toBe(true);
  expect(firstLoop.some(({ rate }) => Math.abs(rate - 0.5) < 0.02)).toBe(true);
  expect(directionChanges.length).toBe(5);
  const roundTrips = directionChanges.slice(2).map(
    ({ at }, index) => at - directionChanges[index].at,
  );
  await test.info().attach("first-chapter-loop-roundtrip-ms", {
    body: Buffer.from(JSON.stringify(roundTrips)),
    contentType: "application/json",
  });
  console.log(`${test.info().project.name} first-chapter loop roundtrips: ${roundTrips.map(Math.round).join(", ")} ms`);
  for (let index = 2; index < directionChanges.length; index += 1) {
    const roundTripMs = directionChanges[index].at - directionChanges[index - 2].at;
    expect(roundTripMs).toBeGreaterThan(3_400);
    expect(roundTripMs).toBeLessThan(4_700);
  }

  await scrollToChapter(page, 4);
  await waitForRest(page, 4);
  await expect(stage(page)).toHaveAttribute("data-rate", "0.875");
  const slowLoop = await sampleFrames(page, 2_200);
  expect(Math.min(...slowLoop.map(({ frame }) => frame))).toBeGreaterThanOrEqual(chapters[4].startFrame);
  expect(Math.max(...slowLoop.map(({ frame }) => frame))).toBeLessThanOrEqual(chapters[4].endFrame);
  expect(new Set(slowLoop.map(({ direction }) => direction)).has(-1)).toBe(true);
  expect(new Set(slowLoop.map(({ direction }) => direction)).has(1)).toBe(true);
  expect(slowLoop.every(({ rate }) => Math.abs(rate - 0.875) < 0.02)).toBe(true);
});

test("a delayed reverse download keeps the outgoing picture until real decoding recovers", async ({ page }) => {
  test.setTimeout(45_000);
  let releaseReverse!: () => void;
  const reverseGate = new Promise<void>((resolve) => { releaseReverse = resolve; });
  await page.route("**/sdq-train-mobile-wide-reverse.mp4", async (route) => {
    await reverseGate;
    await route.continue();
  });

  await openStory(page);
  await waitForRest(page, 0);
  await scrollToChapter(page, 1);
  await page.waitForFunction(() => Number(document.querySelector<HTMLElement>(".video-stage")?.dataset.frame) > 156);
  await scrollToChapter(page, 0);

  // Native scrolling is processed on a later animation frame; visibility alone
  // does not mean the outgoing movie has stopped for the reverse download.
  await expect(page.locator(".train-story")).toHaveAttribute("data-destination", "0");
  await expect(forwardFilm(page)).toHaveJSProperty("paused", true);
  await expect(forwardFilm(page)).toHaveAttribute("data-active", "true");
  const heldFrame = Number(await stage(page).getAttribute("data-frame"));
  await page.waitForTimeout(650);
  expect(Math.abs(Number(await stage(page).getAttribute("data-frame")) - heldFrame)).toBeLessThanOrEqual(1);

  releaseReverse();
  await waitForDirection(page, -1);
  await waitForRest(page, 0);
});

test("metadata-only reverse needs an explicit decode start and keeps the outgoing picture through retry", async ({ page }) => {
  test.setTimeout(45_000);
  await page.addInitScript(() => {
    const prototype = HTMLMediaElement.prototype;
    const readyStateGetter = Object.getOwnPropertyDescriptor(prototype, "readyState")?.get;
    if (!readyStateGetter) throw new Error("A native media readyState getter is required");
    const originalPlay = prototype.play;
    let allowReverse = false;
    let reverseDecoding = false;
    let rejectedReversePlays = 0;
    let realReversePlays = 0;
    const isReverse = (media: HTMLMediaElement) =>
      media.currentSrc.includes("reverse") || media.getAttribute("src")?.includes("reverse");

    for (const eventName of ["loadeddata", "seeked"]) {
      document.addEventListener(eventName, (event) => {
        if (event.target instanceof HTMLMediaElement &&
            isReverse(event.target) && !reverseDecoding) {
          event.stopImmediatePropagation();
        }
      }, true);
    }
    Object.defineProperty(prototype, "readyState", {
      configurable: true,
      get: function (this: HTMLMediaElement) {
        const nativeState = Number(readyStateGetter.call(this));
        return isReverse(this) && !reverseDecoding
          ? Math.min(nativeState, HTMLMediaElement.HAVE_METADATA)
          : nativeState;
      },
    });
    Object.defineProperty(prototype, "play", {
      configurable: true,
      writable: true,
      value: function (this: HTMLMediaElement) {
        if (!isReverse(this)) return originalPlay.call(this);
        if (!allowReverse) {
          rejectedReversePlays += 1;
          return Promise.reject(new DOMException("Reverse decode blocked for test", "NotAllowedError"));
        }
        realReversePlays += 1;
        reverseDecoding = true;
        const result = originalPlay.call(this);
        void result.then(() => {
          if (!this.seeking &&
              Number(readyStateGetter.call(this)) >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            this.dispatchEvent(new Event("seeked"));
            this.dispatchEvent(new Event("loadeddata"));
          }
        });
        return result;
      },
    });
    (window as typeof window & { __allowReverseDecode: () => void }).__allowReverseDecode = () => {
      allowReverse = true;
    };
    (window as typeof window & {
      __reverseDecodeAttempts: () => { rejected: number; real: number };
    }).__reverseDecodeAttempts = () => ({ rejected: rejectedReversePlays, real: realReversePlays });
  });

  await openStory(page);
  await waitForRest(page, 0);
  await scrollToChapter(page, 1);
  await page.waitForFunction(() => Number(document.querySelector<HTMLElement>(".video-stage")?.dataset.frame) > 156);
  await scrollToChapter(page, 0);

  const retry = page.getByRole("button", { name: "Play film" });
  await expect(retry).toBeVisible();
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & {
      __reverseDecodeAttempts: () => { rejected: number; real: number };
    }
  ).__reverseDecodeAttempts().rejected)).toBeGreaterThan(0);
  await expect(forwardFilm(page)).toHaveAttribute("data-active", "true");
  await expect(reverseFilm(page)).toHaveAttribute("data-active", "false");
  const heldFrame = Number(await stage(page).getAttribute("data-frame"));
  await page.waitForTimeout(500);
  expect(Math.abs(Number(await stage(page).getAttribute("data-frame")) - heldFrame)).toBeLessThanOrEqual(1);

  await page.evaluate(() => (
    window as typeof window & { __allowReverseDecode: () => void }
  ).__allowReverseDecode());
  await retry.click();
  await waitForDirection(page, -1);
  await waitForRest(page, 0);
  expect(await page.evaluate(() => (
    window as typeof window & {
      __reverseDecodeAttempts: () => { rejected: number; real: number };
    }
  ).__reverseDecodeAttempts().real)).toBeGreaterThan(0);
});

test("load and emptied on the active reverse decoder resume from the displayed frame", async ({ page }) => {
  test.setTimeout(45_000);
  await openStory(page);
  await waitForRest(page, 0);
  await scrollToChapter(page, 1);
  await waitForRest(page, 1);
  await scrollToChapter(page, 0);
  await waitForDirection(page, -1);
  await page.waitForFunction(({ lower, upper }) => {
    const frame = Number(document.querySelector<HTMLElement>(".video-stage")?.dataset.frame);
    return frame > lower && frame < upper;
  }, { lower: chapters[0].endFrame, upper: chapters[1].startFrame });
  const beforeLoad = Number(await stage(page).getAttribute("data-frame"));

  await reverseFilm(page).evaluate((video: HTMLVideoElement) => video.load());
  await page.waitForFunction((minimum) => {
    const film = document.querySelector<HTMLElement>(".video-stage");
    return Number(film?.dataset.frame) <= minimum && film?.dataset.direction === "-1";
  }, beforeLoad);
  await waitForRest(page, 0);
});

test("visibility suspension near frame 720 resumes the wrap and a fresh opening pull remains allowed", async ({ page }) => {
  test.setTimeout(65_000);
  await openStory(page);
  await setSyntheticVisibility(page);
  await waitForRest(page, 0);
  const stableStops = await page.locator(".mobile-story-stop").evaluateAll((stops) => ({
    count: stops.length,
    heights: stops.map((stop) => stop.getBoundingClientRect().height),
    snapType: getComputedStyle(document.documentElement).scrollSnapType,
    snapAlignments: stops.map((stop) => getComputedStyle(stop).scrollSnapAlign),
  }));
  expect(stableStops.count).toBe(chapters.length);
  expect(stableStops.snapType).toMatch(/^y(?: proximity)?$/);
  expect(stableStops.snapAlignments).toEqual(chapters.map(() => "start"));
  await scrollToChapter(page, chapters.length - 1);
  await waitForRest(page, chapters.length - 1);
  await page.waitForTimeout(250);

  await dispatchTouch(page, "touchstart", 700);
  await expect(page.locator("html")).toHaveAttribute("data-train-refresh", "blocked");
  await dispatchTouch(page, "touchend", 620);
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".train-story")?.dataset.mode === "wrap-departure");
  await expect(page.locator("html")).toHaveAttribute("data-train-wrap", "true");
  await expect.poll(() => page.evaluate(() => ({
    snapType: getComputedStyle(document.documentElement).scrollSnapType,
    snapAlignments: [...document.querySelectorAll(".mobile-story-stop")].map(
      (stop) => getComputedStyle(stop).scrollSnapAlign,
    ),
  }))).toEqual({ snapType: "none", snapAlignments: chapters.map(() => "none") });
  await page.waitForFunction(
    (minimum) => Number(document.querySelector<HTMLElement>(".video-stage")?.dataset.frame) >= minimum,
    LAST_FRAME - 30,
  );

  await page.evaluate(() => (window as typeof window & { __setHidden: (value: boolean) => void }).__setHidden(true));
  await expect.poll(() => page.locator("video").evaluateAll(
    (videos) => videos.every((video) => (video as HTMLVideoElement).paused),
  )).toBe(true);
  const suspendedFrame = Number(await stage(page).getAttribute("data-frame"));
  await page.waitForTimeout(500);
  expect(Math.abs(Number(await stage(page).getAttribute("data-frame")) - suspendedFrame)).toBeLessThanOrEqual(1);

  await page.evaluate(() => (window as typeof window & { __setHidden: (value: boolean) => void }).__setHidden(false));
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".train-story")?.dataset.mode === "wrap-arrival");
  await expect(page.locator("html")).toHaveAttribute("data-train-wrap", "true");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
  await waitForRest(page, 0);
  expect(Number(await stage(page).getAttribute("data-frame"))).toBeGreaterThanOrEqual(chapters[0].startFrame);
  expect(Number(await stage(page).getAttribute("data-frame"))).toBeLessThanOrEqual(chapters[0].endFrame);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-train-wrap", "true");
  const restoredStops = await page.locator(".mobile-story-stop").evaluateAll((stops) => ({
    count: stops.length,
    heights: stops.map((stop) => stop.getBoundingClientRect().height),
    snapType: getComputedStyle(document.documentElement).scrollSnapType,
    snapAlignments: stops.map((stop) => getComputedStyle(stop).scrollSnapAlign),
  }));
  expect(restoredStops).toEqual(stableStops);
  const settledPositions = await page.evaluate(async () => {
    const positions: number[] = [];
    const started = performance.now();
    while (performance.now() - started < 1_000) {
      positions.push(scrollY);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return positions;
  });
  expect(settledPositions.every((position) => Math.abs(position) <= 1)).toBe(true);

  await dispatchTouch(page, "touchstart", 120);
  await expect(page.locator("html")).toHaveAttribute("data-train-refresh", "ready");
  await dispatchTouch(page, "touchend", 190);
});

test("synchronous invalidation during reverse publication pauses both layers and resumes cleanly", async ({ page }) => {
  test.setTimeout(35_000);
  await openStory(page);
  await waitForRest(page, 0);

  await page.evaluate(() => {
    let hidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    let fired = false;
    let bothPaused = false;
    CanvasRenderingContext2D.prototype.drawImage = function (
      this: CanvasRenderingContext2D,
      ...args: Parameters<CanvasRenderingContext2D["drawImage"]>
    ) {
      const film = document.querySelector<HTMLElement>(".video-stage");
      const frame = Number(film?.dataset.frame);
      if (!fired && film?.dataset.direction === "-1" && frame >= 128 && frame <= 132) {
        fired = true;
        hidden = true;
        document.dispatchEvent(new Event("visibilitychange"));
        bothPaused = [...document.querySelectorAll("video")].every((video) => video.paused);
      }
      return Reflect.apply(originalDrawImage, this, args);
    } as CanvasRenderingContext2D["drawImage"];
    (window as typeof window & {
      __publicationInvalidation: () => { fired: boolean; bothPaused: boolean };
      __resumeAfterInvalidation: () => void;
    }).__publicationInvalidation = () => ({ fired, bothPaused });
    (window as typeof window & { __resumeAfterInvalidation: () => void }).__resumeAfterInvalidation = () => {
      hidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    };
  });

  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __publicationInvalidation: () => { fired: boolean; bothPaused: boolean } }
  ).__publicationInvalidation())).toEqual({ fired: true, bothPaused: true });
  await page.evaluate(() => (
    window as typeof window & { __resumeAfterInvalidation: () => void }
  ).__resumeAfterInvalidation());
  await waitForDirection(page, 1);
  await waitForRest(page, 0);
});

test("the boundary watchdog and incoming fallback recover when final frame callbacks disappear", async ({ page }) => {
  test.setTimeout(45_000);
  await openStory(page);
  await waitForRest(page, 0);

  await page.evaluate(({ lastFrame, boundary }) => {
    const prototype = HTMLVideoElement.prototype;
    const original = prototype.requestVideoFrameCallback;
    if (typeof original !== "function") return;
    prototype.requestVideoFrameCallback = function (callback) {
      return original.call(this, (now, metadata) => {
        const sourceFrame = this.currentSrc.includes("reverse")
          ? lastFrame - metadata.mediaTime * 24
          : metadata.mediaTime * 24;
        if (sourceFrame >= boundary - 3) return;
        callback(now, metadata);
      });
    };
  }, { lastFrame: LAST_FRAME, boundary: chapters[1].startFrame });

  await scrollToChapter(page, 1);
  await waitForRest(page, 1);
  expect(Number(await stage(page).getAttribute("data-frame"))).toBeGreaterThanOrEqual(chapters[1].startFrame);
  expect(Number(await stage(page).getAttribute("data-frame"))).toBeLessThanOrEqual(chapters[1].endFrame);
});

test("metadata-only startup exposes a blocked-play retry and the tap starts real decoding", async ({ page }) => {
  await page.addInitScript(() => {
    const readyStateGetter = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      "readyState",
    )?.get;
    if (!readyStateGetter) throw new Error("A native media readyState getter is required");
    const originalPlay = HTMLMediaElement.prototype.play;
    let allowPlay = false;
    let decodingEnabled = false;
    let rejectedPlays = 0;
    let realPlays = 0;
    document.addEventListener("loadeddata", (event) => {
      if (!decodingEnabled) event.stopImmediatePropagation();
    }, true);
    Object.defineProperty(HTMLMediaElement.prototype, "readyState", {
      configurable: true,
      get: function (this: HTMLMediaElement) {
        const nativeState = Number(readyStateGetter.call(this));
        return decodingEnabled ? nativeState : Math.min(nativeState, HTMLMediaElement.HAVE_METADATA);
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      writable: true,
      value: function (this: HTMLMediaElement) {
        if (!allowPlay) {
          rejectedPlays += 1;
          return Promise.reject(new DOMException("Autoplay blocked for test", "NotAllowedError"));
        }
        realPlays += 1;
        decodingEnabled = true;
        const result = originalPlay.call(this);
        void result.then(() => {
          if (Number(readyStateGetter.call(this)) >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            this.dispatchEvent(new Event("loadeddata"));
          }
        });
        return result;
      },
    });
    (window as typeof window & { __allowFilmPlayback: () => void }).__allowFilmPlayback = () => {
      allowPlay = true;
    };
    (window as typeof window & {
      __startupPlayAttempts: () => { rejected: number; real: number };
    }).__startupPlayAttempts = () => ({ rejected: rejectedPlays, real: realPlays });
  });

  await openStory(page);
  const retry = page.getByRole("button", { name: "Play film" });
  await expect(retry).toBeVisible();
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & {
      __startupPlayAttempts: () => { rejected: number; real: number };
    }
  ).__startupPlayAttempts().rejected)).toBeGreaterThan(0);
  await page.evaluate(() => (
    window as typeof window & { __allowFilmPlayback: () => void }
  ).__allowFilmPlayback());
  await retry.click();
  await expect(retry).toHaveCount(0);
  await waitForRest(page, 0);
  expect(await page.evaluate(() => (
    window as typeof window & {
      __startupPlayAttempts: () => { rejected: number; real: number };
    }
  ).__startupPlayAttempts().real)).toBeGreaterThan(0);
});
