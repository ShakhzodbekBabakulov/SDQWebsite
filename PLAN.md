# Multilingual Train Story Captions

## Summary

Add the approved captions across all six resting carriages. Scenes 1–5 use a centered headline beneath the overhead light and a supporting sentence on the ground below the carriage. Scene 6 uses its open right-hand space for a larger contact composition with phone, email, and homepage links. Uzbek Latin remains the default, all four approved languages are supported, and captions remain desktop-only.

## Implementation Changes

1. Keep every scene's approved multilingual content in a reusable carriage-based structure that distinguishes standard captions from the final contact scene.
2. Show the matching caption only after its carriage settles, hide captions while the train travels, and restore the correct caption whenever a scene returns.
3. Add an upper-right language control with `UZ`, `ЎЗ`, `RU`, and `EN`; changing the language also updates the page language for accessibility.
4. Place the headline beneath the overhead light and the supporting sentence below the carriage, without a panel, fog, or artificial glow behind either line.
5. Match SDQ's existing typography by using Montserrat for the headline and Manrope for the supporting sentence and language control. Keep the headline navy, enlarge the supporting sentence, and use a deep teal derived from the carriage trim for readable branded contrast.
6. Constrain both captions to an invisible centered 16:9 frame that always matches the visible film, including taller and ultrawide desktop windows.
7. Give Scene 6 a larger right-side contact layout with clickable phone and email details and a localized homepage action, all contained within the visible film.
8. Keep the mobile poster and train animation unchanged.

## Internal Structure

- Use four explicit locale identifiers for Uzbek Latin, Uzbek Cyrillic, Russian, and English.
- Keep each locale's headline and supporting sentence together in a structure that later scenes can reuse.
- Do not add a public API, database, external service, or permanent language preference.

## Test and Acceptance Plan

- Confirm Uzbek Latin appears by default after the first carriage settles.
- Confirm each language button displays the approved headline and sentence and updates the page language.
- Confirm the caption hides during travel and returns when Scene 1 comes back.
- Confirm the caption is absent from the static mobile experience.
- Confirm the headline and supporting sentence stay fully inside the visible 16:9 film at non-16:9 desktop window sizes.
- Confirm Scene 2 appears only after the 1C carriage settles, supports all four approved translations, and preserves the visitor's selected language from Scene 1.
- Confirm Scenes 3–5 show their approved headline and supporting sentence in every language and preserve the selected language between carriages.
- Confirm Scene 6 uses the right-hand negative space, uses larger typography, stays inside the film, and exposes the correct phone, email, and homepage links.
- Confirm keyboard access, reduced-motion behavior, existing scrolling behavior, linting, automated tests, and the production build all pass.

## Assumptions

- The English wording embedded in the video remains unchanged.
- The language control stays visible on desktop while the caption itself follows Scene 1.
- Refreshing the page returns to Uzbek Latin.
- Scenes 1–5 share the established typography and placement.
- Scene 6 uses +998 55 588 90 00, info@sdq-sfb.com, and https://sdq-sfb.com/.
