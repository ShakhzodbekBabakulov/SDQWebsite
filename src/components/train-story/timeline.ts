export const MEDIA = {
  desktop: {
    forward: "/video/sdq-train-desktop.mp4",
    reverse: "/video/sdq-train-desktop-reverse.mp4",
    poster: "/video/sdq-train-poster.jpg",
  },
  mobile: {
    forward: "/video/sdq-train-mobile-wide.mp4",
    reverse: "/video/sdq-train-mobile-wide-reverse.mp4",
    poster: "/video/sdq-train-mobile-wide-poster.jpg",
  },
} as const;

export const GREETING_FADE_START_FRAME = 84;
export const GREETING_FADE_END_FRAME = 95;

export const FPS = 24;
export const LAST_FRAME = 720;
export const LOOP_DURATION_MS = 4_000;
export const INPUT_IDLE_MS = 180;
export const MIN_TRAVEL_RATE = 1.1;
export const MAX_TRAVEL_RATE = 1.2;

export type Chapter = {
  id: string;
  label: string;
  startFrame: number;
  centreFrame: number;
  endFrame: number;
  restingRate?: number;
};

export const chapters = [
  {
    id: "sdq",
    label: "SDQ consulting",
    startFrame: 108,
    centreFrame: 120,
    endFrame: 132,
  },
  {
    id: "official-1c-partner",
    label: "Official 1C partner",
    startFrame: 228,
    centreFrame: 243,
    endFrame: 258,
  },
  {
    id: "trusted-partnerships",
    label: "Trusted partnerships",
    startFrame: 324,
    centreFrame: 339,
    endFrame: 354,
  },
  {
    id: "support-team",
    label: "Support team",
    startFrame: 408,
    centreFrame: 420,
    endFrame: 432,
  },
  {
    id: "artificial-intelligence",
    label: "Artificial intelligence",
    startFrame: 504,
    centreFrame: 512,
    endFrame: 519,
    restingRate: 0.875,
  },
  {
    id: "lets-talk",
    label: "Let’s Talk",
    startFrame: 606,
    centreFrame: 624,
    endFrame: 642,
    restingRate: 0.875,
  },
] as const satisfies readonly Chapter[];

export const frameToSeconds = (frame: number) => frame / FPS;

export const loopPlaybackRate = (chapter: Chapter) =>
  chapter.restingRate ??
  ((chapter.endFrame - chapter.startFrame) / FPS) /
    (LOOP_DURATION_MS / 2 / 1_000);

export const loopDurationMs = (chapter: Chapter) =>
  (((chapter.endFrame - chapter.startFrame) / FPS) /
    loopPlaybackRate(chapter)) *
  2_000;

export function captionChapterForFrame(frame: number): number | null {
  const index = chapters.findIndex(
    (chapter) => frame >= chapter.startFrame && frame <= chapter.endFrame,
  );
  return index === -1 ? null : index;
}
