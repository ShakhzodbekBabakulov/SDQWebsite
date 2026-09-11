import { expect, test, type Page } from "@playwright/test";

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
      const video = visible[0];
      const reverse = video.currentSrc.includes("reverse");
      const frame = reverse
        ? 720 - video.currentTime * 24
        : video.currentTime * 24;
      return frame >= minimum && frame <= maximum;
    },
    { minimum: minimumFrame, maximum: maximumFrame },
  );
}

test("desktop film stays fixed and one long gesture advances one carriage", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("video")).toHaveCount(2);
  await waitForVisibleChapterFrame(page, 108, 132);

  for (let signal = 0; signal < 24; signal += 1) {
    await page.mouse.wheel(0, 80);
    await page.waitForTimeout(8);
  }

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
  await expect(chapterAnnouncement(page)).toHaveText("SDQ consulting");
  await waitForVisibleChapterFrame(page, 108, 132);
});

test("hiding during a layer switch resumes the unfinished journey", async ({
  page,
}) => {
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);
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
  await page.goto("http://127.0.0.1:3000/");
  await expect(page.locator("video")).toHaveCount(2);
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
  await expect
    .poll(() =>
      page
        .locator("video")
        .first()
        .evaluate((video) => (video as HTMLVideoElement).currentTime),
    )
    .toBeCloseTo(10.125, 2);
  expect(
    await page.locator("video").evaluateAll((videos) =>
      videos.every((video) => (video as HTMLVideoElement).paused),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await context.close();
});

test("small screens request only the poster", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  const errors = observeBrowserErrors(page);
  const movieRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".mp4")) movieRequests.push(request.url());
  });

  await page.goto("http://127.0.0.1:3000/");
  await page.waitForTimeout(500);
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.locator('img[src*="sdq-train-poster"]')).toHaveCount(1);
  expect(movieRequests).toEqual([]);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect(errors).toEqual([]);
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
