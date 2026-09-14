# SDQ /more/ public website migration — approved 2026-09-14

The user approved implementing the complete revised PR #5 plan, including review,
merge, Cloudflare preview and production publication. The animated homepage stays
at `/`; Russian and both Uzbek contact actions open `/more/`, English `/more/en/`.
All old-site internal navigation stays under `/more/` in the same tab. Public
content, appearance, images, downloads and language navigation are included.
Joomla administration and enquiry processing are excluded; replace forms with
clearly labelled phone/email links. No origin hostname is needed at runtime.

## Implementation steps

1. Recover and inventory public pages and assets from the existing host; do not
   publish private backups, configuration, database exports or incomplete content.
2. Add the static pages/assets under `public/more/` and a reproducible import
   script under `scripts/`. Keep old-site styling scoped to separate HTML pages.
3. Update `src/components/train-story/captions.ts` and destination tests to use
   same-origin paths; remove the development legacy-origin override.
4. Update `tests/legacy-site.test.mjs`, `tests/e2e/legacy-navigation.spec.ts`,
   `tests/e2e/train-story.spec.ts`, README and `docs/legacy-website.md`.
5. Run unit tests, lint, TypeScript, build, full Chromium and focused Firefox/
   WebKit checks. Crawl pages/assets and check mobile menus, language switching,
   keyboard navigation, contact links and direct nested-page refreshes.
6. Review the entire final PR and dependencies. Publish a Cloudflare preview and
   verify it. Merge the exact tested revision, build merged main, publish to the
   existing Pages project, then verify live URLs. Restore the prior deployment
   if live verification fails. Pushing/merging alone does not publish this site.

## Progress

- Checked out PR #5 at 3cc36c3 in `/private/tmp/sdq-more`.
- No recovery archive found in local project/download folders. Public Joomla
  homepage is accessible via its known origin with validated HTTPS (HTTP 200).
- Read installed Next.js static-export/public-folder documentation.
- Recovered 33 pages and 160 assets, including local fonts/licenses. Removed
  enquiry forms, keepalive, CSRF values and obsolete font references.
- Application changes, importer, inventory and tests implemented and reviewed.
- 34 unit tests; lint, TypeScript, build; 61/61 full Chromium tests; 30/30 focused
  Chromium/Firefox/WebKit navigation checks pass. Screenshots inspected.
- Next: verify hosted preview, merge the reviewed revision, publish merged main,
  and verify production. Prior deployment recorded in the hosting guide.

---

# Previous completed plan: SDQ mobile cinematic experience

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

The site went live at https://sdq-sfb.com on 2026-09-14 via Cloudflare Pages (see README "Deploy"). Remaining: physical-device acceptance items listed above, now checked against the live address.

## Approved landscape fit correction — 2026-09-14

Goal: show the complete train and readable overlays after iPhone Safari rotation, with its bars expanded or collapsed. Baseline reproduced in iPhone 17 Pro Simulator / iOS 26.5: landscape crops the wheels while Safari bars are expanded; browser-only rotation coverage missed it.

1. Preserve this baseline and compare native visible geometry before/after.
2. In src/app/globals.css, use visible 100dvh height for the short touch-landscape foreground, video and film blend geometry; retain 100lvh scrolling stops/background. Keep overlays and contact controls inside visible safe areas.
3. In src/components/train-story/VideoStage.tsx, observe actual stage resizing and repaint soft edges from the current decoded frame, including paused/reduced-motion states; disconnect on cleanup. Preserve player instances and sources.
4. In tests/e2e/train-story.spec.ts, cover film bounds, overlays, rotation, independent visible/large heights, and edge repainting without window resizing.
5. Run unit tests, lint, build, browser regressions, then native iPhone Simulator rotation and expanded/collapsed bar checks across all scenes. Make the verified local preview available for physical-iPhone acceptance.

Preserve portrait/tablet/desktop appearance, all content and media, native scrolling and pinch zoom. No packages, public interface changes, merge or deployment.

### Landscape correction verification

- Implemented visible-height landscape film/foreground and matching blend geometry; preserved large-height chapter stops and background. Added stage ResizeObserver repaint with cleanup and safe-area-centered landscape contact panel.
- 32 unit tests pass; ESLint, production build, and diff whitespace check pass. The isolated worktree uses a local copy of existing dependencies because Turbopack rejects a symlink outside its project root. The normal build fetched the existing fonts with network permission; no dependency/config changes.
- New regression cases failed on baseline for the intended film-overflow and paused-edge-resize defects. Final new coverage: 9/9 pass across Chromium, Firefox and WebKit; both compact sizes, all six scenes and four languages, safe areas, and stage-only resizing without window resize. Test setup explicitly notifies the controller once after overriding large-height geometry; this is not a physical Safari toolbar simulation.
- Existing browser suite: 137/141 passed in the combined run. Two Chromium cases failed when concurrent test runs shared an artifact directory; one Chromium paused-time precision check and one WebKit frame-sampling tolerance check also failed. Isolated one-worker rerun of the corresponding six Chromium/WebKit cases passed 6/6 with unchanged application code. All 150 browser cases have passed across final full/focused/rerun coverage; not a single clean 150-case invocation.
- Native iPhone 17 Pro Simulator / iOS 26.5: inspected all six English scenes with expanded Safari bars, both landscape orientations, direct landscape opening, and portrait return retaining the contact scene. Full train and contact controls visible. Expanded-bar native measurements: innerHeight=visualViewport.height=stage.height=292; collapsed=402; scale=1; scene scroll stop remains 402. Collapsed-bar partner/contact captures also inspected.
- Native captures are in /private/tmp/sdq-landscape-fixed-expanded.png, /private/tmp/sdq-landscape-fixed-opposite.png, /private/tmp/sdq-landscape-fixed-fresh.png, /private/tmp/sdq-landscape-native-four.png, /private/tmp/sdq-landscape-native-five.png, /private/tmp/sdq-landscape-native-contact.png and /private/tmp/sdq-landscape-native-contact-collapsed.png. Full browser-bar animation smoothness and physical-iPhone acceptance remain device checks; the correction follows Safari's native dynamic viewport updates.
- Read-only review found no material issues. Fixed production preview runs on port 3000 from this worktree; user phone URL: http://192.168.1.104:3000 on the same Wi-Fi. Changes remain local on codex/landscape-fit; no merge, push or deployment.

Next: user checks the fixed local preview on their physical iPhone before shipping.

### Rotation transition follow-up

- User supplied a physical Safari screenshot showing only the blurred background and an enlarged, displaced language control, then reported that the layout eventually adapts. Earlier settled-layout checks did not cover this delay.
- Reproduced the same transition in native iPhone Safari Simulator twice. Geometry becomes correct at resize, but animation-frame sampling then pauses for about 4.2 seconds, followed by another roughly 2-second gap. The physical phone's passive measurement connection is working; its rotation trace is still pending.
- Compared an isolated preview using Babakulov.live's existing landscape scroll-timeline positioning. The train remained visible in the first post-rotation capture and the next animation sample arrived after 144ms. Reverting to the original positioning reproduced the blank view again.
- Apply that native positioning only within the existing short touch-landscape rule and feature detection. Preserve visible-height sizing, portrait sticky framing, chapter stops, source videos, and the sticky fallback for unsupported browsers.
- Verify the actual production build with native rotation captures and existing cross-browser rotation, landscape, chapter, contact, and fallback checks before reporting completion. No merge or deployment.
- Physical baseline confirmed after the user rotated the measured Safari page: dimensions changed from 393x695 to 852x283 and zoom remained 1. The next animation samples arrived after gaps of 11,063ms and 5,654ms, matching the reported delayed adaptation.
- The first cross-browser pass exposed two failures at 667x280 with test-overridden chapter height: a literal 600lvh animation range ended before the six taller stops. The landscape range now derives from `calc(6 * var(--mobile-large-height))`, keeping translation and chapter spacing aligned.
- Final production build, whitespace check, and all 32 unit tests pass. All 27 focused Chromium/Firefox/WebKit checks pass in one single-worker run, covering both compact landscape sizes, all chapters and languages, contact controls, portrait, rotation/media preservation, tablets, ambience fallback, and paused edge repainting.
- Native Safari Simulator production verification: first rotation capture retains the train, with animation sampling resuming after 123ms instead of the reproducible multi-second baseline pause. Final shared-height build inspected in both landscape directions. Captures: /private/tmp/sdq-rotation-built-fix.png, /private/tmp/sdq-rotation-final-opposite.png, /private/tmp/sdq-rotation-final-left.png; repeated baseline: /private/tmp/sdq-rotation-baseline-repeat.png.
- The corrected page has been opened on the physical iPhone, and the user was asked to repeat rotation. At completion of local checks, that second rotation had not yet arrived. Physical corrected-Safari confirmation and physical Chrome rotation remain pending; the simulator and desktop browser engines do not establish those results. No deployment, push, or merge.
- Acceptance update: the user subsequently confirmed the corrected Safari rotation works on the physical iPhone, then confirmed all works fine and authorized commit, push, and merge. This is user-reported acceptance; no additional automated physical-Chrome result is claimed.

## Approved video-delivery extension — 2026-09-14

The user approved fixing the inherited Cloudflare Pages video-range limitation
before completing merge/publication. Keep all public URLs and player code intact.
Use a dedicated Cloudflare R2 bucket for the four active MP4 files and a native
Pages Function on their existing /video/ paths. Use immutable content-hash storage
keys, standard HTTP range/conditional responses and R2's native ranged reads.

Files: `functions/video/[file].js`, `cloudflare/video-manifest.json`,
`scripts/prepare-video.mjs`, `scripts/upload-video.mjs`, `wrangler.jsonc`,
`public/_routes.json`, package scripts, HTTP range tests and deployment docs.
Build generates the manifest from the existing MEDIA mapping. Upload verified
files before preview/production deployment; preserve the existing Pages project.
Verify exact first/middle/suffix bytes, HEAD, 416, conditional requests, browser
seeking/reduced-motion navigation, and the complete hosted /more/ crawl. Merge
only the reviewed tested revision after preview checks pass.
