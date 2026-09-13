# SDQ mobile cinematic experience

Approved 2026-09-13. Reference: Babakulov.live commit `c0fecf000727475d9e658b19054433219e98ee0d`.
Work locally. No deployment, branding changes, dependencies, desktop redesign or film replacement.

## Steps

1. Record this approved plan, capture matching-frame desktop screenshots and run existing browser tests before editing the player. Preserve all original media.
2. Enable native document scrolling below 768px or with coarse primary pointer. Six stable 100lvh stops, proximity snapping, nearest-stop selection. Extend the existing controller with chapter destinations, continuous travel from displayed frames, repeated reversals, multi-stop travel and approved destination loops. Internal retries must not prolong gesture guards.
3. Preserve opening, six chapter ranges, four-second first-four loops and final-two rates. A fresh >=48px upward swipe after final arrival plays departure through frame 720, cuts to opening and resets scroll. Absorb its momentum; add no seventh chapter. Ignore interactive, cancelled and multi-touch gestures. Prevent ongoing reversal becoming refresh; allow fresh deliberate pull at resting opening.
4. Export new uncropped mobile forward/reverse films: 1280x720 H.264/yuv420p, CRF21, 24fps, 721 frames, 30.041667 seconds, silent, six-frame keyframes, fast-start MP4. Preserve master and old exports. Keep phone sources stable through rotation; tablets/desktop use existing wide files.
5. Use 1.2x centered portrait-phone enlargement; full composition on landscape/tablets. Separate bounded sharp foreground/overlays from portal-mounted moving ambient canvas and blurred poster. Separate mirrored-edge canvas. Adapt complete reference cascade: stable 100lvh geometry, visible 100dvh overlays, safe areas, feature-detected scroll-driven background and fallback, bounded sticky portrait foreground. Derive final decorative continuation from this film geometry, never assume 64px. Preserve anchors, vertical panning, pinch zoom and 44px touch controls.
6. Harden handoffs: pause superseded outgoing playback, retain its picture, confirm incoming decoded frame, discard stale async work including after frame publication, synchronize ended videos before play, recover missing callbacks/ended/emptied/visibility/autoplay, clean listeners/watchers/timers. Centralize paths and caption timing in timeline. Mobile captions follow confirmed displayed frames; desktop preserves existing presentation. Reduced motion uses stills. Accessible chapter content and mobile tap-to-play/retry.
7. Verify and document actual results and limitations. No unrelated frame jumps, persistent freezes, blank frames, clipped captions, moved desktop controls or bottom strips.

## Files to change

- src/components/train-story/TrainStory.tsx — scrolling, destinations, structure, refresh, accessibility
- src/components/train-story/VideoStage.tsx — sources, portal, drawing, handoffs, recovery
- src/components/train-story/controller.ts — chapter destination API preserving desktop intent
- src/components/train-story/input.ts — scroll/device/boundary helpers
- src/components/train-story/timeline.ts — media and caption timing
- src/app/globals.css — mobile layout and controls
- tests/train-story-controller.test.mjs, tests/media-math.test.mjs — navigation/media contracts
- tests/e2e/train-story.spec.ts — retain desktop assertions, replace obsolete mobile expectations, add real-decoding recovery and layout checks
- public/video/sdq-train-mobile-wide.mp4, sdq-train-mobile-wide-reverse.mp4, sdq-train-mobile-wide-poster.jpg — new media only
- docs/verification/media.md, docs/verification/browser.md — reproducible verification
- docs/verification/mobile-cinematic/ — screenshots and compact records
- PLAN.md — plan and progress

## Verification

Unit tests, lint, normal production build, Chromium/WebKit/Firefox browser tests.
Every chapter both ways; repeated reversal; multi-stop travel; loops and timing; delayed reverse delivery; superseded activation; missing final callbacks; ended/emptied and visibility recovery; blocked autoplay; small phones, portrait/landscape/rotation, tablets and desktop; supported/fallback background positioning; browser controls; boundary swipes versus refresh; all four languages; links and 44px targets; pinch zoom; reduced motion; screen-reader content; canvas failure fallback; matching-frame desktop screenshot comparison.
Validate media metadata, full decode, frame correspondence, keyframes, fast-start and HTTP partial delivery.
Use real decoding; recovery tests must not manually repair the player. Test actual iPhone Safari and Android Chrome where available and disclose missing coverage. Safari toolbar correctness requires uncropped physical screenshots during reversal and after controls settle. Do not inherit reference verification claims.

## Progress

- Approved plan recorded before implementation in isolated branch `codex/mobile-cinematic`.
- Original main checkout and every original film/poster preserved. Baseline browser run: 104/105 passed; one pre-existing fractional-pixel Firefox safe-area failure recorded.
- Native six-stop mobile journey, destination controller, final swipe wrap, portal ambient/soft-edge layout, decoded-frame captions, recovery and accessibility implemented.
- New mobile media verified: 1280×720 H.264/yuv420p, 721 frames at 24 fps, 121 keyframes six frames apart, full decoding, fast-start and HTTP 206 range delivery. Forward/reverse correspondence: 46.029158 dB average PSNR.
- 32 unit tests, lint and normal production build pass. All twelve desktop centre-frame captures match the baseline pixel for pixel.
- Final browser verification: 137/141 passed in the combined run. One test-input arrival race was corrected; three WebKit timing/frame-delivery failures passed unchanged with one browser worker. Six cross-browser opening/Partners checks passed after the test correction. All 141 cases have passed across final full and focused runs; exact failures and performance limits are recorded in docs/verification/browser.md.
- Physical iPhone startup, reverse loops and all six forward chapters work, with uncropped screenshots. Safari’s remembered snap target caused scroll oscillation during the return cut; native snapping now pauses for wrap and restores at the resting opening. Three-engine wrap checks and physical iPhone wrap now pass, with stable scroll at the opening. Reverse travel back to the opening also passes. Landscape telemetry passed, but a native testing-interface failure prevented the settled landscape screenshot and background-return check. VoiceOver, pinch zoom and physical pull-to-refresh remain untested. Android coverage remains unavailable.

## Implementation notes

- Added `tests/e2e/mobile-recovery.spec.ts` to separate real-decoding recovery from desktop/layout regression assertions.
- Updated `playwright.config.ts` with `SDQ_PREVIEW_URL` so tests can avoid the unrelated site on port 3000; the normal default remains port 3000.
- Portrait film uses the approved 1.2× enlargement. A mobile-only 12px outer-edge blend complements the mirrored canvas and leaves the centre sharp.
- Landscape contact actions use the artwork's empty right side; small-phone captions and contact links retain 44px touch targets.
- Persistent screen-reader chapter descriptions include contact links. Their duplicate hidden links are excluded from ordinary keyboard tab order; the visible contact controls remain keyboard-accessible.
- Verification records include desktop before/after captures and emulated phone/tablet images. No dependencies, viewport settings or deployment configuration were changed.

- Final media selection is retained for the mounted page lifetime. Crossing the mobile layout breakpoint preserves the same video elements, intended chapter and paused frame; geometry still adapts independently.
- Metadata-only startup now makes an explicit muted play request, with native tap retry and visibility-return recovery before the first decoded frame.

- Physical Safari required explicit playback for the hidden incoming decoder while it was metadata-only. Its outgoing picture stays visible until the incoming frame is confirmed. Twelve focused cross-browser recovery cases pass after this fix.
- During wrap, root snapping and all stop alignments temporarily become `none`, without moving anchors. Restoring snapping waits for the opening, top position and 250ms of quiet.
- Reduced-motion holds require the exact approved frame, including after metadata-only decoder startup.

## What to do next

Review the local mobile preview and complete remaining physical-device acceptance before any deployment. No deployment or merge was performed.
