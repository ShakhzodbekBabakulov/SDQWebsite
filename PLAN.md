# Apple-Style Film Background and Automatic Language Selection

## Summary

Match the proven `babakulov.live` film treatment while preserving the SDQ train’s full 16:9 composition. Add automatic browser-language selection, a tiny top-right language dropdown, and the exact greeting **“Assalomu Aleykum”** during the opening arrival.

## Implementation Changes

- Adapt the reference site’s background system into the train’s video stage:
  - Keep the main film sharp and fully visible.
  - Extend its nearest edges into unused screen space.
  - Add a darker, softly blurred copy behind the extension.
  - Synchronize the extension with the poster and both forward/reverse videos.
  - Fall back safely to the blurred poster if live canvas painting fails.
- Add a dedicated opening greeting inside the film:
  - Display **“Assalomu Aleykum”** for every visitor, independent of language.
  - Show it only during the initial train arrival.
  - Begin fading around frame 84 and finish before frame 96; the first carriage settles at frame 108.
  - Skip it when reduced-motion mode skips the arrival animation.
- Detect the first supported language from the browser’s ordered preferences:
  - `uz-Cyrl` → Uzbek Cyrillic.
  - Other Uzbek variants, including plain `uz` → Uzbek Latin.
  - Russian variants → Russian.
  - English variants → English.
  - Unsupported languages → Uzbek Latin.
- Replace the four always-visible language buttons with a small `UZ`, `ЎЗ`, `RU`, or `EN` label in the film’s top-right corner.
  - Idle appearance: plain, subtle Manrope text with no prominent panel.
  - Hover, keyboard focus, or click reveals a compact right-aligned dropdown.
  - Selection updates the captions and page language, then closes the dropdown.
  - Manual selection remains active between train scenes but is not stored after refresh.
- Keep the mobile poster-only experience unchanged.

## Interfaces and Files

- Update the train video stage to report displayed frames so the greeting and background remain synchronized.
- Work within `src/components/train-story/*`, `src/app/globals.css`, `tests/*`, and the project plan.
- Add no package, external service, public API, route, or new media asset.

## Test and Acceptance Plan

- Verify the main film still uses contain framing while horizontal and vertical empty bands receive synchronized extensions.
- Test poster fallback, moving frames, reverse playback, resizing, and canvas failure without interrupting the train.
- Confirm the greeting uses the exact approved spelling, appears during arrival, and is gone before the first carriage stops.
- Test automatic selection for Uzbek Latin, Uzbek Cyrillic, Russian, English, ordered browser preferences, and unsupported languages.
- Confirm the compact selector’s hover, keyboard, click, focus, and selected-language behavior.
- Confirm it remains inside the film’s top-right corner at standard, tall, and ultrawide desktop sizes.
- Run unit tests, browser tests, linting, and the production build.

## Assumptions

- “First scene” means the initial page-load arrival only, not the later loop from the final carriage back to the first.
- The translated first-carriage business caption appears normally after the greeting has faded.
- Browser language is re-detected on every refresh; no cookie or local storage is added.
- The installed Vercel CLI upgrade is separate from this change. Version 59.13.1 should be upgraded to 59.16.0 or newer with `npm i -g vercel@latest` for best compatibility.
