"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
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
const MOBILE_FORWARD_SOURCE = "/video/sdq-train-mobile.mp4";
const MOBILE_REVERSE_SOURCE = "/video/sdq-train-mobile-reverse.mp4";
const MOBILE_POSTER_SOURCE = "/video/sdq-train-mobile-poster.jpg";

export type FilmVariant = "portrait" | "wide";

type VideoStageProps = {
  variant: FilmVariant;
  onComplete: (displayedFrame: number) => void;
  onError: () => void;
  onFrame: (displayedFrame: number) => void;
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
type EdgeAxis = "horizontal" | "vertical" | "none";
type EdgeSource = HTMLImageElement | HTMLVideoElement;

const AMBIENT_FRAME_STEP = 2;
const EDGE_MAX_WIDTH = 2560;
const EDGE_MAX_HEIGHT = 1440;
const EDGE_OVERLAP_CSS_PX = 20;

const sourceSize = (source: EdgeSource) =>
  source instanceof HTMLVideoElement
    ? { width: source.videoWidth, height: source.videoHeight }
    : { width: source.naturalWidth, height: source.naturalHeight };

const sizeEdgeCanvas = (canvas: HTMLCanvasElement) => {
  const scale = Math.min(
    1,
    EDGE_MAX_WIDTH / window.innerWidth,
    EDGE_MAX_HEIGHT / window.innerHeight,
  );
  const width = Math.max(1, Math.round(window.innerWidth * scale));
  const height = Math.max(1, Math.round(window.innerHeight * scale));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
};

const paintMirroredEdges = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  source: EdgeSource,
): EdgeAxis => {
  sizeEdgeCanvas(canvas);
  const { width: sourceWidth, height: sourceHeight } = sourceSize(source);
  if (!sourceWidth || !sourceHeight) {
    throw new Error("Ambient edge source is not ready");
  }

  const fit = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
  const filmWidth = sourceWidth * fit;
  const filmHeight = sourceHeight * fit;
  const filmLeft = (canvas.width - filmWidth) / 2;
  const filmTop = (canvas.height - filmHeight) / 2;
  const filmRight = filmLeft + filmWidth;
  const filmBottom = filmTop + filmHeight;
  const horizontalBand = Math.max(0, filmLeft);
  const verticalBand = Math.max(0, filmTop);
  const overlap = (EDGE_OVERLAP_CSS_PX * canvas.width) / window.innerWidth;

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (horizontalBand < 0.5 && verticalBand < 0.5) return "none";

  context.save();
  if (horizontalBand >= 0.5) {
    const sourceStrip = Math.min(
      sourceWidth * 0.24,
      Math.max(1, (horizontalBand / filmWidth) * sourceWidth),
    );

    context.save();
    context.translate(filmLeft, 0);
    context.scale(-1, 1);
    context.drawImage(
      source,
      0,
      0,
      sourceStrip,
      sourceHeight,
      0,
      filmTop,
      horizontalBand,
      filmHeight,
    );
    context.restore();

    context.save();
    context.translate(filmRight, 0);
    context.scale(-1, 1);
    context.drawImage(
      source,
      sourceWidth - sourceStrip,
      0,
      sourceStrip,
      sourceHeight,
      -horizontalBand,
      filmTop,
      horizontalBand,
      filmHeight,
    );
    context.restore();

    const sourceOverlap = (overlap / filmWidth) * sourceWidth;
    context.drawImage(
      source,
      0,
      0,
      sourceOverlap,
      sourceHeight,
      filmLeft,
      filmTop,
      overlap,
      filmHeight,
    );
    context.drawImage(
      source,
      sourceWidth - sourceOverlap,
      0,
      sourceOverlap,
      sourceHeight,
      filmRight - overlap,
      filmTop,
      overlap,
      filmHeight,
    );

    const fade = Math.min(horizontalBand, filmWidth * 0.08);
    const mask = context.createLinearGradient(0, 0, canvas.width, 0);
    mask.addColorStop(0, "transparent");
    mask.addColorStop(
      Math.max(0, (filmLeft - fade) / canvas.width),
      "transparent",
    );
    mask.addColorStop(filmLeft / canvas.width, "#000");
    mask.addColorStop(
      Math.min(1, (filmLeft + overlap) / canvas.width),
      "transparent",
    );
    mask.addColorStop(
      Math.max(0, (filmRight - overlap) / canvas.width),
      "transparent",
    );
    mask.addColorStop(filmRight / canvas.width, "#000");
    mask.addColorStop(
      Math.min(1, (filmRight + fade) / canvas.width),
      "transparent",
    );
    mask.addColorStop(1, "transparent");
    context.globalCompositeOperation = "destination-in";
    context.fillStyle = mask;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
    return "horizontal";
  }

  const sourceStrip = Math.min(
    sourceHeight * 0.24,
    Math.max(1, (verticalBand / filmHeight) * sourceHeight),
  );

  context.save();
  context.translate(0, filmTop);
  context.scale(1, -1);
  context.drawImage(
    source,
    0,
    0,
    sourceWidth,
    sourceStrip,
    filmLeft,
    0,
    filmWidth,
    verticalBand,
  );
  context.restore();

  context.save();
  context.translate(0, filmBottom);
  context.scale(1, -1);
  context.drawImage(
    source,
    0,
    sourceHeight - sourceStrip,
    sourceWidth,
    sourceStrip,
    filmLeft,
    -verticalBand,
    filmWidth,
    verticalBand,
  );
  context.restore();

  const sourceOverlap = (overlap / filmHeight) * sourceHeight;
  context.drawImage(
    source,
    0,
    0,
    sourceWidth,
    sourceOverlap,
    filmLeft,
    filmTop,
    filmWidth,
    overlap,
  );
  context.drawImage(
    source,
    0,
    sourceHeight - sourceOverlap,
    sourceWidth,
    sourceOverlap,
    filmLeft,
    filmBottom - overlap,
    filmWidth,
    overlap,
  );

  const fade = Math.min(verticalBand, filmHeight * 0.08);
  const mask = context.createLinearGradient(0, 0, 0, canvas.height);
  mask.addColorStop(0, "transparent");
  mask.addColorStop(
    Math.max(0, (filmTop - fade) / canvas.height),
    "transparent",
  );
  mask.addColorStop(filmTop / canvas.height, "#000");
  mask.addColorStop(
    Math.min(1, (filmTop + overlap) / canvas.height),
    "transparent",
  );
  mask.addColorStop(
    Math.max(0, (filmBottom - overlap) / canvas.height),
    "transparent",
  );
  mask.addColorStop(filmBottom / canvas.height, "#000");
  mask.addColorStop(
    Math.min(1, (filmBottom + fade) / canvas.height),
    "transparent",
  );
  mask.addColorStop(1, "transparent");
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = mask;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();
  return "vertical";
};

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
  function VideoStage(
    { variant, onComplete, onError, onFrame, onReady },
    ref,
  ) {
    const stageRef = useRef<HTMLDivElement>(null);
    const ambientPosterRef = useRef<HTMLImageElement>(null);
    const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
    const edgeCanvasRef = useRef<HTMLCanvasElement>(null);
    const forwardVideoRef = useRef<HTMLVideoElement>(null);
    const reverseVideoRef = useRef<HTMLVideoElement>(null);
    const paintAmbientRef = useRef<
      (
        source: EdgeSource,
        frame: number,
        direction: Direction | 0,
        force?: boolean,
      ) => void
    >(() => {});
    const generationRef = useRef(0);
    const displayedFrameRef = useRef(0);
    const activeDirectionRef = useRef<Direction>(1);
    const hasDecodedFrameRef = useRef(false);
    const readyRef = useRef(false);
    const readyReportedRef = useRef(false);
    const suspendedRef = useRef(false);
    const shouldBePlayingRef = useRef(false);
    const [activeDirection, setActiveDirection] = useState<Direction>(1);
    const [hasDecodedFrame, setHasDecodedFrame] = useState(false);

    useEffect(() => {
      const ambientPoster = ambientPosterRef.current;
      const ambient = ambientCanvasRef.current;
      const edge = edgeCanvasRef.current;
      if (!ambientPoster || !ambient || !edge) return;

      const showCanvasFallback = (canvas: HTMLCanvasElement) => {
        canvas.dataset.painted = "false";
        canvas.dataset.frame = "-1";
        canvas.dataset.direction = "0";
        if (canvas === edge) canvas.dataset.axis = "none";
      };
      showCanvasFallback(ambient);
      showCanvasFallback(edge);

      let ambientContext: CanvasRenderingContext2D | null = null;
      let edgeContext: CanvasRenderingContext2D | null = null;
      try {
        ambientContext = ambient.getContext("2d", { alpha: false });
      } catch {
        showCanvasFallback(ambient);
      }
      try {
        edgeContext = edge.getContext("2d");
      } catch {
        showCanvasFallback(edge);
      }

      let ambientDirection: Direction | 0 = 0;
      let edgeDirection: Direction | 0 = 0;
      let ambientContextLost = false;
      let edgeContextLost = false;
      let lastAmbientFrame = Number.NEGATIVE_INFINITY;
      let lastEdgeFrame = Number.NEGATIVE_INFINITY;

      const paintAmbient = (
        source: EdgeSource,
        frame: number,
        direction: Direction | 0,
        force = false,
      ) => {
        const shouldPaintAmbient =
          force ||
          ambientDirection !== direction ||
          Math.abs(frame - lastAmbientFrame) >= AMBIENT_FRAME_STEP;
        const shouldPaintEdge =
          force || edgeDirection !== direction || frame !== lastEdgeFrame;

        if (shouldPaintAmbient && ambientContext && !ambientContextLost) {
          try {
            ambientContext.drawImage(
              source,
              0,
              0,
              ambient.width,
              ambient.height,
            );
            ambient.dataset.painted = "true";
            ambient.dataset.frame = String(frame);
            ambient.dataset.direction = String(direction);
          } catch {
            showCanvasFallback(ambient);
          }
        }

        if (shouldPaintEdge && edgeContext && !edgeContextLost) {
          try {
            edge.dataset.axis = paintMirroredEdges(edgeContext, edge, source);
            edge.dataset.painted = "true";
            edge.dataset.frame = String(frame);
            edge.dataset.direction = String(direction);
          } catch {
            const edgeWidth = edge.width;
            edge.width = edgeWidth;
            showCanvasFallback(edge);
          }
        }

        if (shouldPaintAmbient) {
          ambientDirection = direction;
          lastAmbientFrame = frame;
        }
        if (shouldPaintEdge) {
          edgeDirection = direction;
          lastEdgeFrame = frame;
        }
      };

      paintAmbientRef.current = paintAmbient;

      const paintPosterExtension = () => {
        const activeVideo =
          activeDirectionRef.current === 1
            ? forwardVideoRef.current
            : reverseVideoRef.current;
        if (hasDecodedFrameRef.current && activeVideo?.videoWidth) {
          paintAmbient(
            activeVideo,
            displayedFrameRef.current,
            activeDirectionRef.current,
            true,
          );
        } else if (ambientPoster.naturalWidth) {
          paintAmbient(ambientPoster, 0, 0, true);
        }
      };
      const handleResize = () => {
        paintPosterExtension();
      };
      const handleAmbientContextLost = (event: Event) => {
        event.preventDefault();
        ambientContextLost = true;
        showCanvasFallback(ambient);
      };
      const handleAmbientContextRestored = () => {
        ambientContextLost = false;
        handleResize();
      };
      const handleEdgeContextLost = (event: Event) => {
        event.preventDefault();
        edgeContextLost = true;
        showCanvasFallback(edge);
      };
      const handleEdgeContextRestored = () => {
        edgeContextLost = false;
        handleResize();
      };

      ambientPoster.addEventListener("load", paintPosterExtension);
      ambient.addEventListener("contextlost", handleAmbientContextLost);
      ambient.addEventListener("contextrestored", handleAmbientContextRestored);
      edge.addEventListener("contextlost", handleEdgeContextLost);
      edge.addEventListener("contextrestored", handleEdgeContextRestored);
      window.addEventListener("resize", handleResize);
      if (ambientPoster.complete) paintPosterExtension();

      return () => {
        paintAmbientRef.current = () => {};
        ambientPoster.removeEventListener("load", paintPosterExtension);
        ambient.removeEventListener("contextlost", handleAmbientContextLost);
        ambient.removeEventListener(
          "contextrestored",
          handleAmbientContextRestored,
        );
        edge.removeEventListener("contextlost", handleEdgeContextLost);
        edge.removeEventListener("contextrestored", handleEdgeContextRestored);
        window.removeEventListener("resize", handleResize);
      };
    }, []);

    const publishDisplayedFrame = useCallback(
      (source: HTMLVideoElement, direction: Direction, frame: number) => {
        displayedFrameRef.current = frame;
        if (stageRef.current) {
          stageRef.current.dataset.frame = String(frame);
          stageRef.current.dataset.direction = String(direction);
        }
        paintAmbientRef.current(source, frame, direction);
        onFrame(frame);
      },
      [onFrame],
    );

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
          publishDisplayedFrame(video, direction, sourceFrame);
          return;
        }

        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            video.removeEventListener("seeked", handleSeeked);
            video.removeEventListener("error", handleError);
          };
          const handleSeeked = () => {
            cleanup();
            publishDisplayedFrame(video, direction, sourceFrame);
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
      [publishDisplayedFrame, waitForMetadata],
    );

    const reveal = useCallback(async (direction: Direction) => {
      activeDirectionRef.current = direction;
      hasDecodedFrameRef.current = true;
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
            publishDisplayedFrame(video, direction, frame);
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
      [alignAndReveal, publishDisplayedFrame, seekToFrame],
    );

    const failSafely = useCallback(() => {
      shouldBePlayingRef.current = false;
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
          shouldBePlayingRef.current = false;
          pauseBoth();
          return;
        }

        const token = ++generationRef.current;

        if (command.type === "hold") {
          shouldBePlayingRef.current = false;
          void alignAndReveal(1, command.frame, token).catch(failSafely);
          return;
        }

        if (command.type === "loop") {
          shouldBePlayingRef.current = true;
          void runLoop(command, token);
          return;
        }

        shouldBePlayingRef.current = true;
        void runSegment(command, token);
      },
      [alignAndReveal, failSafely, pauseBoth, runLoop, runSegment, videoFor, videos],
    );

    const pause = useCallback(() => {
      suspendedRef.current = true;
      pauseBoth();
    }, [pauseBoth]);

    const resume = useCallback(() => {
      suspendedRef.current = false;
      if (!shouldBePlayingRef.current) return;
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
      if (stageRef.current) stageRef.current.dataset.ready = "true";
      if (!readyReportedRef.current) {
        readyReportedRef.current = true;
        onReady();
      }
    };

    const portrait = variant === "portrait";
    const forwardSource = portrait ? MOBILE_FORWARD_SOURCE : FORWARD_SOURCE;
    const reverseSource = portrait ? MOBILE_REVERSE_SOURCE : REVERSE_SOURCE;
    const posterSource = portrait ? MOBILE_POSTER_SOURCE : POSTER_SOURCE;

    return (
      <div
        ref={stageRef}
        className="video-stage"
        aria-hidden="true"
        data-variant={variant}
        data-ready="false"
        data-frame="0"
        data-direction="0"
      >
        {portrait ? null : (
          <>
            <Image
              ref={ambientPosterRef}
              className="video-stage__ambient video-stage__ambient-poster"
              src={POSTER_SOURCE}
              alt=""
              width={1920}
              height={1080}
              sizes="100vw"
              priority
              unoptimized
            />
            <canvas
              ref={ambientCanvasRef}
              className="video-stage__ambient video-stage__ambient-canvas"
              width={960}
              height={540}
              data-painted="false"
              data-frame="-1"
              data-direction="0"
            />
            <canvas
              ref={edgeCanvasRef}
              className="video-stage__edge-canvas"
              width={960}
              height={540}
              data-painted="false"
              data-frame="-1"
              data-direction="0"
              data-axis="none"
            />
          </>
        )}
        <Image
          className={`film-layer film-poster${hasDecodedFrame ? " is-hidden" : ""}`}
          src={posterSource}
          alt=""
          fill
          sizes="100vw"
          priority
          unoptimized
        />
        <video
          ref={forwardVideoRef}
          className={`film-layer${activeDirection === 1 && hasDecodedFrame ? " is-active" : ""}`}
          src={forwardSource}
          poster={posterSource}
          preload="auto"
          autoPlay
          muted
          playsInline
          disablePictureInPicture
          data-direction="1"
          data-active={activeDirection === 1 && hasDecodedFrame}
          onLoadedData={handleForwardReady}
          onError={onError}
        />
        <video
          ref={reverseVideoRef}
          className={`film-layer${activeDirection === -1 && hasDecodedFrame ? " is-active" : ""}`}
          src={reverseSource}
          poster={posterSource}
          preload="auto"
          muted
          playsInline
          disablePictureInPicture
          data-direction="-1"
          data-active={activeDirection === -1 && hasDecodedFrame}
          onError={onError}
        />
      </div>
    );
  },
);
