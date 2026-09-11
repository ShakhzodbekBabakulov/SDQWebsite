# SDQ Desktop Video-Scrolling Website

## Summary

Create an independent Next.js website that turns the approved 30-second train film into a fixed, full-screen desktop journey. The browser page never moves; scrolling controls native video playback between six carriage chapters.

This session delivers only the film and scrolling mechanics. No visible headlines, service descriptions, navigation, contact buttons, deployment, or mobile experience.

## Implementation Changes

1. Create private version history and an official Next.js App Router project using TypeScript, ESLint, standard CSS, and no animation or scrolling library.
2. Preserve the approved master outside the public website and create matching forward and reverse H.264 browser movies plus an opening poster.
3. Define six chapter ranges: SDQ 108-132 (centre 120), 1C 228-258 (centre 243), partnerships 324-354 (centre 339), support 408-432 (centre 420), AI 504-546 (centre 525), and contact 606-648 (centre 627).
4. Give every chapter an exact four-second forward/back resting loop.
5. Auto-play the opening arrival to SDQ, then allow exactly one adjacent carriage per deliberate gesture.
6. Let continued gesture momentum adjust travel speed only within 1.10x-1.20x; it must never select another carriage.
7. Reverse immediately from the visible frame when opposite input arrives during travel.
8. Block upward travel at SDQ. From contact, play the departure, return to frame 0, replay the arrival, and absorb leftover momentum until SDQ settles.
9. Keep the page fixed, contain the entire 16:9 frame, blend margins into the pale studio background, and show a poster until decoded video is ready.
10. Provide keyboard, reduced-motion, hidden-tab, media-recovery, and poster-only non-desktop behavior without visible website overlays.

## Interfaces and Failure Behaviour

- A timeline record exposes each chapter identifier, label, loop boundaries, and centre frame.
- A pure playback controller accepts normalized wheel or keyboard intent and returns direction, speed, frame, and optional destination commands.
- The video stage applies commands, reports the displayed source frame, reports readiness, and retries failed media.
- Direction changes keep the current picture visible until the matching frame in the other movie is decoded.
- Media failures retain the poster and retry on a later deliberate interaction.
- No external API, analytics, database, or user data is introduced.

## Test and Acceptance Plan

- Unit-test input normalization, bounded speed, exact loop timing, gesture locking, reversal, boundaries, wrapping, reduced motion, and keyboard controls.
- Verify both browser movies decode completely and match the master dimensions, duration, frame count, and forward/reverse mapping.
- Verify a production build in Chrome, Firefox, and WebKit-sized desktop environments, including laptop, standard desktop, and ultrawide framing.
- Assert zero page movement, one visible movie, no chapter skipping, no black frames or flashes, and no browser errors.
- Test slow/failing media, repeated reversals, resizing, hidden-tab recovery, three complete circuits, and poster-only non-desktop loading.
- Finish with a physical mouse and trackpad review. Do not push, publish, or deploy in this session.

## Assumptions

- English chapter labels appear only in invisible accessibility announcements.
- Resting loops last four seconds and a gesture ends after 180ms without wheel signals.
- The six approved still images remain reference material; the website displays the film.
- The accepted master remains unchanged and is the source of truth for final frame confirmation.
