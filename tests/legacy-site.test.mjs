import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { contactHomepageForLocale } from "../src/components/train-story/captions.ts";
import { pages, canonicalPaths, absolute, structuredData } from "../src/content/site.ts";

const publicRoot = new URL("../public", import.meta.url);
const inventory = JSON.parse(readFileSync(new URL("../docs/more-inventory.json", import.meta.url)));

test("each language opens the corresponding company pages on this origin", () => {
  assert.deepEqual(["ru", "en", "uz-Latn", "uz-Cyrl"].map(contactHomepageForLocale), [
    "/more/", "/more/en/", "/more/", "/more/",
  ]);
});

test("catalog preserves all original canonical routes and adds only the two AI services", () => {
  assert.equal(canonicalPaths.length, 35);
  for (const page of inventory.pages.filter(page => page.path !== '/more/ru/')) {
    assert.ok(pages.some(current => current.path === page.path), page.path);
    assert.ok(!existsSync(new URL(`.${page.path}index.html`, publicRoot.href + "/")), 'No conflicting legacy HTML');
  }
  assert.equal(pages.filter(page => !page.counterpart).length, 8);
  assert.equal(new Set(pages.map(page => page.title)).size, 34);
  assert.equal(new Set(pages.map(page => page.description)).size, 34);
});

test("translations are reciprocal and structured data uses one company identity", () => {
  for (const page of pages) {
    if (page.counterpart) {
      const other = pages.find(other => other.path === page.counterpart);
      assert.equal(other?.counterpart, page.path);
      assert.notEqual(other?.language, page.language);
    } else {
      assert.equal(page.language, 'ru'); assert.equal(page.kind, 'product');
    }
    const schema = structuredData(page);
    assert.equal(schema['@graph'][0]['@id'], 'https://sdq-sfb.com/#organization');
    assert.ok(JSON.stringify(schema).includes(absolute(page.path)));
  }
});
