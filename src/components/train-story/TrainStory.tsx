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
  resolveLocale,
  type Locale,
} from "./captions.ts";
import {
  createPlaybackController,
  type PlaybackCommand,
} from "./controller.ts";
import { keyboardIntent, normalizeSwipe, normalizeWheel } from "./input.ts";
import { chapters, INPUT_IDLE_MS } from "./timeline.ts";
import {
  VideoStage,
  type FilmVariant,
  type VideoStageHandle,
} from "./VideoStage.tsx";

const PORTRAIT_FILM_QUERY = "(orientation: portrait) and (pointer: coarse)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const POSTER_SOURCE = "/video/sdq-train-poster.jpg";
const GREETING_FADE_START_FRAME = 84;
const GREETING_FADE_END_FRAME = 95;

const isInteractiveTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(target.closest("a, button, input, textarea, select, [contenteditable]"));

type ExperienceProps = {
  reducedMotion: boolean;
};

function TrainStoryExperience({ reducedMotion }: ExperienceProps) {
  const mainRef = useRef<HTMLElement>(null);
  const stageRef = useRef<VideoStageHandle>(null);
  const languageControlRef = useRef<HTMLDivElement>(null);
  const languageTriggerRef = useRef<HTMLButtonElement>(null);
  const restoreLanguageFocusRef = useRef(false);
  const suppressLanguageOpenRef = useRef(false);
  const [controller] = useState(() =>
    createPlaybackController({ reducedMotion }),
  );
  const filmVariantRef = useRef<FilmVariant | null>(null);
  const pendingReadyCommandRef = useRef<PlaybackCommand | null>(null);
  const touchStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const userPausedRef = useRef(false);
  const gestureTimerRef = useRef<number | null>(null);
  const [filmVariant, setFilmVariant] = useState<FilmVariant | null>(null);
  const [chapterLabel, setChapterLabel] = useState<string>(chapters[0].label);
  const [captionChapterIndex, setCaptionChapterIndex] = useState<number | null>(
    null,
  );
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof navigator === "undefined") return DEFAULT_LOCALE;
    const preferences =
      navigator.languages.length > 0
        ? navigator.languages
        : navigator.language
          ? [navigator.language]
          : [];
    return resolveLocale(preferences);
  });
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [showOpeningGreeting, setShowOpeningGreeting] = useState(!reducedMotion);
  const [userPaused, setUserPaused] = useState(false);

  const apply = useCallback(
    (command: Parameters<VideoStageHandle["apply"]>[0] | null) => {
      if (!command) return;
      if (command.type === "play" || command.type === "cut-and-play") {
        setCaptionChapterIndex(null);
      } else if (
        command.type === "loop" ||
        command.type === "hold"
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
      if (command.type === "hold") {
        setChapterLabel(chapters[controller.snapshot().chapterIndex].label);
      }
    },
    [controller],
  );

  const handleReady = useCallback(() => {
    setMediaFailed(false);
    const command = pendingReadyCommandRef.current ?? controller.start();
    pendingReadyCommandRef.current = null;
    apply(command);
  }, [apply, controller]);

  const handleComplete = useCallback(
    (frame: number) => {
      const wasOpening = controller.snapshot().phase === "opening";
      apply(controller.complete(frame, performance.now()));
      if (wasOpening) setShowOpeningGreeting(false);
      const { chapterIndex, phase } = controller.snapshot();
      if (phase === "resting") {
        setChapterLabel(chapters[chapterIndex].label);
      }
    },
    [apply, controller],
  );

  const handleFrame = useCallback((frame: number) => {
    const linearProgress = Math.max(
      0,
      Math.min(
        1,
        (frame - GREETING_FADE_START_FRAME) /
          (GREETING_FADE_END_FRAME - GREETING_FADE_START_FRAME),
      ),
    );
    const progress =
      linearProgress * linearProgress * (3 - 2 * linearProgress);
    mainRef.current?.style.setProperty(
      "--opening-greeting-exit",
      progress.toFixed(4),
    );
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = "en";
    };
  }, [locale]);

  useEffect(() => {
    userPausedRef.current = userPaused;
  }, [userPaused]);

  useEffect(() => {
    const portraitQuery = window.matchMedia(PORTRAIT_FILM_QUERY);
    const updatePresentation = () => {
      const nextVariant: FilmVariant = portraitQuery.matches
        ? "portrait"
        : "wide";
      const previousVariant = filmVariantRef.current;

      if (previousVariant && previousVariant !== nextVariant) {
        pendingReadyCommandRef.current =
          controller.settleForPresentationChange(userPausedRef.current);
        const snapshot = controller.snapshot();
        setChapterLabel(chapters[snapshot.chapterIndex].label);
        setCaptionChapterIndex(
          captionsByChapter[snapshot.chapterIndex]
            ? snapshot.chapterIndex
            : null,
        );
        setShowOpeningGreeting(false);
        setMediaFailed(false);
      }

      filmVariantRef.current = nextVariant;
      setFilmVariant(nextVariant);
    };

    updatePresentation();
    portraitQuery.addEventListener("change", updatePresentation);
    return () => {
      portraitQuery.removeEventListener("change", updatePresentation);
    };
  }, [controller]);

  useEffect(() => {
    if (languageOpen || !restoreLanguageFocusRef.current) return;
    suppressLanguageOpenRef.current = true;
    languageTriggerRef.current?.focus();
    suppressLanguageOpenRef.current = false;
    restoreLanguageFocusRef.current = false;
  }, [languageOpen]);

  useEffect(() => {
    if (!filmVariant) return;
    const main = mainRef.current;

    const finishGestureLater = () => {
      if (gestureTimerRef.current !== null) {
        window.clearTimeout(gestureTimerRef.current);
      }
      gestureTimerRef.current = window.setTimeout(() => {
        controller.releaseGesture(performance.now());
      }, INPUT_IDLE_MS);
    };

    const handleWheel = (event: WheelEvent) => {
      if (isInteractiveTarget(event.target)) return;
      const normalized = normalizeWheel(event, window.innerHeight);
      if (!normalized) return;

      event.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

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
      if (!stage) return;
      if (mediaFailed) stage.retry();

      if (intent === "first" || intent === "last") {
        if (controller.snapshot().phase === "opening") {
          setShowOpeningGreeting(false);
        }
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

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.pointerType !== "touch" ||
        !event.isPrimary ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }
      touchStartRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (
        !start ||
        start.pointerId !== event.pointerId ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      const normalized = normalizeSwipe({
        deltaX: event.clientX - start.x,
        deltaY: event.clientY - start.y,
      });
      if (!normalized) return;

      const stage = stageRef.current;
      if (!stage) return;
      event.preventDefault();
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

    const handlePointerCancel = () => {
      touchStartRef.current = null;
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
    main?.addEventListener("pointerdown", handlePointerDown);
    main?.addEventListener("pointerup", handlePointerUp, {
      passive: false,
    });
    main?.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("scroll", holdPageAtTop, { passive: true });
    holdPageAtTop();

    return () => {
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibility);
      main?.removeEventListener("pointerdown", handlePointerDown);
      main?.removeEventListener("pointerup", handlePointerUp);
      main?.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("scroll", holdPageAtTop);
      if (gestureTimerRef.current !== null) {
        window.clearTimeout(gestureTimerRef.current);
      }
    };
  }, [apply, controller, filmVariant, mediaFailed, userPaused]);

  const activeCaption =
    captionChapterIndex === null
      ? null
      : (captionsByChapter[captionChapterIndex] ?? null);
  const currentLocale =
    localeOptions.find((option) => option.locale === locale) ?? localeOptions[0];

  const closeLanguageAndRestoreFocus = () => {
    if (!languageOpen) return;
    restoreLanguageFocusRef.current = true;
    setLanguageOpen(false);
  };

  const selectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    closeLanguageAndRestoreFocus();
  };

  return (
    <main ref={mainRef} className="train-story">
      <h1 className="sr-only">SDQ Management Advisory Group</h1>
      <p className="sr-only" id="train-story-instructions">
        Swipe vertically, use the mouse wheel, trackpad, arrow keys, page keys,
        or space bar to move through the six train carriages. Press P to pause
        or resume.
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {chapterLabel}
      </p>

      {filmVariant ? (
        <>
          <VideoStage
            key={filmVariant}
            ref={stageRef}
            variant={filmVariant}
            onReady={handleReady}
            onComplete={handleComplete}
            onFrame={handleFrame}
            onError={() => setMediaFailed(true)}
          />
          {showOpeningGreeting ? (
            <div className="opening-greeting-stage" aria-hidden="true">
              <div className="opening-greeting-frame">
                <p className="opening-greeting">Assalomu Aleykum</p>
              </div>
            </div>
          ) : null}
          <section
            className={`scene-caption${activeCaption ? " is-visible" : ""}${captionChapterIndex === 2 ? " is-partners" : ""}${activeCaption?.kind === "contact" ? " is-contact" : ""}`}
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
                <div className="contact-caption__actions">
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
              </div>
            ) : null}
          </section>
          <nav className="language-switcher" aria-label="Language">
            <div
              ref={languageControlRef}
              className={`language-switcher__control${languageOpen ? " is-open" : ""}`}
              onMouseEnter={() => setLanguageOpen(true)}
              onMouseLeave={() => {
                if (
                  !languageControlRef.current?.contains(document.activeElement)
                ) {
                  setLanguageOpen(false);
                }
              }}
              onFocus={() => {
                if (!suppressLanguageOpenRef.current) setLanguageOpen(true);
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setLanguageOpen(false);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  closeLanguageAndRestoreFocus();
                }
              }}
            >
              <button
                ref={languageTriggerRef}
                type="button"
                className="language-switcher__current"
                aria-label={`Current language: ${currentLocale.label}`}
                aria-expanded={languageOpen}
                aria-haspopup="true"
                onClick={() => setLanguageOpen(true)}
              >
                {currentLocale.label}
              </button>
              {languageOpen ? (
                <div className="language-switcher__options">
                  {localeOptions.map((option) => (
                    <button
                      key={option.locale}
                      type="button"
                      title={option.title}
                      aria-pressed={locale === option.locale}
                      onClick={() => selectLocale(option.locale)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
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
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => {
      setReducedMotion(motionQuery.matches);
    };

    update();
    motionQuery.addEventListener("change", update);
    return () => {
      motionQuery.removeEventListener("change", update);
    };
  }, []);

  return (
    <TrainStoryExperience key={`${reducedMotion}`} reducedMotion={reducedMotion} />
  );
}
