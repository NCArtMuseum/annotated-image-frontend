"use client";

import { translations } from "@/assets/static-data/translations";
import { MuseumObjectContext } from "@/context/museum-object-context";
import { sendGTMEvent } from "@next/third-parties/google";
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

  const {
    kioskMode,
    activeLanguage,
    manifestData,
    attractModeActive,
    objectMetadata,
  } = museumObjectState;

  const startAttractMode = () => {
    setMuseumObjectState((prev) => ({
      ...prev,
      attractModeActive: true,
    }));
  };

  const stopAttractMode = () => {
    setMuseumObjectState((prev) => ({
      ...prev,
      attractModeActive: false,
    }));
  };

  // Reset the inactivity timer
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    const startAttractModeAndResetEvents = () => {
      startAttractMode();
      setSendNewUserEvent(true);
    };

    inactivityTimerRef.current = setTimeout(
      startAttractModeAndResetEvents,
      ATTRACT_MODE_TIMEOUT_MILLISECONDS,
    );
  };

  // Handle user interaction
  const handleUserInteraction = (event: Event) => {
    // Don't close attract mode if clicking the learn more or language buttons
    const target = event.target as HTMLElement;
    if (target?.closest(".additional-controls-button")) {
      return;
    }

    stopAttractMode();
    if (kioskMode) {
      resetInactivityTimer();
    }
  };

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
  }, []);

  // Slide attract mode in/out depending on attractModeActive state
  useEffect(() => {
    if (attractModeActive) {
      setIsSlidingOut(false);

      // Prevents slideout animation from happening on load when kiosk mode is false
      setFirstSlideDone(true);
    } else {
      setIsSlidingOut(true);

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
  }, [attractModeActive]);

  return (
    <div
      tabIndex={attractModeActive ? 0 : -1}
      className={`attract-mode absolute left-0 top-0 z-[10] flex h-[100dvh] w-[100dvw] cursor-pointer flex-col items-center justify-center gap-y-8 bg-black text-white ${isSlidingOut && (firstSlideDone || kioskMode) ? "attract-mode-slide-out" : ""} ${isSlidingOut && !firstSlideDone && !kioskMode ? "attract-mode-out" : ""}`}
      onClick={(e: React.MouseEvent) => handleUserInteraction(e.nativeEvent)}
    >
      {/* Language Button */}
      {attractModeActive && (
        <div className="absolute bottom-4 right-4 z-[11]">
          <LanguageButton />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col items-center justify-center gap-y-6">
        {/* Video + Text */}
        <div className="mb-6 flex flex-row justify-center gap-x-8 px-[108px]">
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
              <div className="flex flex-1">
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

        <div className="flex animate-pulse flex-row items-center gap-x-4 text-3xl font-semibold leading-[100%]">
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
  );
}
