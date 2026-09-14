import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const captionsUrl = new URL("../src/components/train-story/captions.ts", import.meta.url).href;

function destinations(mode, previewOrigin = "") {
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", `
    import { contactHomepageForLocale } from ${JSON.stringify(captionsUrl)};
    console.log(JSON.stringify(["ru", "en", "uz-Latn", "uz-Cyrl"].map(contactHomepageForLocale)));
  `], {
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: mode,
      NEXT_PUBLIC_SDQ_PREVIEW_LEGACY_ORIGIN: previewOrigin,
    },
  }));
}

test("production cannot inherit the local old-site preview destination", () => {
  assert.deepEqual(destinations("production", "https://sdq-sfb.com"), [
    "https://legacy.sdq-sfb.com/", "https://legacy.sdq-sfb.com/en/",
    "https://legacy.sdq-sfb.com/", "https://legacy.sdq-sfb.com/",
  ]);
});

test("local previews preserve Joomla's Russian and English navigation", () => {
  assert.deepEqual(destinations("development", "https://sdq-sfb.com"), [
    "https://sdq-sfb.com/", "https://sdq-sfb.com/en/",
    "https://sdq-sfb.com/", "https://sdq-sfb.com/",
  ]);
});

test("development uses the production destination unless explicitly overridden", () => {
  assert.equal(destinations("development")[0], "https://legacy.sdq-sfb.com/");
});
