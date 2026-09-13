# Browser verification — mobile cinematic experience

Local production build, 2026-09-13. Worktree `.worktrees/mobile-cinematic`, branch `codex/mobile-cinematic`. No deployment.

## Baseline and desktop preservation

Before player changes, the unchanged main build passed 104 of 105 browser cases across Chromium, Firefox and WebKit. The one pre-existing failure was Firefox's simulated safe-area comparison: 798.0000305175781px against 798px. The baseline report remains at `/private/tmp/sdq-mobile-baseline/html-report/index.html`.

All six chapter centre frames at both 1280×720 and 1440×900 were recaptured against the updated player. All twelve images are identical after decoding to RGB pixels. References and results are checked in under [desktop-before](mobile-cinematic/desktop-before), [desktop-after](mobile-cinematic/desktop-after), and [desktop-comparison.json](mobile-cinematic/desktop-comparison.json). These screenshots establish matching-frame appearance; motion behavior is checked separately.

## Automated coverage

- 32 unit tests cover authoritative chapter and caption ranges, rates, scroll selection, device media selection, destination skips/reversals, gesture boundaries, wrapping, reduced motion, and forward/reverse mapping.
- Browser tests retain desktop caption, greeting, controls, framing, navigation and canvas-recovery assertions.
- Mobile layout checks cover six native 100lvh stops, portal-mounted ambient frames, reduced-motion stills, all four languages at 320×568, contact destinations, 44px controls, stable video elements through phone rotation, landscape contact placement, touch-tablet desktop media, screen-reader descriptions/contact links, and both native and forced fallback background positioning.
- Real-decoding tests cover destination changes in both directions, measured loop round trips, delayed reverse delivery, active-decoder reload, visibility suspension near the final departure, synchronous cancellation during frame publication, missing frame callbacks, and persistent autoplay rejection followed by the visible retry button. Recovery tests do not repair the video clock or call play themselves.
- Synthetic touch events test the fresh final swipe and opening refresh permission. They cannot reproduce operating-system momentum or pull-to-refresh behavior.
- Pinch zoom remains allowed by the viewport settings and `touch-action: pan-y pinch-zoom`; actual magnification and assistive-technology use require a device review.

## Run results

The final combined 141-case run (three workers, 6.5 minutes) passed 137 and failed four. Report: `/private/tmp/sdq-final-all-report/index.html`. These failures are retained rather than described as an uninterrupted green run:

- Firefox Partners sent its first wheel while the native clock had reached frame 108 but the confirmed picture was still frame 107/opening. The wait helper now uses confirmed displayed frames before the next gesture. All six focused opening/Partners checks passed across Chromium, Firefox and WebKit (55 seconds). Report: `/private/tmp/sdq-final-confirmed-arrival-report/index.html`.
- WebKit completed navigation but had a maximum same-direction publication gap of 13 frames against a 12-frame limit; measured loops were 5,193/5,060/4,883 ms against the 4,700 ms upper bound; the ultrawide ambient check saw the native clock ahead of delivered pictures while ambient and confirmed stage frames stayed aligned. Two concurrent WebKit GPU processes used 231.5% and175% CPU in a diagnostic snapshot.
- The three affected WebKit cases passed unchanged with one worker (1.6 minutes), including loop roundtrips 4,577/4,443/4,268 ms. Report: `/private/tmp/sdq-final-isolated-webkit-report/index.html`. This supports rendering contention as the cause of those failures; real decoding still adds latency and four-second wall-clock precision is not claimed under load.

All 141 cases have now passed across the final combined run and focused reruns. The four failures above remain documented with their causes and follow-up evidence.

Earlier and focused runs:

- Main regression suite: **111/111 passed** (37 per engine), 7.4 minutes. Report: `/private/tmp/sdq-mobile-regression-final/playwright-report/index.html`.
- Following the metadata-only startup fix, **21/21 opening, greeting and initial-load recovery checks passed** across all three engines. Report: `/private/tmp/sdq-startup-smoke-report/index.html`.
- Recovery suite: all nine scenarios have passed across the three engines after targeted test synchronization updates; the strengthened metadata-only startup/rejected-play/tap case passed in all three engines. The initial eight-scenario full run passed 23/24; a WebKit loop sample-window assertion was replaced with measurements anchored on actual direction flips, and final-two-loop sampling now waits for confirmed loop-rate activation.
- Measured first-chapter WebKit roundtrips were 4,357, 4,180 and 4,268 ms in the focused run. Source playback rates retain the four-second nominal loop duration; real browser decoding/handoffs add latency. The test accepts 3.4–4.7 seconds and does not claim frame-exact wall-clock timing.
- Additional mobile canvas-failure checks passed in all three engines at confirmed frames 120, 420 and 624, with the blurred poster visible, exactly one sharp film layer, and captions still available. See [mobile-canvas-checks.json](mobile-cinematic/mobile-canvas-checks.json).
- After locking media selection across resizing, **21/21 mobile layout, tablet, rotation and resize-continuity checks passed**, including three new resize cases. Report: `/private/tmp/sdq-final-mobile-report/index.html`. The final main suite contains 114 cases; the full 111-case run plus focused reruns cover all of them.
- After the real iPhone exposed metadata-only reverse seeking, an explicit incoming-decoder play request was added. **12/12 focused recovery cases passed** across the three engines: metadata-only reverse with rejection/tap retry, delayed reverse download, decoder reload and synchronous publication cancellation. There are now nine recovery scenarios (27 engine cases).
- Final source passes 32 unit tests, lint and the normal production build.
- The actual iPhone exposed Safari re-selecting the old chapter snap target during the return cut. Root snapping and stop alignment now pause during wrap, then restore after the opening rests at the top and native scroll signals are quiet. The strengthened wrap check passed all three engines, including unchanged six-stop geometry and at least one second of stable top position.
- Final matching-frame capture exposed a one-frame reduced-motion overshoot after decoder startup. Held frames now require exact decoded-frame equality and re-confirm a paused seek when necessary. All twelve desktop captures from this final build are pixel-identical to the baseline; the strengthened reduced-motion and wrap checks passed 6/6 across the three engines. The still test waits for confirmed frames and paused playback, then verifies 250ms of stability, avoiding a race against the native clock setter.

Compact machine-readable results: [browser-results.json](mobile-cinematic/browser-results.json).

## Visual records

[Browser mobile screenshots](mobile-cinematic/browser-mobile) include 320×568 and 390×844 portrait phones, 844×390 landscape, and a 1024×768 touch tablet, each at chapters 1, 3 and 6. These are browser captures, not physical-device screenshots. The portrait central film is enlarged 1.2×; landscape and tablet preserve the full wide composition. The mobile ambient canvas and mirrored edges remain independent from the sharp film.

## Physical-device verification

The corrected test proxy now preserves JavaScript and video delivery correctly. Earlier fresh-origin script-loading failures came from sending decompressed response bodies with compressed headers; those observations are not website initialization regressions.

The real iPhone 14 Pro verified startup, looping in both directions, all six forward chapters, the complete final departure/return with stable scroll at the opening, and reverse travel back through the chapters. Two physical failures were corrected: a metadata-only incoming decoder needed an explicit muted play request, and Safari needed snapping suspended while the film cut back to its opening.

Uncropped portrait screenshots show readable content and contact links clear of Safari’s expanded and collapsed controls. Landscape telemetry confirms ready playback and content bounds inside the viewport; Safari’s accessibility diagnostic became unavailable before a settled landscape screenshot or background-return check. VoiceOver, pinch zoom and physical pull-to-refresh remain untested. See the [physical iPhone report](mobile-cinematic/device/iphone-safari.md) and its screenshots. The temporary proxy, token and helper apps were removed.

Android Debug Bridge is not installed and no Android Chrome device was available. Unperformed physical cases are recorded explicitly; browser geometry alone is not treated as proof of Safari toolbar behavior.
