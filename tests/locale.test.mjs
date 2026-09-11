import assert from "node:assert/strict";
import test from "node:test";

import { resolveLocale } from "../src/components/train-story/captions.ts";

test("locale resolution uses the first supported browser preference", () => {
  assert.equal(resolveLocale(["fr-FR", "ru-RU", "en-US"]), "ru");
  assert.equal(resolveLocale(["en-GB", "uz-Cyrl-UZ"]), "en");
});

test("Uzbek Cyrillic preferences keep the Cyrillic script", () => {
  assert.equal(resolveLocale(["uz-Cyrl"]), "uz-Cyrl");
  assert.equal(resolveLocale(["uz-Cyrl-UZ"]), "uz-Cyrl");
});

test("all other Uzbek preferences use Uzbek Latin", () => {
  assert.equal(resolveLocale(["uz"]), "uz-Latn");
  assert.equal(resolveLocale(["uz-UZ"]), "uz-Latn");
  assert.equal(resolveLocale(["uz-Latn-UZ"]), "uz-Latn");
});

test("Russian and English regional preferences resolve to their base locale", () => {
  assert.equal(resolveLocale(["ru-KZ"]), "ru");
  assert.equal(resolveLocale(["en-US"]), "en");
});

test("empty and unsupported preference lists fall back to Uzbek Latin", () => {
  assert.equal(resolveLocale([]), "uz-Latn");
  assert.equal(resolveLocale(["de-DE", "fr-FR"]), "uz-Latn");
  assert.equal(resolveLocale(undefined), "uz-Latn");
});
