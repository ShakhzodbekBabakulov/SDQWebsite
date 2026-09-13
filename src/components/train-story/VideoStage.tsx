"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { PlaybackCommand } from "./controller.ts";
import type { Direction } from "./input.ts";
import { mediaTimeToSourceFrame, sourceFrameToMediaTime } from "./media-math.ts";
import { FPS, MEDIA } from "./timeline.ts";

export type FilmVariant = "mobile" | "wide";
type VideoStageProps = {
  variant: FilmVariant;
  mobile: boolean;
  portrait: boolean;
  onComplete: (displayedFrame: number) => void;
  onError: () => void;
  onFrame: (displayedFrame: number) => void;
  onReady: () => void;
  onPlaybackBlocked: (blocked: boolean) => void;
};
export type VideoStageHandle = {
  apply: (command: PlaybackCommand) => void;
  displayedSourceFrame: () => number;
  isReady: () => boolean;
  retry: () => void;
  pause: () => void;
  resume: () => void;
};

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
  const bounds = canvas.getBoundingClientRect();
  const width = bounds.width || window.innerWidth;
  const height = bounds.height || window.innerHeight;
  const scale = Math.min(
    1,
    EDGE_MAX_WIDTH / width,
    EDGE_MAX_HEIGHT / height,
  );
  const pixelWidth = Math.max(1, Math.round(width * scale));
  const pixelHeight = Math.max(1, Math.round(height * scale));
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
};

const paintMirroredEdges = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  source: EdgeSource,
  overscan = 1,
): EdgeAxis => {
  sizeEdgeCanvas(canvas);
  const { width: sourceWidth, height: sourceHeight } = sourceSize(source);
  if (!sourceWidth || !sourceHeight) {
    throw new Error("Ambient edge source is not ready");
  }

  const fit = Math.min(canvas.width * overscan / sourceWidth, canvas.height / sourceHeight);
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

export const VideoStage = forwardRef<VideoStageHandle, VideoStageProps>(
  function VideoStage({ variant, mobile, portrait, onComplete, onError, onFrame, onReady, onPlaybackBlocked }, ref) {
    const stageRef = useRef<HTMLDivElement>(null);
    const ambientPosterRef = useRef<HTMLImageElement>(null);
    const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
    const edgeCanvasRef = useRef<HTMLCanvasElement>(null);
    const forwardVideoRef = useRef<HTMLVideoElement>(null);
    const reverseVideoRef = useRef<HTMLVideoElement>(null);
    const displayedFrameRef = useRef(0);
    const activeDirectionRef = useRef<Direction>(1);
    const hasDecodedFrameRef = useRef(false);
    const readyRef = useRef(false);
    const portraitRef = useRef(portrait);
    const callbacks = useRef({ onComplete, onError, onFrame, onReady, onPlaybackBlocked });
    const engine = useRef<Omit<VideoStageHandle, "displayedSourceFrame" | "isReady"> | null>(null);
    const paintAmbientRef = useRef<(source: EdgeSource, frame: number, direction: Direction | 0, force?: boolean) => void>(() => {});
    useEffect(() => {
      portraitRef.current = portrait;
      callbacks.current = { onComplete, onError, onFrame, onReady, onPlaybackBlocked };
    });
    useImperativeHandle(ref, () => ({
      apply: command => engine.current?.apply(command),
      displayedSourceFrame: () => displayedFrameRef.current,
      isReady: () => readyRef.current,
      retry: () => engine.current?.retry(),
      pause: () => engine.current?.pause(),
      resume: () => engine.current?.resume(),
    }), []);

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
            edge.dataset.axis = paintMirroredEdges(edgeContext, edge, source, portraitRef.current ? 1.2 : 1);
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
    }, [mobile, variant]);

    useEffect(() => {
      const active = activeDirectionRef.current === 1 ? forwardVideoRef.current : reverseVideoRef.current;
      if (hasDecodedFrameRef.current && active?.videoWidth) {
        paintAmbientRef.current(active, displayedFrameRef.current, activeDirectionRef.current, true);
      }
    }, [portrait]);

    useEffect(() => {
      const forward = forwardVideoRef.current!;
      const reverse = reverseVideoRef.current!;
      const stage = stageRef.current!;
      type Loop = Extract<PlaybackCommand, { type: "loop" }>;
      type Segment = { direction: Direction; from: number; to: number; rate: number; loop: Loop | null; hold: boolean };
      let segment: Segment | null = null;
      let active: HTMLVideoElement | null = null;
      let disposed = false;
      let generation = 0;
      let suspended = document.hidden;
      let readyReported = false;
      let pending = false;
      const cleanupPending = new Set<() => void>();
      const videoFor = (direction: Direction) => direction === 1 ? forward : reverse;
      const valid = (token: number) => !disposed && token === generation;
      const pauseBoth = () => { forward.pause(); reverse.pause(); };
      const cancel = () => {
        generation++;
        for (const cleanup of cleanupPending) cleanup();
        cleanupPending.clear();
        pauseBoth();
      };
      const listen = (video: HTMLVideoElement, name: string, callback: () => void) => {
        const handler = () => { cleanup(); callback(); };
        const cleanup = () => { video.removeEventListener(name, handler); cleanupPending.delete(cleanup); };
        cleanupPending.add(cleanup);
        video.addEventListener(name, handler, { once: true });
      };
      const frameCallback = (video: HTMLVideoElement, callback: (time: number) => void) => {
        if (typeof video.requestVideoFrameCallback !== "function") return;
        const id = video.requestVideoFrameCallback((_now, metadata) => {
          cleanupPending.delete(cleanup);
          callback(metadata.mediaTime);
        });
        const cleanup = () => video.cancelVideoFrameCallback(id);
        cleanupPending.add(cleanup);
      };
      const animation = (callback: () => void) => {
        const id = requestAnimationFrame(() => { cleanupPending.delete(cleanup); callback(); });
        const cleanup = () => cancelAnimationFrame(id);
        cleanupPending.add(cleanup);
      };
      const publish = (video: HTMLVideoElement, direction: Direction, frame: number) => {
        displayedFrameRef.current = frame;
        stage.dataset.frame = String(frame);
        stage.dataset.direction = String(direction);
        paintAmbientRef.current(video, frame, direction);
        callbacks.current.onFrame(frame);
      };
      const play = (video: HTMLVideoElement, token: number) => {
        if (!valid(token) || suspended) return;
        void video.play().then(() => {
          if (valid(token)) callbacks.current.onPlaybackBlocked(false);
        }).catch((error: unknown) => {
          if (!valid(token) || suspended) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
          pauseBoth();
          callbacks.current.onPlaybackBlocked(true);
        });
      };
      const finish = (current: Segment, token: number) => {
        if (!valid(token)) return;
        if (current.loop) {
          const direction = current.direction === 1 ? -1 : 1;
          begin({ ...current, direction, from: current.to,
            to: direction === 1 ? current.loop.endFrame : current.loop.startFrame });
        } else {
          cancel();
          pending = false;
          callbacks.current.onComplete(displayedFrameRef.current);
        }
      };
      const reached = (current: Segment, frame: number) => current.direction === 1 ? frame >= current.to : frame <= current.to;
      const watch = (video: HTMLVideoElement, current: Segment, token: number) => {
        if (!valid(token) || suspended || current.hold) return;
        frameCallback(video, time => {
          if (!valid(token) || video !== active) return;
          const frame = mediaTimeToSourceFrame(time, current.direction);
          if (reached(current, frame) && frame !== current.to) {
            begin({ ...current, from: current.to });
            return;
          }
          publish(video, current.direction, frame);
          // Publication may synchronously select another chapter or video.
          if (!valid(token)) return;
          if (reached(current, frame)) finish(current, token);
          else watch(video, current, token);
        });
      };
      const watchdog = (video: HTMLVideoElement, current: Segment, token: number) => {
        animation(() => {
          if (!valid(token) || suspended || current.hold) return;
          if (!video.seeking && video.readyState >= 2) {
            const frame = mediaTimeToSourceFrame(video.currentTime, current.direction);
            if (reached(current, frame)) {
              // A native clock can outlive frame delivery. Re-decode the boundary
              // before publishing it; never let a missed callback run the story away.
              begin({ ...current, from: current.to });
              return;
            }
            if (typeof video.requestVideoFrameCallback !== "function") {
              publish(video, current.direction, frame);
              if (!valid(token)) return;
            }
          }
          watchdog(video, current, token);
        });
      };
      const begin = (next: Segment) => {
        cancel();
        segment = next;
        pending = true;
        const token = generation;
        const video = videoFor(next.direction);
        const targetTime = sourceFrameToMediaTime(next.from, next.direction);
        const activate = (time: number) => {
          if (!valid(token) || !pending) return;
          const frame = mediaTimeToSourceFrame(time, next.direction);
          if (next.hold && frame !== next.from) {
            confirmPausedFrame();
            return;
          }
          if (Math.abs(frame - next.from) > 1) { seek(); return; }
          if (next.loop && (frame < next.loop.startFrame || frame > next.loop.endFrame)) {
            confirmPausedFrame();
            return;
          }
          pending = false;
          active = video;
          activeDirectionRef.current = next.direction;
          hasDecodedFrameRef.current = true;
          stage.dataset.ready = "true";
          stage.dataset.rate = String(next.rate);
          for (const candidate of [forward, reverse]) {
            candidate.classList.toggle("is-active", candidate === video);
            candidate.dataset.active = String(candidate === video);
          }
          stage.querySelector(".film-poster")?.classList.add("is-hidden");
          publish(video, next.direction, frame);
          if (!valid(token)) return;
          if (next.hold || suspended) { video.pause(); return; }
          if (reached(next, frame)) { finish(next, token); return; }
          video.playbackRate = next.rate;
          watch(video, next, token);
          watchdog(video, next, token);
          play(video, token);
        };
        const confirmPausedFrame = () => {
          if (!valid(token) || !pending) return;
          video.pause();
          listen(video, "seeked", () => {
            if (!valid(token) || video.readyState < 2) return;
            animation(() => activate(video.currentTime));
          });
          video.currentTime = targetTime;
        };
        const confirm = () => {
          if (!valid(token)) return;
          // A completed paused seek with current data is already decoded. For
          // motion, use the actual presented frame before revealing the layer.
          if (next.hold || suspended || typeof video.requestVideoFrameCallback !== "function") {
            if (video.readyState >= 2 && !video.seeking) animation(() => activate(video.currentTime));
            else listen(video, "loadeddata", confirm);
            return;
          }
          frameCallback(video, activate);
          // Some Safari decoders omit the incoming callback. A fresh completed
          // paused seek is independent evidence of decoded data at the wanted frame.
          const timer = window.setTimeout(() => {
            cleanupPending.delete(clearTimer);
            if (!valid(token) || !pending) return;
            confirmPausedFrame();
          }, 400);
          const clearTimer = () => window.clearTimeout(timer);
          cleanupPending.add(clearTimer);
          video.playbackRate = next.rate;
          play(video, token);
        };
        const seek = () => {
          if (!valid(token)) return;
          video.pause();
          if (Math.abs(video.currentTime - targetTime) < 0.5 / FPS && video.readyState >= 2 && !video.ended) {
            // Reusing the already-confirmed active picture needs no new decode.
            if (video === active && Math.abs(displayedFrameRef.current - next.from) <= 1) {
              activate(video.currentTime);
            } else confirm();
          } else {
            listen(video, "seeked", confirm);
            video.currentTime = targetTime;
            // iOS can leave a hidden, metadata-only decoder seeking forever
            // until playback is explicitly requested. Keep its layer hidden
            // while that request obtains the frame used by confirm().
            if (video.readyState < 2) {
              video.playbackRate = next.rate;
              play(video, token);
            }
          }
        };
        if (video.readyState >= 1) seek();
        else listen(video, "loadedmetadata", seek);
      };
      const apply = (command: PlaybackCommand) => {
        if (disposed) return;
        if (command.type === "rate") {
          if (segment) segment.rate = command.rate;
          if (active) active.playbackRate = command.rate;
          return;
        }
        if (command.type === "pause") { suspended = true; cancel(); return; }
        if (command.type === "hold") {
          begin({ direction: 1, from: command.frame, to: command.frame, rate: 1, loop: null, hold: true });
        } else if (command.type === "loop") {
          const frame = command.fromFrame ?? displayedFrameRef.current;
          const direction: Direction = Math.abs(frame - command.endFrame) < Math.abs(frame - command.startFrame) ? -1 : 1;
          begin({ direction, from: command.fromFrame ?? (direction === 1 ? command.startFrame : command.endFrame),
            to: direction === 1 ? command.endFrame : command.startFrame, rate: command.rate, loop: command, hold: false });
        } else {
          begin({ direction: command.direction, from: command.fromFrame, to: command.toFrame, rate: command.rate, loop: null, hold: false });
        }
      };
      const resume = () => {
        suspended = false;
        if (segment) begin({ ...segment, from: pending ? segment.from : displayedFrameRef.current });
        else if (!readyReported) play(forward, generation);
      };
      const notifyReady = () => {
        readyRef.current = true;
        if (!readyReported) {
          readyReported = true;
          forward.pause();
          callbacks.current.onReady();
        }
      };
      const bootstrap = () => {
        // Mobile Safari may preload metadata without decoding an invisible
        // autoplay layer. An explicit muted request also exposes rejection.
        if (!readyReported && !suspended) play(forward, generation);
      };
      const ended = (event: Event) => {
        if (disposed || suspended || event.currentTarget !== active || !segment || segment.hold || pending) return;
        begin({ ...segment, from: segment.to });
      };
      const emptied = (event: Event) => {
        if (disposed || event.currentTarget !== active || !segment) return;
        begin({ ...segment, from: pending ? segment.from : displayedFrameRef.current });
      };
      const error = () => { cancel(); callbacks.current.onError(); };
      engine.current = {
        apply,
        pause: () => { suspended = true; cancel(); },
        resume,
        retry: () => {
          suspended = false;
          for (const video of [forward, reverse]) if (video.error) video.load();
          if (segment) begin({ ...segment, from: pending ? segment.from : displayedFrameRef.current });
          else if (forward.readyState >= 2) notifyReady();
          else play(forward, generation);
        },
      };
      forward.addEventListener("loadedmetadata", bootstrap);
      forward.addEventListener("loadeddata", notifyReady);
      for (const video of [forward, reverse]) {
        video.addEventListener("ended", ended);
        video.addEventListener("emptied", emptied);
        video.addEventListener("error", error);
      }
      if (forward.readyState >= 2) notifyReady();
      else if (forward.readyState >= 1) bootstrap();
      return () => {
        disposed = true;
        cancel();
        readyRef.current = false;
        engine.current = null;
        forward.removeEventListener("loadedmetadata", bootstrap);
        forward.removeEventListener("loadeddata", notifyReady);
        for (const video of [forward, reverse]) {
          video.removeEventListener("ended", ended);
          video.removeEventListener("emptied", emptied);
          video.removeEventListener("error", error);
        }
      };
    }, [variant]);

    const media = variant === "mobile" ? MEDIA.mobile : MEDIA.desktop;
    const ambience = <>
      <Image ref={ambientPosterRef} className="video-stage__ambient video-stage__ambient-poster"
        src={media.poster} alt="" width={1920} height={1080} sizes="100vw" priority unoptimized />
      <canvas ref={ambientCanvasRef} className="video-stage__ambient video-stage__ambient-canvas"
        width={960} height={540} data-painted="false" data-frame="-1" data-direction="0" />
    </>;
    return <div ref={stageRef} className="video-stage" aria-hidden="true"
      data-variant={variant} data-ready="false" data-frame="0" data-direction="0">
      {mobile ? createPortal(<div className="video-stage__wallpaper" aria-hidden="true">{ambience}</div>, document.body) : ambience}
      <canvas ref={edgeCanvasRef} className="video-stage__edge-canvas" width={960} height={540}
        data-painted="false" data-frame="-1" data-direction="0" data-axis="none" />
      <Image className="film-layer film-poster" src={media.poster} alt="" fill sizes="100vw" priority unoptimized />
      <video ref={forwardVideoRef} className="film-layer" src={media.forward} poster={media.poster}
        preload="auto" autoPlay muted playsInline disablePictureInPicture data-direction="1" data-active="false" />
      <video ref={reverseVideoRef} className="film-layer" src={media.reverse} poster={media.poster}
        preload="auto" muted playsInline disablePictureInPicture data-direction="-1" data-active="false" />
    </div>;
  },
);
