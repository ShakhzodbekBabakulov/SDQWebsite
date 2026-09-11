"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  captionsByChapter,
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_HOMEPAGE,
  CONTACT_PHONE_HREF,
  CONTACT_PHONE_LABEL,
  DEFAULT_LOCALE,
  localeOptions,
  type Locale,
} from "./captions.ts";
import { createPlaybackController } from "./controller.ts";
import { keyboardIntent, normalizeWheel } from "./input.ts";
import { chapters, INPUT_IDLE_MS } from "./timeline.ts";
import { VideoStage, type VideoStageHandle } from "./VideoStage.tsx";

const DESKTOP_FILM_QUERY = "(min-width: 768px) and (pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const POSTER_SOURCE = "/video/sdq-train-poster.jpg";

const isInteractiveTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(target.closest("a, button, input, textarea, select, [contenteditable]"));

type ExperienceProps = {
  desktopFilm: boolean;
  reducedMotion: boolean;
};

function TrainStoryExperience({ desktopFilm, reducedMotion }: ExperienceProps) {
  const stageRef = useRef<VideoStageHandle>(null);
  const [controller] = useState(() =>
    desktopFilm ? createPlaybackController({ reducedMotion }) : null,
  );
  const gestureTimerRef = useRef<number | null>(null);
  const [chapterLabel, setChapterLabel] = useState<string>(chapters[0].label);
  const [captionChapterIndex, setCaptionChapterIndex] = useState<number | null>(
    null,
  );
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  const apply = useCallback(
    (command: Parameters<VideoStageHandle["apply"]>[0] | null) => {
      if (!command) return;
      if (command.type === "play" || command.type === "cut-and-play") {
        setCaptionChapterIndex(null);
      } else if (
        (command.type === "loop" || command.type === "hold") &&
        controller
      ) {
        const snapshot = controller.snapshot();
        setCaptionChapterIndex(
          snapshot.phase === "resting" &&
            captionsByChapter[snapshot.chapterIndex]
            ? snapshot.chapterIndex
            : null,
        );
      }
      stageRef.current?.apply(command);
      if (command.type === "hold" && controller) {
        setChapterLabel(chapters[controller.snapshot().chapterIndex].label);
      }
    },
    [controller],
  );

  const handleReady = useCallback(() => {
    setMediaFailed(false);
    apply(controller?.start() ?? null);
  }, [apply, controller]);

  const handleComplete = useCallback(
    (frame: number) => {
      if (!controller) return;
      apply(controller.complete(frame, performance.now()));
      const { chapterIndex, phase } = controller.snapshot();
      if (phase === "resting") {
        setChapterLabel(chapters[chapterIndex].label);
      }
    },
    [apply, controller],
  );

  useEffect(() => {
    if (!desktopFilm) return;
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = "en";
    };
  }, [desktopFilm, locale]);

  useEffect(() => {
    if (!desktopFilm) return;

    const finishGestureLater = () => {
      if (gestureTimerRef.current !== null) {
        window.clearTimeout(gestureTimerRef.current);
      }
      gestureTimerRef.current = window.setTimeout(() => {
        controller?.releaseGesture(performance.now());
      }, INPUT_IDLE_MS);
    };

    const handleWheel = (event: WheelEvent) => {
      if (isInteractiveTarget(event.target)) return;
      const normalized = normalizeWheel(event, window.innerHeight);
      if (!normalized) return;

      event.preventDefault();
      const stage = stageRef.current;
      if (!controller || !stage) return;

      if (mediaFailed) stage.retry();
      apply(
        controller.intent(
          normalized.direction,
          normalized.pixels,
          performance.now(),
          stage.displayedSourceFrame(),
        ),
      );
      finishGestureLater();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInteractiveTarget(event.target)) return;
      const intent = keyboardIntent(event.key, event.shiftKey);
      if (intent === null) return;
      event.preventDefault();

      const stage = stageRef.current;
      if (!controller || !stage) return;
      if (mediaFailed) stage.retry();

      if (intent === "first" || intent === "last") {
        apply(controller.jump(intent, performance.now()));
        finishGestureLater();
        return;
      }

      if (intent === "toggle-pause") {
        setUserPaused((paused) => {
          if (paused) stage.resume();
          else stage.pause();
          return !paused;
        });
        return;
      }

      if (intent === "pause") {
        stage.pause();
        setUserPaused(true);
        return;
      }

      apply(
        controller.intent(
          intent,
          80,
          performance.now(),
          stage.displayedSourceFrame(),
        ),
      );
      finishGestureLater();
    };

    const holdPageAtTop = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
    };

    const handleVisibility = () => {
      if (document.hidden) stageRef.current?.pause();
      else if (!userPaused) stageRef.current?.resume();
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("scroll", holdPageAtTop, { passive: true });
    holdPageAtTop();

    return () => {
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("scroll", holdPageAtTop);
      if (gestureTimerRef.current !== null) {
        window.clearTimeout(gestureTimerRef.current);
      }
    };
  }, [apply, controller, desktopFilm, mediaFailed, userPaused]);

  const activeCaption =
    captionChapterIndex === null
      ? null
      : (captionsByChapter[captionChapterIndex] ?? null);

  return (
    <main className="train-story">
      <h1 className="sr-only">SDQ Management Advisory Group</h1>
      <p className="sr-only" id="train-story-instructions">
        Use the mouse wheel, trackpad, arrow keys, page keys, or space bar to
        move through the six train carriages. Press P to pause or resume.
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {chapterLabel}
      </p>

      {desktopFilm ? (
        <>
          <VideoStage
            ref={stageRef}
            onReady={handleReady}
            onComplete={handleComplete}
            onError={() => setMediaFailed(true)}
          />
          <section
            className={`scene-caption${activeCaption ? " is-visible" : ""}${activeCaption?.kind === "contact" ? " is-contact" : ""}`}
            aria-hidden={!activeCaption}
          >
            {activeCaption?.kind === "standard" ? (
              <>
                <h2>{activeCaption.captions[locale].headline}</h2>
                <p>{activeCaption.captions[locale].body}</p>
              </>
            ) : activeCaption?.kind === "contact" ? (
              <div className="contact-caption">
                <h2>{activeCaption.captions[locale].headline}</h2>
                <div className="contact-details">
                  <a className="contact-phone" href={CONTACT_PHONE_HREF}>
                    {CONTACT_PHONE_LABEL}
                  </a>
                  <a className="contact-email" href={CONTACT_EMAIL_HREF}>
                    {CONTACT_EMAIL}
                  </a>
                </div>
                <a className="contact-action" href={CONTACT_HOMEPAGE}>
                  {activeCaption.captions[locale].action}
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            ) : null}
          </section>
          <nav className="language-switcher" aria-label="Language">
            {localeOptions.map((option) => (
              <button
                key={option.locale}
                type="button"
                title={option.title}
                aria-pressed={locale === option.locale}
                onClick={() => setLocale(option.locale)}
              >
                {option.label}
              </button>
            ))}
          </nav>
        </>
      ) : (
        <div className="video-stage" aria-hidden="true">
          <Image
            className="film-layer is-active"
            src={POSTER_SOURCE}
            alt=""
            fill
            sizes="100vw"
            priority
            unoptimized
          />
        </div>
      )}
    </main>
  );
}

export function TrainStory() {
  const [desktopFilm, setDesktopFilm] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia(DESKTOP_FILM_QUERY);
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => {
      setDesktopFilm(desktopQuery.matches);
      setReducedMotion(motionQuery.matches);
    };

    update();
    desktopQuery.addEventListener("change", update);
    motionQuery.addEventListener("change", update);
    return () => {
      desktopQuery.removeEventListener("change", update);
      motionQuery.removeEventListener("change", update);
    };
  }, []);

  return (
    <TrainStoryExperience
      key={`${desktopFilm}:${reducedMotion}`}
      desktopFilm={desktopFilm}
      reducedMotion={reducedMotion}
    />
  );
}
