import { expect, test } from "@playwright/test";

// Intercept only the destination: these tests exercise the real film, controls
// and browser navigation without depending on hosting availability or sending forms.
for (const mobile of [false, true]) {
  for (const language of ["ru-RU", "en-GB", "uz-Latn", "uz-Cyrl"]) {
    test(`${mobile ? "mobile" : "desktop"} ${language} opens Joomla in the same tab`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.setViewportSize(mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript((language) => {
        Object.defineProperty(navigator, "languages", { get: () => [language] });
      }, language);

      const destination = language === "en-GB"
        ? "https://legacy.sdq-sfb.com/en/"
        : "https://legacy.sdq-sfb.com/";
      await page.route("https://legacy.sdq-sfb.com/**", (route) => route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Joomla destination fixture</title><h1>Old website</h1>",
      }));

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
      await expect(page.getByRole("heading", { name: "Old website" })).toBeVisible();
    });
  }
}
