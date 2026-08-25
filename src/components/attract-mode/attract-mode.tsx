"use client";

import { translations } from "@/assets/static-data/translations";
import { MuseumObjectContext } from "@/context/museum-object-context";
import { useFocusTrap } from "@/utils/useFocusTrap";
import { sendGTMEvent } from "@next/third-parties/google";
import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import React, { useContext, useEffect, useRef, useState } from "react";
import HandTouchIcon from "../icons/hand-touch";
import LanguageButton from "../language-button/language-button";

const ATTRACT_MODE_TIMEOUT_MINUTES = 1.5;
const ATTRACT_MODE_TIMEOUT_MILLISECONDS =
  ATTRACT_MODE_TIMEOUT_MINUTES * 60 * 1000;

export default function AttractModeContent() {
  const { museumObjectState, setMuseumObjectState } =
    useContext(MuseumObjectContext);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null); // Use a ref for the timer
  const [isSlidingOut, setIsSlidingOut] = useState(false);
  const [firstSlideDone, setFirstSlideDone] = useState(false);
  const [sendNewUserEvent, setSendNewUserEvent] = useState(true);

  // Countdown State
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [countdownVisible, setCountdownVisible] = useState(false);
  const [countdownFadingOut, setCountdownFadingOut] = useState(false);

  const {
    kioskMode,
    activeLanguage,
    manifestData,
    attractModeActive,
    objectMetadata,
  } = museumObjectState;

  const searchParams = useSearchParams();
  const spanish = searchParams.get("spanish");

  // Focus trap for accessibility - delay focus until animation completes
  const [shouldEnableFocusTrap, setShouldEnableFocusTrap] = useState(false);
  const focusTrapRef = useFocusTrap(shouldEnableFocusTrap);

  const startAttractMode = React.useCallback(() => {
    setMuseumObjectState((prev) => ({
      ...prev,
      attractModeActive: true,
    }));
  }, [setMuseumObjectState]);

  const stopAttractMode = React.useCallback(() => {
    setMuseumObjectState((prev) => ({
      ...prev,
      attractModeActive: false,
    }));
  }, [setMuseumObjectState]);

  // Reset the inactivity timer
  const resetInactivityTimer = React.useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    const startTime = Date.now();
    setTimerStartTime(startTime);

    const startAttractModeAndResetEvents = () => {
      startAttractMode();
      setSendNewUserEvent(true);
    };

    inactivityTimerRef.current = setTimeout(
      startAttractModeAndResetEvents,
      ATTRACT_MODE_TIMEOUT_MILLISECONDS,
    );
  }, [startAttractMode]);

  // Function to get remaining time on the timer
  const getRemainingTime = React.useCallback(() => {
    if (!timerStartTime) return ATTRACT_MODE_TIMEOUT_MILLISECONDS;
    const elapsed = Date.now() - timerStartTime;
    const remaining = ATTRACT_MODE_TIMEOUT_MILLISECONDS - elapsed;
    return Math.max(0, remaining);
  }, [timerStartTime]);

  // Handle user interaction
  const handleUserInteraction = React.useCallback(
    (event: Event) => {
      // Don't close attract mode if clicking or tabbing to the learn more or language buttons
      const target = event.target as HTMLElement;
      if (
        target.closest(".additional-controls-button") ||
        (attractModeActive &&
          event.type === "keydown" &&
          (event as KeyboardEvent).key === "Tab")
      ) {
        return;
      }

      if (attractModeActive) {
        stopAttractMode();
      }

      if (kioskMode) {
        resetInactivityTimer();
      }
    },
    [attractModeActive, kioskMode, stopAttractMode, resetInactivityTimer],
  );

  // Set up event listeners for user interaction
  useEffect(() => {
    const events = ["click", "touchstart", "keydown"];
    events.forEach((event) => {
      window.addEventListener(event, handleUserInteraction);
    });

    // Start the initial inactivity timer
    if (kioskMode) {
      resetInactivityTimer();
    }

    // Clean up event listeners and timer
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserInteraction);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [handleUserInteraction, kioskMode, resetInactivityTimer]);

  // Log remaining time and detect when 15 seconds are left
  useEffect(() => {
    if (!kioskMode || !timerStartTime || attractModeActive) {
      setCountdownSeconds(null);
      setCountdownVisible(false);
      setCountdownFadingOut(false);
      return;
    }

    let hasShownCountdown = false;
    let hasStartedFadeOut = false;

    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      const remainingSeconds = Math.ceil(remaining / 1000);

      // Show countdown when 15 seconds or less are left
      if (remaining <= 15000 && remaining > 0) {
        setCountdownSeconds(remainingSeconds);

        // Fade in when countdown first appears (only trigger once)
        if (!hasShownCountdown) {
          setCountdownFadingOut(false);
          // Small delay to ensure DOM is ready for transition
          setTimeout(() => {
            setCountdownVisible(true);
          }, 50);
          hasShownCountdown = true;
        }

        // Start fade out at 1 second (only trigger once)
        if (remainingSeconds === 1 && !hasStartedFadeOut) {
          setCountdownFadingOut(true);
          hasStartedFadeOut = true;
        }
      } else {
        setCountdownSeconds(null);
        setCountdownVisible(false);
        setCountdownFadingOut(false);
      }

      // Stop logging when timer expires
      if (remaining <= 0) {
        setCountdownSeconds(null);
        setCountdownVisible(false);
        setCountdownFadingOut(false);
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      setCountdownSeconds(null);
      setCountdownVisible(false);
      setCountdownFadingOut(false);
    };
  }, [kioskMode, timerStartTime, attractModeActive, getRemainingTime]);

  // Slide attract mode in/out depending on attractModeActive state
  useEffect(() => {
    if (attractModeActive) {
      setIsSlidingOut(false);

      // Prevents slideout animation from happening on load when kiosk mode is false
      setFirstSlideDone(true);

      // Enable focus trap after slide-in animation completes (1s delay)
      const focusTrapTimer = setTimeout(() => {
        setShouldEnableFocusTrap(true);
      }, 1000);

      return () => {
        clearTimeout(focusTrapTimer);
      };
    } else {
      setIsSlidingOut(true);
      setShouldEnableFocusTrap(false);

      // Send GA Event showing that a user has started using the kiosk
      if (
        kioskMode &&
        process.env.NODE_ENV === "production" &&
        sendNewUserEvent
      ) {
        sendGTMEvent({
          event: "touch_to_begin",
          kiosk_title: `Annotated Image - ${manifestData?.label["en"]}`,
        });
        setSendNewUserEvent(false);
      }
    }
  }, [attractModeActive, kioskMode, manifestData?.label, sendNewUserEvent]);

  return (
    <>
      {/* Countdown Display - only shows in kiosk mode when 15 seconds or less remain */}
      {kioskMode && countdownSeconds !== null && !attractModeActive && (
        <div
          className={clsx(
            "fixed inset-0 z-[20] flex items-center justify-center transition-opacity duration-1000 ease-in-out",
            countdownVisible && !countdownFadingOut
              ? "opacity-100"
              : "opacity-0",
          )}
        >
          {/* Scrim - background overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-75"></div>

          {/* Countdown Content */}
          <div className="relative rounded-lg border-2 border-white bg-black px-8 py-6 text-white shadow-lg">
            <div className="text-center">
              <div className="text-lg font-light">
                {translations[activeLanguage].areYouStillViewing}
              </div>
              <div className="mb-3 text-lg font-light">
                {translations[activeLanguage].tapToContinue}
              </div>
              <div className="text-3xl font-bold">{countdownSeconds}</div>
            </div>
          </div>
        </div>
      )}

      {/* Attract Mode */}
      <div
        ref={focusTrapRef}
        tabIndex={attractModeActive ? 0 : -1}
        className={clsx(
          "attract-mode absolute left-0 top-0 z-[10] flex h-[100dvh] w-[100dvw] cursor-pointer flex-col items-center justify-center gap-y-8 bg-black text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-400",
          isSlidingOut &&
            (firstSlideDone || kioskMode) &&
            "attract-mode-slide-out",
          isSlidingOut && !firstSlideDone && !kioskMode && "attract-mode-out",
        )}
        onClick={(e: React.MouseEvent) => handleUserInteraction(e.nativeEvent)}
        aria-modal={attractModeActive}
        role={attractModeActive ? "dialog" : undefined}
        aria-label={attractModeActive ? "Welcome screen" : undefined}
      >
        {/* Language Button */}
        {attractModeActive && spanish !== "false" && (
          <div className="absolute bottom-4 right-4 z-[11]">
            <LanguageButton />
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col items-center justify-center gap-y-6">
          {/* Video + Text */}
          <div className="mb-6 flex flex-row justify-center gap-x-8 px-10 md:px-[108px]">
            {/* Video */}
            {kioskMode && (
              <div className="flex flex-1 items-center overflow-hidden">
                {objectMetadata?.description_video && (
                  <div
                    className="contents"
                    dangerouslySetInnerHTML={{
                      __html: objectMetadata.description_video,
                    }}
                  ></div>
                )}
              </div>
            )}

            {/* Text */}
            {!!manifestData?.label?.[activeLanguage]?.length &&
              !!manifestData?.summary?.[activeLanguage]?.length && (
                <div
                  className={clsx(
                    "flex flex-1",
                    !kioskMode && "h-[300px] overflow-y-auto",
                  )}
                >
                  <div>
                    <h1
                      className="z-[11] text-3xl font-semibold leading-[100%]"
                      dangerouslySetInnerHTML={{
                        __html: manifestData.label[activeLanguage] ?? "",
                      }}
                    ></h1>

                    <div
                      className="mt-4 gap-y-4 text-base font-light leading-[120%] 2xl:text-xl"
                      dangerouslySetInnerHTML={{
                        __html: manifestData.summary[activeLanguage] ?? "",
                      }}
                    ></div>
                  </div>
                </div>
              )}
          </div>

          {/* User Instructions */}

          <div className="flex animate-pulse flex-row items-center gap-x-4 px-10 text-center text-3xl font-semibold leading-[100%]">
            {kioskMode && <HandTouchIcon className="h-28 w-28" />}

            <span aria-hidden="true">
              {kioskMode
                ? translations[activeLanguage].touch
                : translations[activeLanguage].click}{" "}
              {translations[activeLanguage].anywhereToExplore}
            </span>

            <span className="sr-only">
              {translations[activeLanguage].clickAnywhereToExploreScreenReader}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
