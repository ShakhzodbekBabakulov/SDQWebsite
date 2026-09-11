# Browser verification

Verified locally against the production build on 2026-09-11.

## Automated checks

- 14 unit checks cover the approved timeline, four-second timing for the first four loops, natural 0.875x speed for the final two loops, wheel normalization, the 1.10x-1.20x speed band, gesture locking, reversal, boundaries, wrapping, reduced motion, keyboard input, and forward/reverse frame mapping.
- 21 browser checks pass: seven acceptance scenarios in Chromium, Firefox, and WebKit.
- The browser checks cover long gesture locking, immediate reversal, hidden-tab handoffs, reduced-motion still frames, poster-only small screens, media failure recovery, fixed page position, single-layer visibility, and contain framing at 1366x768, 1440x900, and 2560x1080.
- Three complete SDQ-to-contact-to-SDQ circuits ran in Chromium with the expected chapter order, one visible movie layer, zero page movement, and no console errors.

## Build and dependency checks

- ESLint passes without warnings or errors.
- The optimized Next.js production build passes TypeScript checking and static generation.
- The dependency audit reports zero known vulnerabilities.

## Manual acceptance remaining

The founder's physical mouse and trackpad feel review remains intentionally manual.
