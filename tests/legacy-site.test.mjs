import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { contactHomepageForLocale } from "../src/components/train-story/captions.ts";

const publicRoot = new URL("../public", import.meta.url);
const inventory = JSON.parse(readFileSync(new URL("../docs/more-inventory.json", import.meta.url)));

test("each language opens the corresponding company pages on this origin", () => {
  assert.deepEqual(["ru", "en", "uz-Latn", "uz-Cyrl"].map(contactHomepageForLocale), [
    "/more/", "/more/en/", "/more/", "/more/",
  ]);
});

test("the entire public page and asset inventory is exported", () => {
  assert.ok(inventory.pages.length >= 26, "Both languages and service detail pages must be present");
  for (const page of inventory.pages) {
    const file = new URL(`.${page.path}index.html`, publicRoot.href + "/");
    assert.ok(existsSync(file), page.path);
    const html = readFileSync(file, "utf8");
    assert.ok(html.includes(page.title), page.path);
    assert.doesNotMatch(html, /<form\b|csrf\.token|system\.keepalive|legacy\.sdq-sfb\.com/i, page.path);
  }
  for (const asset of inventory.assets) {
    assert.ok(existsSync(new URL(`.${asset}`, publicRoot.href + "/")), asset);
  }
});
