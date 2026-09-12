# Mobile Edge-to-Edge Train Experience

## What we are building

Replace the phone's static, letterboxed poster with the complete animated six-carriage journey. Portrait phones will use optimized centered crops; landscape phones will use the existing wide films. The film will fill the entire display, including behind phone and browser controls, while captions and buttons remain inside safe viewing areas.

## Files that will be touched

- `src/app/layout.tsx` — enable Apple's official edge-to-edge viewport behavior.
- `src/app/globals.css` — add full-screen mobile framing, safe-area placement, and mobile caption layouts.
- `src/components/train-story/TrainStory.tsx` — enable the full journey on phones, select the correct film shape, preserve the scene during rotation, and handle swipe gestures.
- `src/components/train-story/VideoStage.tsx` — select portrait or wide media and avoid desktop-only background processing on portrait phones.
- `src/components/train-story/controller.ts` — add a controlled way to settle on the correct carriage after an orientation change.
- `src/components/train-story/input.ts` — normalize vertical phone swipes.
- `tests/train-story-controller.test.mjs` — cover swipe interpretation and orientation settling.
- `tests/e2e/train-story.spec.ts` — replace poster-only mobile coverage with full mobile journey, layout, safe-area, source-selection, and swipe tests.
- `public/video/sdq-train-mobile.mp4` — optimized centered portrait forward film.
- `public/video/sdq-train-mobile-reverse.mp4` — optimized centered portrait reverse film.
- `public/video/sdq-train-mobile-poster.jpg` — matching portrait loading and fallback image.

Existing unrelated uncommitted changes will not be edited, reverted, or included in this work.

## Step-by-step implementation

1. Add failing unit and browser tests for the approved mobile behavior before changing the implementation.
2. Export the three centered 500x1080 portrait media files from the approved wide assets using the installed FFmpeg encoder:
   - H.264 High profile, YUV 4:2:0, 24 frames per second.
   - 721 frames and 30.041667 seconds, matching the existing timeline.
   - Approximately 1.8 Mbps, a keyframe every six frames, fast-start playback, and no audio.
3. Add `viewport-fit=cover` through Next.js's official viewport configuration.
4. Replace the desktop-only decision with a film variant decision:
   - Upright coarse-pointer devices receive portrait media.
   - Desktop and sideways phones receive wide media.
   - Only the selected pair is requested.
5. Keep the film edge-to-edge and centered:
   - Portrait film uses cover framing with equal left and right crop.
   - Wide film preserves the existing contained 16:9 presentation and synchronized edge extension.
6. Add safe-area layout variables using `env(safe-area-inset-*)` with normal spacing fallbacks.
   - The film ignores those insets and extends behind device/browser chrome.
   - Headline, supporting text, greeting, language selector, and contact actions remain inside the safe region.
7. Restore top-and-bottom captions on mobile and remove the Partners scene's centered exception on every screen.
8. Reflow the final mobile contact scene with the headline at the top and tappable contact actions at the bottom.
9. Add vertical pointer-swipe navigation:
   - Up advances and down returns one carriage.
   - Require at least 48 CSS pixels and predominantly vertical movement.
   - Ignore short, sideways, cancelled, multi-pointer, and interactive-control gestures.
   - Preserve pinch zoom and normal link/button interaction.
10. When orientation changes, switch to the appropriate film and settle at the current or intended carriage rather than replaying the introduction.
11. Keep existing wheel, keyboard, language, media-failure, and reduced-motion behavior unchanged.

## Verification

1. Confirm the portrait exports' codec, dimensions, frame rate, frame count, duration, and keyframe spacing.
2. Run unit tests for swipe classification, controller settling, and all existing timeline behavior.
3. Run browser tests at representative iPhone portrait and landscape sizes in Chromium and WebKit.
4. Verify that portrait devices request only portrait media and landscape/desktop screens request only wide media.
5. Verify the film covers the viewport with no cream bands and that injected top, bottom, and side safe-area values keep all important content visible.
6. Verify every mobile scene, language control, contact action, swipe direction, reduced-motion path, and live orientation change.
7. Re-run all desktop caption, animation, wheel, keyboard, fallback, and edge-extension tests.
8. Run linting and a production build.
9. Perform a final visual check on a Dynamic Island-sized Safari viewport; a real iPhone check remains the final confirmation for physical browser chrome.

## Approved decisions

- Phones receive the full animated journey, not a still-only experience.
- Mobile navigation uses vertical swipes.
- Portrait video uses a sharp centered crop rather than blurred extensions.
- Partners captions use top-and-bottom placement on desktop and mobile.
- The mobile contact headline sits at the top and its actions sit at the bottom.
- Optimized mobile media files are included.
- Portrait and landscape phone orientations are both supported.
