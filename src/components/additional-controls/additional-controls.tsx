"use client";

import { translations } from "@/assets/static-data/translations";
import { MuseumObjectContext } from "@/context/museum-object-context";
import { useSearchParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import ExitFullscreenIcon from "../icons/exit-fullscreen";
import FullscreenIcon from "../icons/fullscreen";
import InfoSpeechBubbleIcon from "../icons/info-speech-bubble";
import MetadataIcon from "../icons/metadata";
import PinchToZoomIcon from "../icons/pinch-to-zoom";
import LanguageButton from "../language-button/language-button";
import MetadataModal from "../metadata-modal/metadata-modal";

// These controls display next to the Clover Controls (e.g. zoom in, zoom out, home) and are meant to blend in with the Clover UI.
export default function AdditionalControls() {
  const { museumObjectState, setMuseumObjectState } =
    useContext(MuseumObjectContext);
  const searchParams = useSearchParams();
  const spanish = searchParams.get("spanish");

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const onLearnMoreClick = (event: any) => {
    // The attract mode has listeners for click events that close the attract mode.
    // We want this button to open the attract mode, but don't want the click event to immediately close it.
    event.stopPropagation();

    setMuseumObjectState((prevState) => ({
      ...prevState,
      attractModeActive: true,
    }));
  };

  const onFullscreenClick = () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error entering fullscreen:", err);
      });
    } else {
      // Exit fullscreen
      document.exitFullscreen().catch((err) => {
        console.error("Error exiting fullscreen:", err);
      });
    }
  };

  const onMetadataClick = (event: any) => {
    // Prevent event propagation to avoid any parent click handlers
    event.stopPropagation();
    setIsMetadataModalOpen(true);
  };

  const { activeLanguage } = museumObjectState;

  return (
    <div className="mr-[-1px] flex flex-col items-center justify-center gap-y-[0.618rem] rounded-lg p-4 cloverSm:flex-row cloverSm:gap-x-[0.618rem]">
      {museumObjectState.kioskMode && (
        <div className="additional-controls-instruction w-max-content hidden h-8 items-center justify-center rounded-md bg-black px-[18px] py-[15px] text-white cloverSm:flex">
          <span className="mr-4 text-lg">
            <PinchToZoomIcon className="h-6 w-6" />
          </span>
          <span>{translations[activeLanguage].pinchToZoom}</span>
        </div>
      )}

      {spanish !== "false" && <LanguageButton />}

      {/* Learn More */}
      <button
        className="additional-controls-button w-max-content group flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-black py-[15px] text-white hover:border-ncmaOrange hover:bg-ncmaDarkOrange hover:text-ncmaOrange focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-400 lg:w-auto lg:px-[18px]"
        onPointerUp={onLearnMoreClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onLearnMoreClick(e);
          }
        }}
      >
        <span className="text-lg lg:mr-4">
          <InfoSpeechBubbleIcon
            className="h-5 w-5 fill-white group-hover:fill-ncmaOrange"
            fill="inherit"
          />
        </span>
        <span className="hidden lg:block">
          {translations[activeLanguage].learnMore}
        </span>
        <span className="sr-only lg:hidden">
          {translations[activeLanguage].learnMore}
        </span>
      </button>

      {/* Metadata */}
      {!museumObjectState.kioskMode && museumObjectState.manifestData && (
        <button
          className="additional-controls-button w-max-content group flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-black py-[15px] text-white hover:border-ncmaOrange hover:bg-ncmaDarkOrange hover:text-ncmaOrange focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-400 lg:w-auto lg:px-[18px]"
          onPointerUp={onMetadataClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onMetadataClick(e);
            }
          }}
        >
          <span className="text-lg lg:mr-4">
            <MetadataIcon className="h-5 w-5 stroke-white group-hover:stroke-ncmaOrange" />
          </span>
          <span className="hidden lg:block">
            {translations[activeLanguage].metadata}
          </span>
          <span className="sr-only lg:hidden">
            {translations[activeLanguage].metadata}
          </span>
        </button>
      )}

      {/* Fullscreen */}
      {!museumObjectState.kioskMode && (
        <button
          className="additional-controls-button w-max-content group flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-black py-[15px] text-white hover:border-ncmaOrange hover:bg-ncmaDarkOrange hover:text-ncmaOrange focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-400 lg:w-auto lg:px-[18px]"
          onPointerUp={onFullscreenClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onFullscreenClick();
            }
          }}
        >
          <span className="text-lg lg:mr-4">
            {isFullscreen ? (
              <ExitFullscreenIcon className="h-5 w-5 stroke-white group-hover:stroke-ncmaOrange" />
            ) : (
              <FullscreenIcon className="h-5 w-5 stroke-white group-hover:stroke-ncmaOrange" />
            )}
          </span>
          <span className="hidden lg:block">
            {isFullscreen
              ? translations[activeLanguage].exitFullscreen
              : translations[activeLanguage].fullscreen}
          </span>
          <span className="sr-only lg:hidden">
            {isFullscreen
              ? translations[activeLanguage].exitFullscreen
              : translations[activeLanguage].fullscreen}
          </span>
        </button>
      )}

      {/* Metadata Modal */}
      <MetadataModal
        isOpen={isMetadataModalOpen}
        onClose={() => setIsMetadataModalOpen(false)}
      />
    </div>
  );
}
