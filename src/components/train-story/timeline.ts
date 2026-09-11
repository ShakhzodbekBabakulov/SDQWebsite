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
  },
  {
    id: "lets-talk",
    label: "Let’s Talk",
    startFrame: 606,
    centreFrame: 624,
    endFrame: 642,
  },
] as const satisfies readonly Chapter[];

export const frameToSeconds = (frame: number) => frame / FPS;

export const loopPlaybackRate = (chapter: Chapter) =>
  ((chapter.endFrame - chapter.startFrame) / FPS) /
  (LOOP_DURATION_MS / 2 / 1_000);
