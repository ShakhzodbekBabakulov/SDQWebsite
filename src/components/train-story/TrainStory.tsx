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
} from "./controller.ts";
import { keyboardIntent, normalizeSwipe, normalizeWheel, sceneIndexForScroll, mobileMediaForViewport } from "./input.ts";
import { chapters, INPUT_IDLE_MS, MEDIA, GREETING_FADE_START_FRAME, GREETING_FADE_END_FRAME, captionChapterForFrame } from "./timeline.ts";
import {
  VideoStage,
  type FilmVariant,
  type VideoStageHandle,
} from "./VideoStage.tsx";

const MOBILE_QUERY = "(max-width: 767px), (pointer: coarse)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const POSTER_SOURCE = MEDIA.desktop.poster;

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
  const [mobile, setMobile] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const mobileRef = useRef(false);
  const requestedChapterRef = useRef(0);
  const wrapGuardRef = useRef(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
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
      if (mobileRef.current && command.type === "cut-and-play") {
        requestedChapterRef.current = 0;
        window.scrollTo({ top: 0, behavior: "instant" });
      }
      if (!mobileRef.current && (command.type === "play" || command.type === "cut-and-play")) {
        setCaptionChapterIndex(null);
      } else if (
        !mobileRef.current && (command.type === "loop" ||
        command.type === "hold")
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
      if (mainRef.current) {
        const state = controller.snapshot();
        mainRef.current.dataset.mode = state.phase;
        mainRef.current.dataset.scene = chapters[state.chapterIndex].id;
      }
      if (command.type === "hold") {
        setChapterLabel(chapters[controller.snapshot().chapterIndex].label);
      }
    },
    [controller],
  );

  const handleReady = useCallback(() => {
    setMediaFailed(false);
    apply(controller.start());
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
    if (mobileRef.current) {
      const index = captionChapterForFrame(frame);
      setCaptionChapterIndex(index);
      if (index !== null) setChapterLabel(chapters[index].label);
    }
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
    const mobileQuery = window.matchMedia(MOBILE_QUERY);
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const orientation = window.matchMedia("(orientation: portrait)");
    const updatePresentation = () => {
      const nextMobile = mobileQuery.matches;
      const nextVariant: FilmVariant = filmVariantRef.current ?? (mobileMediaForViewport(
        window.innerWidth, coarseQuery.matches, window.screen.width, window.screen.height,
      ) ? "mobile" : "wide");
      mobileRef.current = nextMobile;
      setMobile(nextMobile);
      setPortrait(nextMobile && window.innerWidth < 768 && orientation.matches);
      filmVariantRef.current = nextVariant;
      setFilmVariant(nextVariant);
    };
    updatePresentation();
    mobileQuery.addEventListener("change", updatePresentation);
    coarseQuery.addEventListener("change", updatePresentation);
    orientation.addEventListener("change", updatePresentation);
    window.addEventListener("resize", updatePresentation);
    return () => {
      mobileQuery.removeEventListener("change", updatePresentation);
      coarseQuery.removeEventListener("change", updatePresentation);
      orientation.removeEventListener("change", updatePresentation);
      window.removeEventListener("resize", updatePresentation);
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
    if (!filmVariant || mobile) return;

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
          if (paused) {
            if (controller.snapshot().phase === "paused") apply(controller.settleForPresentationChange(false));
            stage.resume();
          }
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
  }, [apply, controller, filmVariant, mediaFailed, userPaused, mobile]);

  useEffect(() => {
    if (!mobile || !filmVariant) return;
    const root = document.documentElement;
    const priorRefresh = root.dataset.trainRefresh;
    const priorWrap = root.dataset.trainWrap;
    const setWrapGuard = (active: boolean) => {
      wrapGuardRef.current = active;
      if (active) root.dataset.trainWrap = "true";
      else delete root.dataset.trainWrap;
    };
    const stepHeight = () => mainRef.current?.querySelector<HTMLElement>(".mobile-story-stop")?.getBoundingClientRect().height || window.innerHeight;
    let height = stepHeight();
    const currentChapter = controller.snapshot();
    requestedChapterRef.current = currentChapter.phase === "opening"
      ? sceneIndexForScroll(window.scrollY, height)
      : currentChapter.phase === "wrap-departure" ? currentChapter.chapterIndex
      : currentChapter.targetChapterIndex ?? currentChapter.chapterIndex;
    if (currentChapter.phase !== "opening") {
      window.scrollTo({ top: requestedChapterRef.current * height, behavior: "instant" });
    }
    let touch: { x: number; y: number; wrap: boolean; refresh: boolean } | null = null;
    let scrolling = false;
    let lastNativeSignalAt = performance.now();
    let scrollTimer = 0;
    let raf = 0;
    const atOpening = () => stageRef.current?.isReady() && controller.snapshot().phase === "resting"
      && controller.snapshot().chapterIndex === 0 && requestedChapterRef.current === 0 && window.scrollY <= 0;
    const refreshPermission = () => {
      root.dataset.trainRefresh = !wrapGuardRef.current && (touch?.refresh || (!touch && !scrolling && atOpening())) ? "ready" : "blocked";
    };
    const scrollEnd = () => { scrolling = false; refreshPermission(); };
    const onScroll = () => {
      lastNativeSignalAt = performance.now();
      if (wrapGuardRef.current) {
        if (window.scrollY !== 0 && controller.snapshot().phase !== "wrap-departure") window.scrollTo({ top: 0, behavior: "instant" });
        return;
      }
      scrolling = true;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(scrollEnd, INPUT_IDLE_MS);
      if (touch && window.scrollY > 0) touch.refresh = false;
      requestedChapterRef.current = sceneIndexForScroll(window.scrollY, height);
      refreshPermission();
    };
    const touchStart = (event: TouchEvent) => {
      lastNativeSignalAt = performance.now();
      if (event.touches.length !== 1 || isInteractiveTarget(event.target)) { touch = null; return; }
      const state = controller.snapshot();
      const fresh = !scrolling;
      if (state.phase === "resting") setWrapGuard(false);
      // A new touch stops prior momentum, even when Safari omitted scrollend.
      scrolling = false;
      touch = { x: event.touches[0].clientX, y: event.touches[0].clientY,
        refresh: Boolean(atOpening()),
        wrap: fresh && state.phase === "resting" && state.chapterIndex === chapters.length - 1
          && requestedChapterRef.current === chapters.length - 1
          && window.scrollY >= (chapters.length - 1) * height - 2 };
      refreshPermission();
    };
    const touchEnd = (event: TouchEvent) => {
      lastNativeSignalAt = performance.now();
      const start = touch;
      touch = null;
      if (event.touches.length || !start || !event.changedTouches.length || isInteractiveTarget(event.target)) { refreshPermission(); return; }
      const direction = normalizeSwipe({ deltaX: event.changedTouches[0].clientX - start.x, deltaY: event.changedTouches[0].clientY - start.y });
      if (start.wrap && direction?.direction === 1 && controller.snapshot().phase === "resting") {
        controller.releaseGesture(performance.now());
        // Forget Safari’s previous snap target before the opening cut.
        setWrapGuard(true);
        scrolling = false;
        window.clearTimeout(scrollTimer);
        const command = controller.intent(1, direction.pixels, performance.now(), stageRef.current?.displayedSourceFrame() ?? 0);
        apply(command);
        if (reducedMotion && command?.type === "hold") {
          requestedChapterRef.current = 0;
          window.scrollTo({ top: 0, behavior: "instant" });
        }
      }
      refreshPermission();
    };
    const touchCancel = () => { touch = null; refreshPermission(); };
    const resize = () => {
      const nextHeight = stepHeight();
      if (Math.abs(nextHeight - height) < 1) return;
      height = nextHeight;
      window.scrollTo({ top: requestedChapterRef.current * height, behavior: "instant" });
    };
    const visibility = () => {
      touch = null; scrolling = false;
      if (document.hidden) stageRef.current?.pause();
      else if (!userPausedRef.current) stageRef.current?.resume();
      refreshPermission();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (isInteractiveTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() === "p" || event.key === "Escape") {
        event.preventDefault();
        const paused = event.key === "Escape" || !userPausedRef.current;
        userPausedRef.current = paused; setUserPaused(paused);
        if (paused) stageRef.current?.pause(); else {
          if (controller.snapshot().phase === "paused") apply(controller.settleForPresentationChange(false));
          stageRef.current?.resume();
        }
      }
      if (keyboardIntent(event.key, event.shiftKey) !== null && controller.snapshot().phase === "resting") setWrapGuard(false);
      // Page, arrow, Home/End and space keys scroll the native document.
    };
    const wheel = () => {
      if (controller.snapshot().phase === "resting") setWrapGuard(false);
    };
    const tick = () => {
      const stage = stageRef.current;
      const now = performance.now();
      controller.releaseGesture(now);
      if (wrapGuardRef.current && controller.snapshot().phase === "resting" && !touch
        && Math.abs(window.scrollY) <= 1 && now - lastNativeSignalAt > 250) setWrapGuard(false);
      if (!document.hidden && stage?.isReady() && !userPausedRef.current && !wrapGuardRef.current) {
        apply(controller.requestChapter(requestedChapterRef.current, now, stage.displayedSourceFrame()));
      }
      if (mainRef.current) {
        const state = controller.snapshot();
        mainRef.current.dataset.mode = state.phase;
        mainRef.current.dataset.scene = chapters[state.chapterIndex].id;
        mainRef.current.dataset.destination = String(requestedChapterRef.current);
      }
      refreshPermission();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", scrollEnd, { passive: true });
    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchend", touchEnd, { passive: true });
    window.addEventListener("touchcancel", touchCancel, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", keyboard);
    window.addEventListener("wheel", wheel, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(raf); window.clearTimeout(scrollTimer);
      window.removeEventListener("scroll", onScroll); window.removeEventListener("scrollend", scrollEnd);
      window.removeEventListener("touchstart", touchStart); window.removeEventListener("touchend", touchEnd);
      window.removeEventListener("touchcancel", touchCancel); window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keyboard); window.removeEventListener("wheel", wheel); document.removeEventListener("visibilitychange", visibility);
      setWrapGuard(false);
      if (priorWrap === undefined) delete root.dataset.trainWrap; else root.dataset.trainWrap = priorWrap;
      if (priorRefresh === undefined) delete root.dataset.trainRefresh; else root.dataset.trainRefresh = priorRefresh;
    };
  }, [mobile, filmVariant, controller, apply, reducedMotion]);

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
    <main ref={mainRef} className="train-story" data-mobile={mobile} data-portrait={portrait}>
      <h1 className="sr-only">SDQ Management Advisory Group</h1>
      <p className="sr-only" id="train-story-instructions">
        Swipe vertically, use the mouse wheel, trackpad, arrow keys, page keys,
        or space bar to move through the six train carriages. Press P to pause
        or resume.
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {chapterLabel}
      </p>

      <div className="train-story__viewport">
      {filmVariant ? (
        <>
          <VideoStage
            key={filmVariant}
            ref={stageRef}
            variant={filmVariant}
            mobile={mobile}
            portrait={portrait}
            onPlaybackBlocked={setPlaybackBlocked}
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
      {mobile && (playbackBlocked || mediaFailed) ? (
        <button className="playback-retry" onClick={() => { setMediaFailed(false); stageRef.current?.retry(); }}>
          {mediaFailed ? "Retry film" : "Play film"}
        </button>
      ) : null}
      </div>
      <div className="mobile-story-track" aria-hidden="true">
        {chapters.map(chapter => <div className="mobile-story-stop" data-scene={chapter.id} key={chapter.id} />)}
      </div>
      {mobile ? <div className="sr-only" aria-label="Chapter descriptions">
        {chapters.map((chapter, index) => {
          const caption = captionsByChapter[index];
          return <section key={chapter.id}><h2>{chapter.label}</h2>
            {caption ? <p>{caption.captions[locale].headline}{caption.kind === "standard" ? ` ${caption.captions[locale].body}` : ""}</p> : null}
            {caption?.kind === "contact" ? <p>
              <a href={CONTACT_PHONE_HREF} tabIndex={-1}>{CONTACT_PHONE_LABEL}</a>{" "}
              <a href={CONTACT_EMAIL_HREF} tabIndex={-1}>{CONTACT_EMAIL}</a>{" "}
              <a href={CONTACT_HOMEPAGE} tabIndex={-1}>{caption.captions[locale].action}</a>
            </p> : null}
          </section>;
        })}
      </div> : null}
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
