"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Image from "next/image";

import type { PlaybackCommand } from "./controller.ts";
import type { Direction } from "./input.ts";
import {
  mediaTimeToSourceFrame,
  sourceFrameToMediaTime,
} from "./media-math.ts";

const FORWARD_SOURCE = "/video/sdq-train-desktop.mp4";
const REVERSE_SOURCE = "/video/sdq-train-desktop-reverse.mp4";
const POSTER_SOURCE = "/video/sdq-train-poster.jpg";

type VideoStageProps = {
  onComplete: (displayedFrame: number) => void;
  onError: () => void;
  onReady: () => void;
};

export type VideoStageHandle = {
  apply: (command: PlaybackCommand) => void;
  displayedSourceFrame: () => number;
  isReady: () => boolean;
  retry: () => void;
  pause: () => void;
  resume: () => void;
};

type FrameCallback = (mediaTime: number) => void;

function nextPresentedFrame(video: HTMLVideoElement, callback: FrameCallback) {
  const frameVideo = video as HTMLVideoElement & {
    requestVideoFrameCallback?: HTMLVideoElement["requestVideoFrameCallback"];
    cancelVideoFrameCallback?: HTMLVideoElement["cancelVideoFrameCallback"];
  };

  if (
    typeof frameVideo.requestVideoFrameCallback === "function" &&
    typeof frameVideo.cancelVideoFrameCallback === "function"
  ) {
    const id = frameVideo.requestVideoFrameCallback((_now, metadata) => {
      callback(metadata.mediaTime);
    });
    return () => frameVideo.cancelVideoFrameCallback?.(id);
  }

  const id = window.requestAnimationFrame(() => callback(video.currentTime));
  return () => window.cancelAnimationFrame(id);
}

export const VideoStage = forwardRef<VideoStageHandle, VideoStageProps>(
  function VideoStage({ onComplete, onError, onReady }, ref) {
    const forwardVideoRef = useRef<HTMLVideoElement>(null);
    const reverseVideoRef = useRef<HTMLVideoElement>(null);
    const generationRef = useRef(0);
    const displayedFrameRef = useRef(0);
    const activeDirectionRef = useRef<Direction>(1);
    const readyRef = useRef(false);
    const readyReportedRef = useRef(false);
    const suspendedRef = useRef(false);
    const activeWasPlayingRef = useRef(false);
    const [activeDirection, setActiveDirection] = useState<Direction>(1);
    const [hasDecodedFrame, setHasDecodedFrame] = useState(false);

    const videos = useCallback(() => {
      const forward = forwardVideoRef.current;
      const reverse = reverseVideoRef.current;
      if (!forward || !reverse) return null;
      return { forward, reverse };
    }, []);

    const videoFor = useCallback(
      (direction: Direction) => {
        const pair = videos();
        if (!pair) return null;
        return direction === 1 ? pair.forward : pair.reverse;
      },
      [videos],
    );

    const pauseBoth = useCallback(() => {
      const pair = videos();
      pair?.forward.pause();
      pair?.reverse.pause();
    }, [videos]);

    const waitForMetadata = useCallback((video: HTMLVideoElement) => {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          video.removeEventListener("loadedmetadata", handleReady);
          video.removeEventListener("error", handleError);
        };
        const handleReady = () => {
          cleanup();
          resolve();
        };
        const handleError = () => {
          cleanup();
          reject(new Error("Video metadata could not be loaded."));
        };
        video.addEventListener("loadedmetadata", handleReady, { once: true });
        video.addEventListener("error", handleError, { once: true });
      });
    }, []);

    const seekToFrame = useCallback(
      async (
        video: HTMLVideoElement,
        direction: Direction,
        sourceFrame: number,
      ) => {
        await waitForMetadata(video);
        const mediaTime = sourceFrameToMediaTime(sourceFrame, direction);
        video.pause();

        if (
          Math.abs(video.currentTime - mediaTime) < 1 / 48 &&
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          displayedFrameRef.current = sourceFrame;
          return;
        }

        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            video.removeEventListener("seeked", handleSeeked);
            video.removeEventListener("error", handleError);
          };
          const handleSeeked = () => {
            cleanup();
            displayedFrameRef.current = sourceFrame;
            resolve();
          };
          const handleError = () => {
            cleanup();
            reject(new Error("Video seek failed."));
          };
          video.addEventListener("seeked", handleSeeked, { once: true });
          video.addEventListener("error", handleError, { once: true });
          video.currentTime = mediaTime;
        });
      },
      [waitForMetadata],
    );

    const reveal = useCallback(async (direction: Direction) => {
      activeDirectionRef.current = direction;
      setActiveDirection(direction);
      setHasDecodedFrame(true);
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
    }, []);

    const alignAndReveal = useCallback(
      async (direction: Direction, sourceFrame: number, token: number) => {
        const video = videoFor(direction);
        if (!video) throw new Error("Video layers are unavailable.");
        pauseBoth();
        await seekToFrame(video, direction, sourceFrame);
        if (token !== generationRef.current) return null;
        await reveal(direction);
        return video;
      },
      [pauseBoth, reveal, seekToFrame, videoFor],
    );

    const playUntil = useCallback(
      async (
        direction: Direction,
        fromFrame: number,
        toFrame: number,
        rate: number,
        token: number,
      ) => {
        const video = await alignAndReveal(direction, fromFrame, token);
        if (!video || token !== generationRef.current) return false;

        video.playbackRate = rate;
        if (!suspendedRef.current) {
          await video.play();
        }

        return await new Promise<boolean>((resolve) => {
          let cancelFrame = () => {};

          const inspect = (mediaTime: number) => {
            if (token !== generationRef.current) {
              resolve(false);
              return;
            }

            const frame = mediaTimeToSourceFrame(mediaTime, direction);
            displayedFrameRef.current = frame;
            const reached = direction === 1 ? frame >= toFrame : frame <= toFrame;

            if (reached) {
              video.pause();
              void seekToFrame(video, direction, toFrame)
                .then(() => resolve(token === generationRef.current))
                .catch(() => resolve(false));
              return;
            }

            cancelFrame = nextPresentedFrame(video, inspect);
          };

          cancelFrame = nextPresentedFrame(video, inspect);
          void cancelFrame;
        });
      },
      [alignAndReveal, seekToFrame],
    );

    const failSafely = useCallback(() => {
      pauseBoth();
      onError();
    }, [onError, pauseBoth]);

    const runSegment = useCallback(
      async (
        command: Extract<
          PlaybackCommand,
          { type: "play" | "cut-and-play" }
        >,
        token: number,
      ) => {
        try {
          const completed = await playUntil(
            command.direction,
            command.fromFrame,
            command.toFrame,
            command.rate,
            token,
          );
          if (completed && token === generationRef.current) {
            onComplete(displayedFrameRef.current);
          }
        } catch {
          failSafely();
        }
      },
      [failSafely, onComplete, playUntil],
    );

    const runLoop = useCallback(
      async (
        command: Extract<PlaybackCommand, { type: "loop" }>,
        token: number,
      ) => {
        try {
          let direction: Direction =
            Math.abs(displayedFrameRef.current - command.endFrame) <
            Math.abs(displayedFrameRef.current - command.startFrame)
              ? -1
              : 1;

          while (token === generationRef.current) {
            const fromFrame =
              direction === 1 ? command.startFrame : command.endFrame;
            const toFrame =
              direction === 1 ? command.endFrame : command.startFrame;
            const completed = await playUntil(
              direction,
              fromFrame,
              toFrame,
              command.rate,
              token,
            );
            if (!completed) return;
            direction = direction === 1 ? -1 : 1;
          }
        } catch {
          failSafely();
        }
      },
      [failSafely, playUntil],
    );

    const apply = useCallback(
      (command: PlaybackCommand) => {
        const pair = videos();
        if (!pair) return;

        if (command.type === "rate") {
          const active = videoFor(activeDirectionRef.current);
          if (active) active.playbackRate = command.rate;
          return;
        }

        if (command.type === "pause") {
          activeWasPlayingRef.current = !(
            pair.forward.paused && pair.reverse.paused
          );
          pauseBoth();
          return;
        }

        const token = ++generationRef.current;

        if (command.type === "hold") {
          void alignAndReveal(1, command.frame, token).catch(failSafely);
          return;
        }

        if (command.type === "loop") {
          void runLoop(command, token);
          return;
        }

        void runSegment(command, token);
      },
      [alignAndReveal, failSafely, pauseBoth, runLoop, runSegment, videoFor, videos],
    );

    const pause = useCallback(() => {
      const pair = videos();
      if (!pair) return;
      activeWasPlayingRef.current = !(pair.forward.paused && pair.reverse.paused);
      suspendedRef.current = true;
      pauseBoth();
    }, [pauseBoth, videos]);

    const resume = useCallback(() => {
      suspendedRef.current = false;
      if (!activeWasPlayingRef.current) return;
      const active = videoFor(activeDirectionRef.current);
      void active?.play().catch(failSafely);
    }, [failSafely, videoFor]);

    const retry = useCallback(() => {
      const pair = videos();
      if (!pair) return;
      readyRef.current = false;
      readyReportedRef.current = false;
      pair.forward.load();
      pair.reverse.load();
    }, [videos]);

    useImperativeHandle(
      ref,
      () => ({
        apply,
        displayedSourceFrame: () => displayedFrameRef.current,
        isReady: () => readyRef.current,
        retry,
        pause,
        resume,
      }),
      [apply, pause, resume, retry],
    );

    const handleForwardReady = () => {
      readyRef.current = true;
      if (!readyReportedRef.current) {
        readyReportedRef.current = true;
        onReady();
      }
    };

    return (
      <div className="video-stage" aria-hidden="true">
        <Image
          className={`film-layer film-poster${hasDecodedFrame ? " is-hidden" : ""}`}
          src={POSTER_SOURCE}
          alt=""
          fill
          sizes="100vw"
          priority
          unoptimized
        />
        <video
          ref={forwardVideoRef}
          className={`film-layer${activeDirection === 1 && hasDecodedFrame ? " is-active" : ""}`}
          src={FORWARD_SOURCE}
          poster={POSTER_SOURCE}
          preload="auto"
          muted
          playsInline
          disablePictureInPicture
          onLoadedData={handleForwardReady}
          onError={onError}
        />
        <video
          ref={reverseVideoRef}
          className={`film-layer${activeDirection === -1 && hasDecodedFrame ? " is-active" : ""}`}
          src={REVERSE_SOURCE}
          poster={POSTER_SOURCE}
          preload="auto"
          muted
          playsInline
          disablePictureInPicture
          onError={onError}
        />
      </div>
    );
  },
);
