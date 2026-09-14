import { expect, test } from "@playwright/test";

// Exercise navigation to the real exported company pages, without intercepting them.
for (const mobile of [false, true]) {
  for (const language of ["ru-RU", "en-GB", "uz-Latn", "uz-Cyrl"]) {
    test(`${mobile ? "mobile" : "desktop"} ${language} opens the company pages in the same tab`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.setViewportSize(mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript((language) => {
        Object.defineProperty(navigator, "languages", { get: () => [language] });
      }, language);

      const destination = language === "en-GB"
        ? "/more/en/"
        : "/more/";
      await page.goto("/");
      await expect(page.locator(".video-stage")).toHaveAttribute("data-frame", "120");
      if (mobile) {
        await page.evaluate(() => window.scrollTo({
          top: 5 * document.querySelector(".mobile-story-stop")!.getBoundingClientRect().height,
          behavior: "instant",
        }));
      } else {
        await page.keyboard.press("End");
      }

      const action = page.locator(".contact-action");
      await expect(action).toBeVisible();
      await expect(action).toHaveAttribute("href", destination);
      if (mobile) {
        await expect(page.locator('[aria-label="Chapter descriptions"] a').last())
          .toHaveAttribute("href", destination);
      }
      await action.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(destination);
      await expect(page).toHaveTitle(/SDQ/);
      await expect(page.locator(".company-header")).toBeVisible();
      await expect(page.locator("form")).toHaveCount(0);
    });
  }
}

for (const mobile of [false, true]) {
  test(`${mobile ? 'mobile' : 'desktop'} company navigation, language switch and contact alternatives`, async ({ page }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
    await page.goto('/more/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    const navigation = mobile ? page.getByRole('dialog') : page.locator('.desktop-nav');
    if (mobile) await page.getByRole('button', {name:'Меню', exact:true}).click();
    await navigation.locator('a[href="/more/o-kompanii/"]').first().click();
    await expect(page).toHaveURL('/more/o-kompanii/');
    await page.reload();
    await expect(page).toHaveTitle(/SDQ/);
    await page.getByRole('link', {name:'English version'}).click();
    await expect(page).toHaveURL('/more/en/about/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto('/more/en/contacts/');
    await expect(page.locator('.contact-panel').first()).toBeVisible();
    await expect(page.locator('.contact-panel a[href="tel:+998555889000"]').first()).toBeVisible();
    await expect(page.locator('.contact-panel a[href="mailto:info@sdq-sfb.com"]').first()).toBeVisible();
    await expect(page.locator('form')).toHaveCount(0);
  });
}
