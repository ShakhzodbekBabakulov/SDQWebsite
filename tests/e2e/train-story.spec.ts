import { expect, test, type Page } from "@playwright/test";
import { INPUT_IDLE_MS } from "../../src/components/train-story/timeline.ts";

const previewUrl = process.env.SDQ_PREVIEW_URL || "http://127.0.0.1:3000";

const chapterAnnouncement = (page: Page) =>
  page.locator('p[aria-live="polite"]');

const observedErrors = new WeakMap<Page, string[]>();

function observeBrowserErrors(page: Page) {
  const errors: string[] = [];
  observedErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "languages", {
      configurable: true,
      get: () => ["uz-Latn"],
    });
  });
  observeBrowserErrors(page);
});

test.afterEach(async ({ page }) => {
  expect(observedErrors.get(page) ?? []).toEqual([]);
});

async function waitForVisibleChapterFrame(
  page: Page,
  minimumFrame: number,
  maximumFrame: number,
) {
  await page.waitForFunction(
    ({ minimum, maximum }: { minimum: number; maximum: number }) => {
      const videos = [...document.querySelectorAll("video")];
      const visible = videos.filter(
        (video) => getComputedStyle(video).opacity === "1",
      );
      if (visible.length !== 1) return false;
      // The native clock can reach a chapter before its arrival is displayed.
      const frame = Number(document.querySelector(".video-stage")?.getAttribute("data-frame"));
      return frame >= minimum && frame <= maximum;
    },
    { minimum: minimumFrame, maximum: maximumFrame },
  );
}

async function waitForStageFrame(
  page: Page,
  minimumFrame: number,
  maximumFrame: number,
) {
  await page.waitForFunction(
    ({ minimum, maximum }: { minimum: number; maximum: number }) => {
      const stage = document.querySelector(".video-stage");
      const frame = Number(stage?.getAttribute("data-frame"));
      return frame >= minimum && frame <= maximum;
    },
    { minimum: minimumFrame, maximum: maximumFrame },
  );
}

async function observeGreetingFadeEndpoint(page: Page) {
  const observation = await page.waitForFunction(() => {
    const stage = document.querySelector(".video-stage");
    const greeting = document.querySelector(".opening-greeting");
    if (!stage || !greeting) return false;
    const frame = Number(stage.getAttribute("data-frame"));
    if (frame < 96 || frame > 107) return false;
    return {
      frame,
      opacity: Number.parseFloat(getComputedStyle(greeting).opacity),
    };
  });
  return (await observation.jsonValue()) as {
    frame: number;
    opacity: number;
  };
}

async function travelForwardOneChapter(
  page: Page,
  minimumFrame: number,
  maximumFrame: number,
) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("A desktop viewport is required");
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.mouse.wheel(0, 80);
  await waitForVisibleChapterFrame(page, minimumFrame, maximumFrame);
  await expect(page.locator(".scene-caption")).toBeVisible();
}

async function chooseLanguage(page: Page, label: "UZ" | "ЎЗ" | "RU" | "EN") {
  const current = page.locator(".language-switcher__current");
  if ((await current.textContent())?.trim() === label) return;
  await current.click();
  await page
    .locator(".language-switcher__options")
    .getByRole("button", { name: label, exact: true })
    .click();
}

test("scene one shows the Uzbek Latin caption after the SDQ carriage settles", async ({
  page,
}) => {
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);

  await expect(
    page.getByRole("heading", {
      name: "Biznesingizni oldinga siljitamiz.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Avval tashkilotingiz qanday ishlashini o‘rganamiz, so‘ng ishni samaraliroq qiladigan amaliy yechimlarni joriy etamiz.",
    ),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "uz-Latn");
});

test("the opening greeting appears only during the first arrival and fades before rest", async ({
  page,
}) => {
  test.setTimeout(30_000);
  await page.goto("/");
  const greeting = page.getByText("Assalomu Aleykum", { exact: true });
  await expect(greeting).toBeVisible();

  await waitForVisibleChapterFrame(page, 84, 89);
  await expect(greeting).toBeVisible();
  const fadeEndpoint = await observeGreetingFadeEndpoint(page);
  expect(fadeEndpoint.frame).toBeGreaterThanOrEqual(96);
  expect(fadeEndpoint.frame).toBeLessThanOrEqual(107);
  expect(fadeEndpoint.opacity).toBe(0);
  await waitForVisibleChapterFrame(page, 108, 132);
  await expect(greeting).toHaveCount(0);
});

test("the opening greeting dominates the clear upper space and fades gradually", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const greeting = page.getByText("Assalomu Aleykum", { exact: true });
  await expect(greeting).toBeVisible();
  await expect(greeting).toHaveCSS("opacity", "1");

  const layout = await greeting.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const frame = element.parentElement!.getBoundingClientRect();
    return {
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      widthRatio: bounds.width / frame.width,
      top: bounds.top,
      bottom: bounds.bottom,
      filmTop: frame.top,
      trainRoofLine: frame.top + frame.height * 0.29,
    };
  });
  expect(layout.fontSize).toBeGreaterThanOrEqual(72);
  expect(layout.widthRatio).toBeGreaterThanOrEqual(0.8);
  expect(layout.top).toBeGreaterThanOrEqual(layout.filmTop);
  expect(layout.bottom).toBeLessThanOrEqual(layout.trainRoofLine);

  await page.evaluate(() => {
    const samples: Array<{ frame: number; opacity: number }> = [];
    (
      window as typeof window & {
        __greetingFadeSamples: Array<{ frame: number; opacity: number }>;
      }
    ).__greetingFadeSamples = samples;
    const sample = () => {
      const stage = document.querySelector(".video-stage");
      const message = document.querySelector(".opening-greeting");
      const frame = Number(stage?.getAttribute("data-frame"));
      if (message && frame >= 84 && frame <= 95.5) {
        samples.push({
          frame,
          opacity: Number.parseFloat(getComputedStyle(message).opacity),
        });
      }
      if (frame < 96) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  const fadeEndpoint = await observeGreetingFadeEndpoint(page);
  const samples = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __greetingFadeSamples: Array<{ frame: number; opacity: number }>;
        }
      ).__greetingFadeSamples,
  );
  const opacities = samples.map((sample) => sample.opacity);
  expect(opacities.some((opacity) => opacity > 0 && opacity < 1)).toBe(true);
  expect(fadeEndpoint.frame).toBeGreaterThanOrEqual(96);
  expect(fadeEndpoint.frame).toBeLessThanOrEqual(107);
  expect(fadeEndpoint.opacity).toBe(0);
});

test("the opening greeting stays above the train in short desktop films", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1920, height: 540 },
    { width: 1366, height: 400 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const greeting = page.getByText("Assalomu Aleykum", { exact: true });
    await expect(greeting).toBeVisible();

    const layout = await greeting.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const frame = element.parentElement!.getBoundingClientRect();
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
      const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
      return {
        bottom: bounds.bottom,
        filmHeight: frame.height,
        fontSize,
        left: bounds.left,
        lineCount: bounds.height / lineHeight,
        right: bounds.right,
        filmLeft: frame.left,
        filmRight: frame.right,
        trainRoofLine: frame.top + frame.height * 0.29,
      };
    });

    expect(layout.lineCount).toBeLessThan(1.25);
    expect(layout.bottom).toBeLessThanOrEqual(layout.trainRoofLine);
    expect(layout.fontSize).toBeGreaterThanOrEqual(layout.filmHeight * 0.09);
    expect(layout.left).toBeGreaterThanOrEqual(layout.filmLeft);
    expect(layout.right).toBeLessThanOrEqual(layout.filmRight);
  }
});

test("skipping the first arrival cannot revive the greeting during a later wrap", async ({
  page,
}) => {
  test.setTimeout(30_000);
  await page.goto("/");
  const greeting = page.getByText("Assalomu Aleykum", { exact: true });
  await expect(greeting).toBeVisible();

  await page.keyboard.press("End");
  await expect(chapterAnnouncement(page)).toHaveText("Let’s Talk");
  await expect(greeting).toHaveCount(0);

  await page.waitForTimeout(1_000);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(500);
  await page.keyboard.press("ArrowDown");
  await waitForStageFrame(page, 0, 72);
  await expect(greeting).toHaveCount(0);
});

test("Home during the first arrival permanently disarms the greeting", async ({
  page,
}) => {
  test.setTimeout(30_000);
  await page.goto("/");
  const greeting = page.getByText("Assalomu Aleykum", { exact: true });
  await expect(greeting).toBeVisible();

  await page.keyboard.press("Home");
  await expect(chapterAnnouncement(page)).toHaveText("SDQ consulting");
  await expect(greeting).toHaveCount(0);

  await page.waitForTimeout(1_000);
  await page.keyboard.press("End");
  await expect(chapterAnnouncement(page)).toHaveText("Let’s Talk");
  await expect(page.locator(".video-stage")).toHaveAttribute(
    "data-frame",
    "624",
  );
  await expect(greeting).toHaveCount(0);

  await page.waitForTimeout(1_000);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(500);
  await page.keyboard.press("ArrowDown");
  await waitForStageFrame(page, 0, 72);
  await expect(greeting).toHaveCount(0);
});

test("the browser language selects the initial locale after hydration", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: "ru-RU",
  });
  const page = await context.newPage();
  const errors = observeBrowserErrors(page);

  await page.goto(previewUrl);
  await expect(page.locator(".language-switcher__current")).toHaveText("RU");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await waitForVisibleChapterFrame(page, 108, 132);
  await expect(
    page.getByRole("heading", { name: "Помогаем бизнесу двигаться вперёд." }),
  ).toBeVisible();

  expect(errors).toEqual([]);
  await context.close();
});

test("the compact language control reveals options and closes after selection, Escape, or focus leaves", async ({
  page,
}) => {
  await page.goto("/");
  const current = page.locator(".language-switcher__current");
  const options = page.locator(".language-switcher__options");

  await expect(current).toHaveText("UZ");
  await expect(page.locator(".language-switcher button:visible")).toHaveCount(1);
  await expect(options).toHaveCount(0);

  await current.hover();
  await expect(options).toBeVisible();
  await expect(options.getByRole("button")).toHaveCount(4);
  await page.mouse.move(0, 0);
  await expect(options).toHaveCount(0);

  await current.click();
  await options.getByRole("button", { name: "RU", exact: true }).click();
  await expect(current).toHaveText("RU");
  await expect(options).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");

  await current.evaluate((button) => (button as HTMLButtonElement).blur());
  await current.focus();
  await expect(options).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(options).toHaveCount(0);

  await current.evaluate((button) => (button as HTMLButtonElement).blur());
  await current.focus();
  await options.getByRole("button", { name: "EN", exact: true }).focus();
  await page.evaluate(() => {
    const outside = document.createElement("button");
    outside.dataset.testFocusOutside = "true";
    document.body.append(outside);
    outside.focus();
  });
  await expect(options).toHaveCount(0);
  await page.locator('[data-test-focus-outside="true"]').evaluate((outside) =>
    outside.remove(),
  );
});

test("closing from a focused language option restores focus to the current language", async ({
  page,
}) => {
  await page.goto("/");
  const current = page.locator(".language-switcher__current");
  const options = page.locator(".language-switcher__options");

  await current.focus();
  await options.getByRole("button", { name: "RU", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(options).toHaveCount(0);
  await expect(current).toBeFocused();

  await current.click();
  await options.getByRole("button", { name: "EN", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(current).toHaveText("EN");
  await expect(options).toHaveCount(0);
  await expect(current).toBeFocused();
});

test("Escape on a closed language trigger cannot steal focus after a later focus-out", async ({
  page,
}) => {
  await page.goto("/");
  const current = page.locator(".language-switcher__current");
  const options = page.locator(".language-switcher__options");

  await current.focus();
  await options.getByRole("button", { name: "RU", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(options).toHaveCount(0);
  await expect(current).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(options).toHaveCount(0);
  await current.click();
  await options.getByRole("button", { name: "EN", exact: true }).focus();

  await page.evaluate(() => {
    const outside = document.createElement("button");
    outside.dataset.testFocusAfterClosedEscape = "true";
    outside.textContent = "Outside language control";
    document.body.append(outside);
    outside.focus();
  });
  const outside = page.locator('[data-test-focus-after-closed-escape="true"]');
  await expect(options).toHaveCount(0);
  await expect(outside).toBeFocused();
  await outside.evaluate((element) => element.remove());
});

test("the language selector stays plain text when idle and unfolded", async ({
  page,
}) => {
  await page.goto("/");
  const control = page.locator(".language-switcher__control");
  const current = page.locator(".language-switcher__current");

  const idleStyle = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      border: style.borderWidth,
      shadow: style.boxShadow,
    };
  });
  expect(idleStyle).toEqual({
    background: "rgba(0, 0, 0, 0)",
    border: "0px",
    shadow: "none",
  });

  await current.click();
  const unfoldedStyle = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      border: style.borderWidth,
      shadow: style.boxShadow,
      backdrop: style.backdropFilter,
    };
  });
  expect(unfoldedStyle).toEqual({
    background: "rgba(0, 0, 0, 0)",
    border: "0px",
    shadow: "none",
    backdrop: "none",
  });

  const optionStyles = await page
    .locator(".language-switcher__options button")
    .evaluateAll((buttons) =>
      buttons.map((button) => {
        const style = getComputedStyle(button);
        return {
          background: style.backgroundColor,
          border: style.borderWidth,
          shadow: style.boxShadow,
        };
      }),
    );
  expect(optionStyles).toEqual(
    Array.from({ length: 4 }, () => ({
      background: "rgba(0, 0, 0, 0)",
      border: "0px",
      shadow: "none",
    })),
  );
});

test("the compact language control stays in the film's top-right corner", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 2560, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const layout = await page
      .locator(".language-switcher__control")
      .evaluate((control) => {
        const bounds = control.getBoundingClientRect();
        const filmWidth = Math.min(innerWidth, (innerHeight * 16) / 9);
        const filmHeight = Math.min(innerHeight, (innerWidth * 9) / 16);
        return {
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          bottom: bounds.bottom,
          filmLeft: (innerWidth - filmWidth) / 2,
          filmRight: (innerWidth + filmWidth) / 2,
          filmTop: (innerHeight - filmHeight) / 2,
          filmBottom: (innerHeight + filmHeight) / 2,
        };
      });

    expect(layout.left).toBeGreaterThanOrEqual(layout.filmLeft);
    expect(layout.right).toBeLessThanOrEqual(layout.filmRight);
    expect(layout.top).toBeGreaterThanOrEqual(layout.filmTop);
    expect(layout.bottom).toBeLessThanOrEqual(layout.filmBottom);
  }
});

test("desktop ambience paints the current frame and extends tall and ultrawide margins", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 720, axis: "none" },
    { width: 1440, height: 900, axis: "vertical" },
    { width: 2560, height: 1080, axis: "horizontal" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await waitForVisibleChapterFrame(page, 24, 132);
    await page.waitForFunction(
      (axis) =>
        document.querySelector(".video-stage__ambient-canvas")?.getAttribute("data-painted") ===
          "true" &&
        document.querySelector(".video-stage__edge-canvas")?.getAttribute("data-axis") ===
          axis,
      viewport.axis,
    );
    await expect
      .poll(() =>
        page.locator(".video-stage").evaluate((stage) => {
          const ambient = stage.querySelector(
            ".video-stage__ambient-canvas",
          ) as HTMLCanvasElement;
          const activeVideo = [...stage.querySelectorAll("video")].find(
            (video) => getComputedStyle(video).opacity === "1",
          ) as HTMLVideoElement;
          const direction = activeVideo.currentSrc.includes("reverse") ? -1 : 1;
          const activeFrame = Math.round(
            direction === 1
              ? activeVideo.currentTime * 24
              : 720 - activeVideo.currentTime * 24,
          );
          return Math.abs(Number(ambient.dataset.frame) - activeFrame);
        }),
      )
      .toBeLessThanOrEqual(6);

    const presentation = await page.locator(".video-stage").evaluate((stage) => {
      const ambient = stage.querySelector(
        ".video-stage__ambient-canvas",
      ) as HTMLCanvasElement;
      const edge = stage.querySelector(
        ".video-stage__edge-canvas",
      ) as HTMLCanvasElement;
      const activeVideo = [...stage.querySelectorAll("video")].find(
        (video) => getComputedStyle(video).opacity === "1",
      ) as HTMLVideoElement;
      const ambientBounds = ambient.getBoundingClientRect();
      return {
        stageFrame: Number(stage.getAttribute("data-frame")),
        ambientFrame: Number(ambient.dataset.frame),
        ambientCoversViewport:
          ambientBounds.left < 0 &&
          ambientBounds.top < 0 &&
          ambientBounds.right > innerWidth &&
          ambientBounds.bottom > innerHeight,
        edgeWidth: edge.width,
        edgeHeight: edge.height,
        objectFit: getComputedStyle(activeVideo).objectFit,
      };
    });

    expect(Math.abs(presentation.ambientFrame - presentation.stageFrame)).toBeLessThanOrEqual(2);
    expect(presentation.ambientCoversViewport).toBe(true);
    expect(presentation.edgeWidth).toBeLessThanOrEqual(2560);
    expect(presentation.edgeHeight).toBeLessThanOrEqual(1440);
    expect(presentation.objectFit).toBe("contain");
  }
});

test("a late poster load cannot replace the active paused video frame", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const ambient = page.locator(".video-stage__ambient-canvas");
  await expect(page.locator(".video-stage")).toHaveAttribute("data-frame", "120");
  await expect(ambient).toHaveAttribute("data-frame", "120");
  await expect(ambient).toHaveAttribute("data-direction", "1");

  await page
    .locator(".video-stage__ambient-poster")
    .dispatchEvent("load");

  await expect(ambient).toHaveAttribute("data-frame", "120");
  await expect(ambient).toHaveAttribute("data-direction", "1");
});

test("a transient mirrored-edge failure restores clean canvas state on recovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    const canvasPrototype = CanvasRenderingContext2D.prototype as unknown as {
      drawImage: (
        image: CanvasImageSource,
        dx: number,
        dy: number,
        ...rest: number[]
      ) => void;
    };
    const drawImage = canvasPrototype.drawImage;
    const state = { thrown: false };
    (
      globalThis as typeof globalThis & {
        __edgeTransientFailure: typeof state;
      }
    ).__edgeTransientFailure = state;
    canvasPrototype.drawImage = function (
      this: CanvasRenderingContext2D,
      image,
      dx,
      dy,
      ...rest
    ) {
      const isEdge = this.canvas.classList.contains(
        "video-stage__edge-canvas",
      );
      if (isEdge && !state.thrown) {
        state.thrown = true;
        throw new Error("forced one-time edge paint failure");
      }
      return Reflect.apply(drawImage, this, [image, dx, dy, ...rest]);
    };
  });

  await page.goto("/");
  const edge = page.locator(".video-stage__edge-canvas");
  await page.waitForFunction(
    () =>
      (
        globalThis as typeof globalThis & {
          __edgeTransientFailure?: {
            thrown: boolean;
          };
        }
      ).__edgeTransientFailure?.thrown === true,
  );
  await expect(edge).toHaveAttribute("data-painted", "true");
  await expect(edge).toHaveAttribute("data-axis", "vertical");
  await expect(edge).toHaveAttribute("data-direction", "1");
  await expect(edge).toBeVisible();

  const recovery = await page.locator(".video-stage").evaluate((stage) => {
    const edgeCanvas = stage.querySelector(
      ".video-stage__edge-canvas",
    ) as HTMLCanvasElement;
    const transform = edgeCanvas.getContext("2d")!.getTransform();
    return {
      stageFrame: Number(stage.getAttribute("data-frame")),
      edgeFrame: Number(edgeCanvas.dataset.frame),
      transform: [
        transform.a,
        transform.b,
        transform.c,
        transform.d,
        transform.e,
        transform.f,
      ],
      activeVideos: [...stage.querySelectorAll("video")].filter(
        (video) => getComputedStyle(video).opacity === "1",
      ).length,
    };
  });

  expect(Math.abs(recovery.edgeFrame - recovery.stageFrame)).toBeLessThanOrEqual(
    2,
  );
  expect(recovery.transform).toEqual([1, 0, 0, 1, 0, 0]);
  expect(recovery.activeVideos).toBe(1);
});

test("canvas painting failure falls back to the ambient poster without stopping the film", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const canvasPrototype = CanvasRenderingContext2D.prototype as unknown as {
      drawImage: (
        image: CanvasImageSource,
        dx: number,
        dy: number,
        ...rest: number[]
      ) => void;
    };
    const drawImage = canvasPrototype.drawImage;
    (
      globalThis as typeof globalThis & { __ambientDrawCalls: number }
    ).__ambientDrawCalls = 0;
    canvasPrototype.drawImage = function (
      this: CanvasRenderingContext2D,
      image,
      dx,
      dy,
      ...rest
    ) {
      if (this.canvas.classList.contains("video-stage__ambient-canvas")) {
        (
          globalThis as typeof globalThis & { __ambientDrawCalls: number }
        ).__ambientDrawCalls += 1;
        if (
          (
            globalThis as typeof globalThis & { __ambientDrawCalls: number }
          ).__ambientDrawCalls > 1
        ) {
          throw new Error("forced ambient paint failure");
        }
      }
      return Reflect.apply(drawImage, this, [image, dx, dy, ...rest]);
    };
  });

  await page.goto("/");
  await page.waitForFunction(
    () =>
      (
        globalThis as typeof globalThis & { __ambientDrawCalls?: number }
      ).__ambientDrawCalls! > 1,
  );
  const firstFrame = await page
    .locator(".video-stage")
    .getAttribute("data-frame");
  await page.waitForTimeout(350);

  await expect(page.locator(".video-stage__ambient-canvas")).toHaveAttribute(
    "data-painted",
    "false",
  );
  await expect(page.locator(".video-stage__ambient-canvas")).toBeHidden();
  await expect(page.locator(".video-stage__ambient-poster")).toBeVisible();
  expect(
    await page.locator("video").evaluateAll(
      (videos) =>
        videos.filter((video) => getComputedStyle(video).opacity === "1").length,
    ),
  ).toBe(1);
  expect(await page.locator(".video-stage").getAttribute("data-frame")).not.toBe(
    firstFrame,
  );
});

test("canvas context loss keeps the foreground film running", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(
    () =>
      document.querySelector(".video-stage__ambient-canvas")?.getAttribute("data-painted") ===
      "true",
  );
  const firstFrame = await page
    .locator(".video-stage")
    .getAttribute("data-frame");

  await page.locator(".video-stage__ambient-canvas").dispatchEvent("contextlost");
  await expect(page.locator(".video-stage__ambient-canvas")).toHaveAttribute(
    "data-painted",
    "false",
  );
  await expect(page.locator(".video-stage__ambient-poster")).toBeVisible();
  await page.waitForTimeout(350);
  expect(await page.locator(".video-stage").getAttribute("data-frame")).not.toBe(
    firstFrame,
  );
});

test("scene one keeps its captions inside the film on a taller desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);
  await expect(page.locator(".scene-caption")).toBeVisible();

  const layout = await page.locator(".scene-caption").evaluate((caption) => {
    const heading = caption.querySelector("h2") as HTMLElement;
    const body = caption.querySelector("p") as HTMLElement;
    const headingBounds = heading.getBoundingClientRect();
    const bodyBounds = body.getBoundingClientRect();
    const headingLineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight);
    const filmAspectRatio = 16 / 9;
    const filmWidth = Math.min(innerWidth, innerHeight * filmAspectRatio);
    const filmHeight = Math.min(innerHeight, innerWidth / filmAspectRatio);
    return {
      headingCenter: headingBounds.left + headingBounds.width / 2,
      headingTop: headingBounds.top,
      headingRight: headingBounds.right,
      headingLeft: headingBounds.left,
      headingTopRatio: headingBounds.top / innerHeight,
      headingLineCount: headingBounds.height / headingLineHeight,
      bodyCenter: bodyBounds.left + bodyBounds.width / 2,
      bodyLeft: bodyBounds.left,
      bodyRight: bodyBounds.right,
      bodyTopRatio: bodyBounds.top / innerHeight,
      bodyBottom: bodyBounds.bottom,
      filmTop: (innerHeight - filmHeight) / 2,
      filmBottom: (innerHeight + filmHeight) / 2,
      filmLeft: (innerWidth - filmWidth) / 2,
      filmRight: (innerWidth + filmWidth) / 2,
      viewportWidth: innerWidth,
    };
  });

  expect(Math.abs(layout.headingCenter - layout.viewportWidth / 2)).toBeLessThan(2);
  expect(layout.headingTopRatio).toBeLessThan(0.14);
  expect(layout.headingLineCount).toBeLessThan(1.25);
  expect(Math.abs(layout.bodyCenter - layout.viewportWidth / 2)).toBeLessThan(2);
  expect(layout.bodyTopRatio).toBeGreaterThan(0.82);
  expect(layout.headingTop).toBeGreaterThanOrEqual(layout.filmTop);
  expect(layout.headingLeft).toBeGreaterThanOrEqual(layout.filmLeft);
  expect(layout.headingRight).toBeLessThanOrEqual(layout.filmRight);
  expect(layout.bodyLeft).toBeGreaterThanOrEqual(layout.filmLeft);
  expect(layout.bodyRight).toBeLessThanOrEqual(layout.filmRight);
  expect(layout.bodyBottom).toBeLessThanOrEqual(layout.filmBottom);
});

test("the Partners wording stays at the top and bottom in every language", async ({
  page,
}) => {
  test.setTimeout(35_000);
  await page.setViewportSize({ width: 768, height: 768 });
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);
  await travelForwardOneChapter(page, 228, 258);
  await travelForwardOneChapter(page, 324, 354);

  for (const language of ["UZ", "ЎЗ", "RU", "EN"] as const) {
    await chooseLanguage(page, language);
    const layout = await page.locator(".scene-caption").evaluate((caption) => {
      const heading = caption.querySelector("h2") as HTMLElement;
      const body = caption.querySelector("p") as HTMLElement;
      const headingBounds = heading.getBoundingClientRect();
      const bodyBounds = body.getBoundingClientRect();
      const filmBounds = caption.getBoundingClientRect();
      return {
        filmCenter: filmBounds.left + filmBounds.width / 2,
        headingCenter: headingBounds.left + headingBounds.width / 2,
        headingCenterY: headingBounds.top + headingBounds.height / 2,
        headingLeft: headingBounds.left,
        headingRight: headingBounds.right,
        headingFits: heading.scrollWidth <= heading.clientWidth + 1,
        headingWhiteSpace: getComputedStyle(heading).whiteSpace,
        bodyCenter: bodyBounds.left + bodyBounds.width / 2,
        bodyCenterY: bodyBounds.top + bodyBounds.height / 2,
        bodyLeft: bodyBounds.left,
        bodyRight: bodyBounds.right,
        bodyFits: body.scrollWidth <= body.clientWidth + 1,
        filmTop: filmBounds.top,
        filmBottom: filmBounds.bottom,
        filmLeft: filmBounds.left,
        filmRight: filmBounds.right,
        upperBoundary: filmBounds.top + filmBounds.height * 0.25,
        lowerBoundary: filmBounds.bottom - filmBounds.height * 0.25,
      };
    });

    expect(Math.abs(layout.headingCenter - layout.filmCenter)).toBeLessThan(2);
    expect(Math.abs(layout.bodyCenter - layout.filmCenter)).toBeLessThan(2);
    expect(layout.headingCenterY).toBeGreaterThanOrEqual(layout.filmTop);
    expect(layout.headingCenterY).toBeLessThan(layout.upperBoundary);
    expect(layout.bodyCenterY).toBeGreaterThan(layout.lowerBoundary);
    expect(layout.bodyCenterY).toBeLessThanOrEqual(layout.filmBottom);
    expect(layout.headingLeft).toBeGreaterThanOrEqual(layout.filmLeft);
    expect(layout.headingRight).toBeLessThanOrEqual(layout.filmRight);
    expect(layout.bodyLeft).toBeGreaterThanOrEqual(layout.filmLeft);
    expect(layout.bodyRight).toBeLessThanOrEqual(layout.filmRight);
    expect(layout.headingFits).toBe(true);
    expect(layout.bodyFits).toBe(true);
    expect(layout.headingWhiteSpace).toBe("normal");
  }
});

test("scene one captions use the film without an artificial fog layer", async ({
  page,
}) => {
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);

  const fog = await page.locator(".scene-caption").evaluate((caption) => {
    const backdrop = getComputedStyle(caption, "::before");
    return {
      backgroundImage: backdrop.backgroundImage,
      backdropFilter:
        backdrop.backdropFilter ||
        (backdrop as CSSStyleDeclaration & { webkitBackdropFilter?: string })
          .webkitBackdropFilter ||
        "none",
      filter: backdrop.filter,
    };
  });

  expect(fog.backgroundImage).toBe("none");
  expect(fog.backdropFilter).toBe("none");
  expect(fog.filter).toBe("none");
});

test("the language control switches Scene one across all four approved languages", async ({
  page,
}) => {
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);

  const translations = [
    {
      button: "ЎЗ",
      lang: "uz-Cyrl",
      headline: "Бизнесингизни олдинга силжитамиз.",
      body: "Аввал ташкилотингиз қандай ишлашини ўрганамиз, сўнг ишни самаралироқ қиладиган амалий ечимларни жорий этамиз.",
    },
    {
      button: "RU",
      lang: "ru",
      headline: "Помогаем бизнесу двигаться вперёд.",
      body: "Сначала мы изучаем, как работает ваша организация, а затем создаём практичные системы, которые делают её эффективнее.",
    },
    {
      button: "EN",
      lang: "en",
      headline: "We keep business moving.",
      body: "We begin by understanding how your organization works, then build practical systems that help it work better.",
    },
    {
      button: "UZ",
      lang: "uz-Latn",
      headline: "Biznesingizni oldinga siljitamiz.",
      body: "Avval tashkilotingiz qanday ishlashini o‘rganamiz, so‘ng ishni samaraliroq qiladigan amaliy yechimlarni joriy etamiz.",
    },
  ] as const;

  for (const translation of translations) {
    await chooseLanguage(page, translation.button);
    await expect(
      page.getByRole("heading", { name: translation.headline }),
    ).toBeVisible();
    await expect(page.getByText(translation.body)).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      translation.lang,
    );
  }
});

test("scene two preserves the selected language and supports all four translations", async ({
  page,
}) => {
  test.setTimeout(40_000);
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);

  await chooseLanguage(page, "RU");
  await page.mouse.move(640, 360);
  // This case verifies translations. Separate awaited wheel calls can span the
  // gesture lock on slower runners and accidentally advance another chapter.
  // Continuous-wheel behavior is covered by the dedicated long-gesture test.
  await page.mouse.wheel(0, 160);
  await waitForVisibleChapterFrame(page, 228, 258);

  const translations = [
    {
      button: "RU",
      lang: "ru",
      headline: "Мы — официальный партнёр 1С.",
      body: "Подбираем, внедряем и сопровождаем решения 1С, которые подходят именно вашему бизнесу.",
    },
    {
      button: "UZ",
      lang: "uz-Latn",
      headline: "Biz — 1C’ning rasmiy hamkorimiz.",
      body: "Biznesingizga mos 1C yechimlarini tanlaymiz, joriy etamiz va har bosqichda qo‘llab-quvvatlaymiz.",
    },
    {
      button: "ЎЗ",
      lang: "uz-Cyrl",
      headline: "Биз — 1С’нинг расмий ҳамкоримиз.",
      body: "Бизнесингизга мос 1С ечимларини танлаймиз, жорий этамиз ва ҳар босқичда қўллаб-қувватлаймиз.",
    },
    {
      button: "EN",
      lang: "en",
      headline: "We are an official 1C partner.",
      body: "We select, implement, and support 1C solutions tailored to the way your business works.",
    },
  ] as const;

  for (const translation of translations) {
    await chooseLanguage(page, translation.button);
    await expect(
      page.getByRole("heading", { name: translation.headline }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(translation.body)).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      translation.lang,
    );
  }
});

test("scenes three through five show every approved translation", async ({
  page,
}) => {
  test.setTimeout(70_000);
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);
  await travelForwardOneChapter(page, 228, 258);

  const scenes = [
    {
      frames: [324, 354],
      translations: [
        {
          button: "UZ",
          headline: "Ishonchli hamkorlik. Barqaror natijalar.",
          body: "O‘zbekistonning yetakchi tashkilotlari biznes jarayonlarini avtomatlashtirishda bizning tajribamizga tayanadi.",
        },
        {
          button: "ЎЗ",
          headline: "Ишончли ҳамкорлик. Барқарор натижалар.",
          body: "Ўзбекистоннинг етакчи ташкилотлари бизнес жараёнларини автоматлаштиришда бизнинг тажрибамизга таянади.",
        },
        {
          button: "RU",
          headline: "Надёжное партнёрство. Устойчивые результаты.",
          body: "Ведущие организации Узбекистана доверяют нашему опыту в автоматизации бизнес-процессов.",
        },
        {
          button: "EN",
          headline: "Trusted partnerships. Lasting results.",
          body: "Leading organizations across Uzbekistan trust our experience in business process automation.",
        },
      ],
    },
    {
      frames: [408, 432],
      translations: [
        {
          button: "UZ",
          headline: "1C bo‘yicha yordam — doim yoningizda.",
          body: "Mutaxassislarimiz tizimingizni muntazam yangilaydi, sozlaydi va zarur paytda tez yordam beradi.",
        },
        {
          button: "ЎЗ",
          headline: "1С бўйича ёрдам — доим ёнингизда.",
          body: "Мутахассисларимиз тизимингизни мунтазам янгилайди, созлайди ва зарур пайтда тез ёрдам беради.",
        },
        {
          button: "RU",
          headline: "Поддержка 1С всегда рядом.",
          body: "Наши специалисты регулярно обновляют и настраивают вашу систему и быстро помогают, когда это необходимо.",
        },
        {
          button: "EN",
          headline: "1C support, whenever you need it.",
          body: "Our specialists keep your system updated and configured, and respond quickly whenever you need help.",
        },
      ],
    },
    {
      frames: [504, 519],
      translations: [
        {
          button: "UZ",
          headline: "Sun’iy intellekt — amaliy natija.",
          body: "Takroriy ishlarni avtomatlashtirib, ma’lumotlarni tezroq qayta ishlash va aniqroq qaror qabul qilishga yordam beramiz.",
        },
        {
          button: "ЎЗ",
          headline: "Сунъий интеллект — амалий натижа.",
          body: "Такрорий ишларни автоматлаштириб, маълумотларни тезроқ қайта ишлаш ва аниқроқ қарор қабул қилишга ёрдам берамиз.",
        },
        {
          button: "RU",
          headline: "ИИ для реальных бизнес-задач.",
          body: "Автоматизируем повторяющиеся задачи, ускоряем обработку данных и помогаем принимать более точные решения.",
        },
        {
          button: "EN",
          headline: "AI for real business needs.",
          body: "We automate repetitive work, process information faster, and help your team make better decisions.",
        },
      ],
    },
  ] as const;

  for (const scene of scenes) {
    await travelForwardOneChapter(page, scene.frames[0], scene.frames[1]);
    for (const translation of scene.translations) {
      await chooseLanguage(page, translation.button);
      await expect(
        page.getByRole("heading", { name: translation.headline }),
      ).toBeVisible();
      await expect(page.getByText(translation.body)).toBeVisible();
    }
  }
});

test("scene six presents the approved contact actions in the film's right side", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);
  const standardHeadlineSize = await page
    .locator(".scene-caption h2")
    .evaluate((heading) => Number.parseFloat(getComputedStyle(heading).fontSize));

  await page.keyboard.press("End");
  await waitForVisibleChapterFrame(page, 624, 624);

  const contact = page.locator(".scene-caption.is-contact");
  await expect(contact).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Keling, gaplashamiz." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "+998 55 588 90 00" })).toHaveAttribute(
    "href",
    "tel:+998555889000",
  );
  await expect(page.getByRole("link", { name: "info@sdq-sfb.com" })).toHaveAttribute(
    "href",
    "mailto:info@sdq-sfb.com",
  );

  const actions = [
    { button: "UZ", headline: "Keling, gaplashamiz.", action: "Batafsil" },
    { button: "ЎЗ", headline: "Келинг, гаплашамиз.", action: "Батафсил" },
    { button: "RU", headline: "Давайте обсудим задачу.", action: "Подробнее" },
    { button: "EN", headline: "Let’s talk.", action: "See More" },
  ] as const;

  for (const item of actions) {
    await chooseLanguage(page, item.button);
    await expect(page.getByRole("heading", { name: item.headline })).toBeVisible();
    await expect(page.getByRole("link", { name: item.action })).toHaveAttribute(
      "href",
      item.button === "EN"
        ? "https://legacy.sdq-sfb.com/en/"
        : "https://legacy.sdq-sfb.com/",
    );
  }

  const layout = await contact.evaluate((caption) => {
    const panel = caption.querySelector(".contact-caption") as HTMLElement;
    const heading = panel.querySelector("h2") as HTMLElement;
    const bounds = panel.getBoundingClientRect();
    const filmAspectRatio = 16 / 9;
    const filmWidth = Math.min(innerWidth, innerHeight * filmAspectRatio);
    const filmHeight = Math.min(innerHeight, innerWidth / filmAspectRatio);
    return {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      headingSize: Number.parseFloat(getComputedStyle(heading).fontSize),
      filmLeft: (innerWidth - filmWidth) / 2,
      filmRight: (innerWidth + filmWidth) / 2,
      filmTop: (innerHeight - filmHeight) / 2,
      filmBottom: (innerHeight + filmHeight) / 2,
      viewportCenter: innerWidth / 2,
    };
  });

  expect(layout.left).toBeGreaterThan(layout.viewportCenter);
  expect(layout.left).toBeGreaterThanOrEqual(layout.filmLeft);
  expect(layout.right).toBeLessThanOrEqual(layout.filmRight);
  expect(layout.top).toBeGreaterThanOrEqual(layout.filmTop);
  expect(layout.bottom).toBeLessThanOrEqual(layout.filmBottom);
  expect(layout.headingSize).toBeGreaterThan(standardHeadlineSize);
});

test("the Scene one caption leaves during travel and returns with the SDQ carriage", async ({
  page,
}) => {
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);

  const caption = page.locator(".scene-caption");
  await expect(caption).toBeVisible();

  await page.mouse.wheel(0, 100);
  await expect(caption).toBeHidden();

  await page.keyboard.press("Home");
  await expect(caption).toBeVisible();
  await waitForVisibleChapterFrame(page, 120, 120);
});

test("desktop film stays fixed and one long gesture advances one carriage", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("video")).toHaveCount(2);
  await waitForVisibleChapterFrame(page, 108, 132);

  // Schedule the continuous burst inside the page: automation round trips on
  // Windows can exceed the gesture idle timeout between individual wheel calls.
  const burst = await page.evaluate(async () => {
    const target = document.querySelector(".video-stage")!;
    const times: number[] = [];
    let prevented = true;
    for (let signal = 0; signal < 24; signal += 1) {
      const event = new WheelEvent("wheel", { deltaY: 80, bubbles: true, cancelable: true });
      times.push(performance.now());
      target.dispatchEvent(event);
      prevented = prevented && event.defaultPrevented;
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
    return { prevented, maxGap: Math.max(...times.slice(1).map((time, i) => time - times[i])) };
  });
  expect(burst.maxGap).toBeLessThan(INPUT_IDLE_MS);
  expect(burst.prevented).toBe(true);

  await expect(chapterAnnouncement(page)).toHaveText("Official 1C partner");
  await page.waitForTimeout(600);
  await expect(chapterAnnouncement(page)).toHaveText("Official 1C partner");
  await waitForVisibleChapterFrame(page, 228, 258);

  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect(
    await page.locator("video").evaluateAll(
      (videos) =>
        videos.filter((video) => getComputedStyle(video).opacity === "1")
          .length,
    ),
  ).toBe(1);
});

test("opposite input switches to the reverse movie and returns", async ({ page }) => {
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);

  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(1_200);
  await page.mouse.wheel(0, -100);

  await expect
    .poll(() =>
      page.locator('video[src*="reverse"]').evaluate(
        (video) => getComputedStyle(video).opacity,
      ),
    )
    .toBe("1");
  await expect(page.locator(".video-stage__ambient-canvas")).toHaveAttribute(
    "data-direction",
    "-1",
  );
  await expect(page.locator(".video-stage__edge-canvas")).toHaveAttribute(
    "data-direction",
    "-1",
  );
  await expect(chapterAnnouncement(page)).toHaveText("SDQ consulting");
  await waitForVisibleChapterFrame(page, 108, 132);
});

test("hiding during a layer switch resumes the unfinished journey", async ({
  page,
}) => {
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);
  await expect(page.locator(".scene-caption")).toBeVisible();
  await page.evaluate(() => {
    let hiddenForTest = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hiddenForTest,
    });
    (
      window as typeof window & { setHiddenForTest: (hidden: boolean) => void }
    ).setHiddenForTest = (hidden) => {
      hiddenForTest = hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    };
  });

  await page.mouse.wheel(0, 100);
  await expect(page.locator(".scene-caption")).toBeHidden();
  await page.waitForFunction(() => {
    const frame = Number(
      document.querySelector(".video-stage")?.getAttribute("data-frame"),
    );
    return frame > 132 && frame < 228;
  });
  await page.evaluate(() =>
    (
      window as typeof window & { setHiddenForTest: (hidden: boolean) => void }
    ).setHiddenForTest(true),
  );
  await expect
    .poll(() =>
      page.locator("video").evaluateAll((videos) =>
        videos.every((video) => (video as HTMLVideoElement).paused),
      ),
    )
    .toBe(true);

  await page.evaluate(() =>
    (
      window as typeof window & { setHiddenForTest: (hidden: boolean) => void }
    ).setHiddenForTest(false),
  );
  await expect(chapterAnnouncement(page)).toHaveText("Official 1C partner");
  await waitForVisibleChapterFrame(page, 228, 258);
});

test("reduced motion jumps to a paused centre frame", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = observeBrowserErrors(page);
  await page.goto(previewUrl);
  await expect(page.locator("video")).toHaveCount(2);
  await expect(page.locator(".opening-greeting")).toHaveCount(0);
  await waitForStageFrame(page, 120, 120);
  await expect
    .poll(() =>
      page
        .locator("video")
        .first()
        .evaluate((video) => (video as HTMLVideoElement).currentTime),
    )
    .toBeCloseTo(5, 2);

  await page.mouse.wheel(0, 100);
  await expect(chapterAnnouncement(page)).toHaveText("Official 1C partner");
  await waitForStageFrame(page, 243, 243);
  await expect
    .poll(() =>
      page
        .locator("video")
        .first()
        .evaluate((video) => (video as HTMLVideoElement).currentTime),
    )
    .toBeCloseTo(10.125, 2);
  await expect.poll(
    () => page.locator("video").evaluateAll((videos) =>
      videos.every((video) => (video as HTMLVideoElement).paused),
    ),
  ).toBe(true);
  const held = await page.locator("video").evaluateAll((videos) =>
    videos.map((video) => (video as HTMLVideoElement).currentTime),
  );
  await page.waitForTimeout(250);
  await waitForStageFrame(page, 243, 243);
  expect(await page.locator("video").evaluateAll((videos) =>
    videos.map((video) => (video as HTMLVideoElement).currentTime),
  )).toEqual(held);
  expect(errors).toEqual([]);
  await context.close();
});

test("mobile native scroll keeps six stable stops and independent moving ambience", async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browserName !== "firefox", reducedMotion: "reduce" });
  const page = await context.newPage();
  const requests: string[] = [];
  page.on("request", request => { if (request.url().endsWith(".mp4")) requests.push(request.url()); });
  await page.goto(previewUrl);
  await expect(page.locator('.video-stage')).toHaveAttribute('data-variant', 'mobile');
  await waitForStageFrame(page, 120, 120);
  await expect(page.locator('.mobile-story-stop')).toHaveCount(6);
  await expect(page.locator('[aria-label="Chapter descriptions"] section')).toHaveCount(6);
  await expect(page.locator('[aria-label="Chapter descriptions"] a[href="tel:+998555889000"]')).toHaveCount(1);
  await expect(page.locator('[aria-label="Chapter descriptions"] a[href="mailto:info@sdq-sfb.com"]')).toHaveCount(1);
  expect(await page.evaluate(() => ({
    native: document.documentElement.scrollHeight > innerHeight * 5,
    panning: getComputedStyle(document.querySelector('main')!).touchAction,
    portal: document.querySelector('.video-stage__wallpaper')?.parentElement === document.body,
    snap: getComputedStyle(document.documentElement).scrollSnapType,
  }))).toEqual({ native: true, panning: 'pan-y pinch-zoom', portal: true, snap: 'y' });
  const centers = [120, 243, 339, 420, 512, 624];
  for (const index of [0, 1, 2, 3, 4, 5, 3, 0]) {
    await page.evaluate(index => window.scrollTo({ top: index * document.querySelector('.mobile-story-stop')!.getBoundingClientRect().height, behavior: 'instant' }), index);
    await waitForStageFrame(page, centers[index], centers[index]);
    await expect(page.locator('.scene-caption')).toBeVisible();
    await expect(page.locator('.video-stage__ambient-canvas')).toHaveAttribute('data-frame', String(centers[index]));
  }
  expect(requests.every(url => url.includes('mobile-wide'))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test("mobile ambient positioning survives native scrolling with its supported and fallback paths", async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browserName !== "firefox", reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(previewUrl);
  await waitForStageFrame(page, 120, 120);
  for (const fallback of [false, true]) {
    if (fallback) await page.evaluate(() => {
      const removeScrollTimelineBlocks = (owner: CSSStyleSheet | CSSGroupingRule) => {
        for (let index = owner.cssRules.length - 1; index >= 0; index -= 1) {
          const rule = owner.cssRules[index];
          if (rule instanceof CSSSupportsRule && rule.conditionText.includes("animation-timeline")) owner.deleteRule(index);
          else if (rule instanceof CSSGroupingRule) removeScrollTimelineBlocks(rule);
        }
      };
      for (const sheet of document.styleSheets) removeScrollTimelineBlocks(sheet);
    });
    for (const [index, frame] of [[2, 339], [5, 624], [0, 120]]) {
      await page.evaluate(index => scrollTo({ top: index * document.querySelector('.mobile-story-stop')!.getBoundingClientRect().height, behavior: 'instant' }), index);
      await waitForStageFrame(page, frame, frame);
      await expect.poll(() => page.locator('.video-stage__wallpaper').evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(1);
      const stops = await page.locator('.mobile-story-stop').evaluateAll(elements => elements.map(element => ({ top: element.getBoundingClientRect().top + scrollY, height: element.getBoundingClientRect().height })));
      expect(stops).toHaveLength(6);
      stops.forEach((stop, index) => expect(stop.top).toBeCloseTo(index * stops[0].height, 1));
    }
    if (fallback) expect(await page.locator('.video-stage__wallpaper').evaluate(element => getComputedStyle(element).position)).toBe('fixed');
  }
  await context.close();
});

test("touch tablets use native chapter scrolling with the complete desktop film", async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, screen: { width: 1024, height: 768 }, hasTouch: true, isMobile: browserName !== 'firefox', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(previewUrl);
  await waitForStageFrame(page, 120, 120);
  await expect(page.locator('.train-story')).toHaveAttribute('data-mobile', 'true');
  await expect(page.locator('.video-stage')).toHaveAttribute('data-variant', 'wide');
  await expect(page.locator('.mobile-story-stop')).toHaveCount(6);
  for (const [index, frame] of [[2, 339], [5, 624]]) {
    await page.evaluate(index => scrollTo({ top: index * document.querySelector('.mobile-story-stop')!.getBoundingClientRect().height, behavior: 'instant' }), index);
    await waitForStageFrame(page, frame, frame);
  }
  const film = await page.locator('video').first().evaluate((element: HTMLVideoElement) => ({ width: element.getBoundingClientRect().width, fit: getComputedStyle(element).objectFit, source: element.currentSrc }));
  expect(film.width).toBe(1024);
  expect(film.fit).toBe('contain');
  expect(film.source).toContain('sdq-train-desktop.mp4');
  await context.close();
});

test("mobile portrait captions, four languages and touch controls fit the bounded foreground", async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: browserName !== 'firefox', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(previewUrl);
  await waitForStageFrame(page, 120, 120);
  for (const locale of ['UZ', 'ЎЗ', 'RU', 'EN'] as const) {
    await chooseLanguage(page, locale);
    for (const index of [0, 2, 5]) {
      await page.evaluate(index => scrollTo({ top: index * document.querySelector('.mobile-story-stop')!.getBoundingClientRect().height, behavior: 'instant' }), index);
      await waitForStageFrame(page, [120,243,339,420,512,624][index], [120,243,339,420,512,624][index]);
      const geometry = await page.evaluate(() => {
        const foreground = document.querySelector('.train-story__viewport')!.getBoundingClientRect();
        const elements = [...document.querySelectorAll('.scene-caption h2, .scene-caption > p, .scene-caption a, .language-switcher__current')];
        return elements.map(element => {
          const r = element.getBoundingClientRect();
          return { inside: r.left >= -0.1 && r.right <= innerWidth + 0.1 && r.top >= foreground.top - 0.1 && r.bottom <= Math.min(innerHeight, foreground.bottom) + 0.1,
            tap: element.tagName === 'A' || element.tagName === 'BUTTON' ? r.height >= 43.9 && r.width >= 43.9 : true };
        });
      });
      expect(geometry.every(value => value.inside && value.tap)).toBe(true);
    }
  }
  await expect(page.locator('.contact-phone')).toHaveAttribute('href', 'tel:+998555889000');
  await expect(page.locator('.contact-email')).toHaveAttribute('href', 'mailto:info@sdq-sfb.com');
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute('content', /user-scalable=no|maximum-scale=1/);
  await context.close();
});

test("phone rotation preserves chapter and native video instances without loading desktop media", async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, hasTouch: true, isMobile: browserName !== 'firefox', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(previewUrl);
  await waitForStageFrame(page, 120, 120);
  await page.evaluate(() => scrollTo({ top: 2 * document.querySelector('.mobile-story-stop')!.getBoundingClientRect().height, behavior: 'instant' }));
  await waitForStageFrame(page, 339, 339);
  const videos = await page.locator('video').elementHandles();
  for (const size of [{width:844,height:390},{width:844,height:330},{width:390,height:844}]) {
    await page.setViewportSize(size);
    await waitForStageFrame(page, 339, 339);
    for (const video of videos) expect(await video.evaluate(video => video.isConnected)).toBe(true);
    await expect(page.locator('.video-stage')).toHaveAttribute('data-variant', 'mobile');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await context.close();
});

test("resizing across the mobile boundary preserves media, travel destination and pause", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 720 });
  await page.goto(previewUrl);
  await waitForStageFrame(page, 108, 132);
  const videos = await page.locator('video').elementHandles();
  const sources = await page.locator('video').evaluateAll(elements => elements.map(video => (video as HTMLVideoElement).currentSrc));
  await page.keyboard.press('ArrowDown');
  await waitForStageFrame(page, 145, 175);
  for (const width of [700, 1000]) {
    const before = Number(await page.locator('.video-stage').getAttribute('data-frame'));
    await page.setViewportSize({ width, height: 720 });
    for (const video of videos) expect(await video.evaluate(video => video.isConnected)).toBe(true);
    const after = Number(await page.locator('.video-stage').getAttribute('data-frame'));
    expect(after).toBeGreaterThanOrEqual(before - 1);
    expect(after - before).toBeLessThan(24);
    await expect(page.locator('.video-stage')).toHaveAttribute('data-direction', '1');
  }
  await page.keyboard.press('p');
  await expect.poll(() => page.locator('video').evaluateAll(elements => elements.every(video => (video as HTMLVideoElement).paused))).toBe(true);
  const pausedFrame = Number(await page.locator('.video-stage').getAttribute('data-frame'));
  for (const width of [700, 1000]) {
    await page.setViewportSize({ width, height: 720 });
    for (const video of videos) expect(await video.evaluate(video => video.isConnected)).toBe(true);
    expect(Number(await page.locator('.video-stage').getAttribute('data-frame'))).toBe(pausedFrame);
    expect(await page.locator('video').evaluateAll(elements => elements.every(video => (video as HTMLVideoElement).paused))).toBe(true);
  }
  expect(await page.locator('video').evaluateAll(elements => elements.map(video => (video as HTMLVideoElement).currentSrc))).toEqual(sources);
  await page.keyboard.press('p');
  await waitForStageFrame(page, 228, 258);
});

for (const viewport of [{ width: 844, height: 330 }, { width: 667, height: 280 }]) {
  test(`landscape film and all translated overlays fit below expanded browser bars at ${viewport.width}px`, async ({ browser, browserName }) => {
    test.setTimeout(60_000);
    const context = await browser.newContext({ viewport, screen: { width: 390, height: 844 }, hasTouch: true, isMobile: browserName !== 'firefox', reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(previewUrl);
    await waitForStageFrame(page, 120, 120);
    // Desktop emulation normally makes lvh and dvh identical. Keep the chapter
    // stops tall while the foreground must fit the smaller visible viewport.
    await page.addStyleTag({ content: '.train-story { --mobile-large-height: 390px; --mobile-visible-height: 100dvh; --safe-area-left: 44px; --safe-area-right: 44px; --safe-area-top: 0px; --safe-area-bottom: 20px; }' });
    // Synchronize the controller's cached chapter spacing after this test-only
    // change to lvh; real browser-bar changes leave that spacing unchanged.
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    const centers = [120, 243, 339, 420, 512, 624];
    for (const locale of ['UZ', 'ЎЗ', 'RU', 'EN'] as const) {
      await chooseLanguage(page, locale);
      for (const [index, frame] of centers.entries()) {
        await page.evaluate(index => scrollTo({ top: index * document.querySelector('.mobile-story-stop')!.getBoundingClientRect().height, behavior: 'instant' }), index);
        await waitForStageFrame(page, frame, frame);
        await expect(page.locator('.scene-caption')).toBeVisible();
        const geometry = await page.evaluate(() => {
          const video = document.querySelector('video.is-active') as HTMLVideoElement;
          const bounds = video.getBoundingClientRect();
          const fit = Math.min(bounds.width / video.videoWidth, bounds.height / video.videoHeight);
          const filmWidth = video.videoWidth * fit;
          const filmHeight = video.videoHeight * fit;
          const film = { left: bounds.left + (bounds.width - filmWidth) / 2, top: bounds.top + (bounds.height - filmHeight) / 2, right: bounds.left + (bounds.width + filmWidth) / 2, bottom: bounds.top + (bounds.height + filmHeight) / 2 };
          const foreground = document.querySelector('.train-story__viewport')!.getBoundingClientRect();
          const overlays = [...document.querySelectorAll('.scene-caption h2, .scene-caption > p, .scene-caption a, .language-switcher__current')].map(element => {
            const r = element.getBoundingClientRect();
            return { text: element.textContent, inside: r.left >= 43.9 && r.right <= innerWidth - 43.9 && r.top >= -0.1 && r.bottom <= innerHeight - 19.9,
              tap: element.matches('a, button') ? r.height >= 43.9 && r.width >= 43.9 : true };
          });
          return { film, overlays, foregroundBottom: foreground.bottom, stageHeight: bounds.height, fit: getComputedStyle(video).objectFit, stopHeight: document.querySelector('.mobile-story-stop')!.getBoundingClientRect().height };
        });
        expect(geometry.fit).toBe('contain');
        expect(geometry.stopHeight).toBe(390);
        expect(geometry.film.left).toBeGreaterThanOrEqual(-0.1);
        expect(geometry.film.right).toBeLessThanOrEqual(viewport.width + 0.1);
        expect(geometry.film.top).toBeGreaterThanOrEqual(-0.1);
        expect(geometry.film.bottom).toBeLessThanOrEqual(viewport.height + 0.1);
        expect(geometry.foregroundBottom).toBeCloseTo(viewport.height, 0);
        expect(geometry.stageHeight).toBeCloseTo(viewport.height, 0);
        expect(geometry.overlays.filter(overlay => !overlay.inside || !overlay.tap), `${locale}, scene ${index + 1}`).toEqual([]);
      }
    }
    await context.close();
  });
}

test("paused film repaints its soft edges when only the stage size changes", async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, screen: { width: 390, height: 844 }, hasTouch: true, isMobile: browserName !== 'firefox', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(previewUrl);
  await waitForStageFrame(page, 120, 120);
  await expect.poll(() => page.locator('video').evaluateAll(videos => videos.every(video => (video as HTMLVideoElement).paused))).toBe(true);
  await expect(page.locator('.video-stage__edge-canvas')).toHaveAttribute('data-painted', 'true');
  const videos = await page.locator('video').elementHandles();
  const media = await page.locator('video').evaluateAll(videos => videos.map(video => ({ source: (video as HTMLVideoElement).currentSrc, time: (video as HTMLVideoElement).currentTime })));
  await page.evaluate(() => {
    document.documentElement.dataset.testWindowResizes = '0';
    window.addEventListener('resize', () => { document.documentElement.dataset.testWindowResizes = String(Number(document.documentElement.dataset.testWindowResizes) + 1); });
  });
  for (const height of [310, 350]) {
    await page.locator('.video-stage').evaluate((stage, height) => { (stage as HTMLElement).style.height = `${height}px`; }, height);
    await expect.poll(() => page.locator('.video-stage__edge-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.height)).toBe(height);
    const paintedPixels = await page.locator('.video-stage__edge-canvas').evaluate((canvas: HTMLCanvasElement) => {
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels.some((value, index) => index % 4 === 3 && value > 0);
    });
    expect(paintedPixels).toBe(true);
    await expect(page.locator('.video-stage__edge-canvas')).toHaveAttribute('data-frame', '120');
    await waitForStageFrame(page, 120, 120);
    for (const video of videos) expect(await video.evaluate(video => video.isConnected && (video as HTMLVideoElement).paused)).toBe(true);
  }
  expect(await page.locator('video').evaluateAll(videos => videos.map(video => ({ source: (video as HTMLVideoElement).currentSrc, time: (video as HTMLVideoElement).currentTime })))).toEqual(media);
  await expect(page.locator('html')).toHaveAttribute('data-test-window-resizes', '0');
  await context.close();
});

test("landscape mobile contact occupies the clear right side of the film", async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, screen: { width: 390, height: 844 }, hasTouch: true, isMobile: browserName !== 'firefox', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(previewUrl);
  await waitForStageFrame(page, 120, 120);
  await page.evaluate(() => scrollTo({ top: 5 * document.querySelector('.mobile-story-stop')!.getBoundingClientRect().height, behavior: 'instant' }));
  await waitForStageFrame(page, 624, 624);
  const boxes = await page.locator('.contact-caption h2, .contact-caption a').evaluateAll(elements => elements.map(element => {
    const r = element.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  }));
  expect(boxes.every(box => box.left >= 844 * 0.6 && box.right <= 844 && box.top >= 0 && box.bottom <= 390)).toBe(true);
  await context.close();
});

test("a failed movie load keeps the poster and retries on interaction", async ({
  page,
}) => {
  let abortedRequests = 0;
  await page.route("**/*.mp4", async (route) => {
    if (abortedRequests < 2) {
      abortedRequests += 1;
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  await expect.poll(() => abortedRequests).toBe(2);
  await expect(page.locator(".film-poster")).toHaveCSS("opacity", "1");
  observedErrors.get(page)?.splice(0);

  await page.mouse.wheel(0, 100);
  await expect(page.locator(".film-poster")).toHaveCSS("opacity", "0");
  await waitForVisibleChapterFrame(page, 108, 132);
});

test("the full film uses contain framing at desktop sizes", async ({ page }) => {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 2560, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("video")).toHaveCount(2);
    expect(await page.locator("video").first().evaluate((video) =>
      getComputedStyle(video).objectFit,
    )).toBe("contain");
    expect(await page.evaluate(() => scrollY)).toBe(0);
  }
});
