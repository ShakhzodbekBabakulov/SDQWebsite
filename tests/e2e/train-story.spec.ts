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

async function travelForwardOneChapter(
  page: Page,
  minimumFrame: number,
  maximumFrame: number,
) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("A desktop viewport is required");
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  for (let signal = 0; signal < 24; signal += 1) {
    await page.mouse.wheel(0, 80);
    await page.waitForTimeout(8);
  }
  await waitForVisibleChapterFrame(page, minimumFrame, maximumFrame);
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

test("scene one keeps its captions inside the film on a taller desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);

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
    await page.getByRole("button", { name: translation.button }).click();
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
  await page.goto("/");
  await waitForVisibleChapterFrame(page, 108, 132);

  await page.getByRole("button", { name: "RU" }).click();
  await page.mouse.move(640, 360);
  for (let signal = 0; signal < 24; signal += 1) {
    await page.mouse.wheel(0, 80);
    await page.waitForTimeout(8);
  }
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
    await page.getByRole("button", { name: translation.button }).click();
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
      await page.getByRole("button", { name: translation.button }).click();
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
    await page.getByRole("button", { name: item.button }).click();
    await expect(page.getByRole("heading", { name: item.headline })).toBeVisible();
    await expect(page.getByRole("link", { name: item.action })).toHaveAttribute(
      "href",
      "https://sdq-sfb.com/",
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
  await expect(page.locator(".scene-caption")).toHaveCount(0);
  await expect(page.locator(".language-switcher")).toHaveCount(0);
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
