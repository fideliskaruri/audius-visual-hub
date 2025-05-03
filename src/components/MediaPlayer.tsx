import React, { useState, useRef, useEffect, useCallback } from "react";
// Import only useDrag from the library
import { useDrag } from '@use-gesture/react';
// Import the custom hook
import { useCustomLongPress } from '@/hooks/useCustomLongPress';
import { cn } from "@/lib/utils";
import MediaControls from "./MediaControls";
import Playlist from "./Playlist";
import PlayerContent from "./PlayerContent";
import ErrorBoundary from "./ErrorBoundary";
import { usePlaylistStorage } from "@/hooks/usePlaylistStorage";
import { useMediaControls } from "@/hooks/useMediaControls";
import { useAudioContext } from "@/hooks/useAudioContext";
import { toast } from "sonner";
import { Volume2, Sun, Rewind, FastForward, Play, Pause } from "lucide-react";
import { formatTime } from "@/lib/utils";

const CONTROLS_HIDE_DELAY = 4000;
const DOUBLE_CLICK_THRESHOLD = 300; // ms
const LONG_PRESS_THRESHOLD = 500; // ms for hold-to-seek

const MediaPlayer: React.FC = () => {
  const {
    mediaList,
    addMediaItem,
    removeMediaItem,
    currentMediaIndex,
    setCurrentMediaIndex,
    isLoading: isPlaylistLoading,
  } = usePlaylistStorage();
  const {
    isPlaying,
    setIsPlaying,
    duration,
    currentTime,
    volume,
    isMuted,
    isLooping,
    isShuffling,
    isFullscreen,
    mediaRef,
    mediaContainerRef,
    togglePlayPause,
    seekTo,
    setMediaVolume,
    toggleMute,
    toggleLoop,
    toggleShuffle,
    toggleFullscreen,
    handleNextTrack,
    handlePreviousTrack
  } = useMediaControls({
    mediaList,
    currentMediaIndex,
    setCurrentMediaIndex
  });
  const {
    audioContext,
    analyser,
    connectAudioSource
  } = useAudioContext();

  const [showVisualizer, setShowVisualizer] = useState<boolean>(true);
  const [simulatedBrightness, setSimulatedBrightness] = useState(1);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [showSeekIndicator, setShowSeekIndicator] = useState(false);
  const [showHoldSeekIndicator, setShowHoldSeekIndicator] = useState(false);
  const [indicatorValue, setIndicatorValue] = useState(0);
  const [seekIndicatorText, setSeekIndicatorText] = useState("");
  const [holdSeekTime, setHoldSeekTime] = useState<number | null>(null);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playerContentRef = useRef<HTMLDivElement>(null);
  const gestureStateRef = useRef({
    volume: 0, brightness: 1, isDragging: false, dragStartX: 0, dragStartY: 0,
    isHoldingSeek: false,
    holdSeekStartTime: 0,
  });
  const lastTapTimeRef = useRef(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hideIndicators = useCallback(() => {
    setShowVolumeIndicator(false);
    setShowBrightnessIndicator(false);
    setShowSeekIndicator(false);
    setShowHoldSeekIndicator(false);
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
      indicatorTimeoutRef.current = null;
    }
  }, []);

  const showIndicatorWithTimeout = useCallback((type: 'volume' | 'brightness' | 'seek', value?: number | string, durationMs = 1000) => {
    hideIndicators();
    if (type === 'volume') {
      setShowVolumeIndicator(true);
      setIndicatorValue(value as number);
    } else if (type === 'brightness') {
      setShowBrightnessIndicator(true);
      setIndicatorValue(value as number);
    } else if (type === 'seek') {
      setShowSeekIndicator(true);
      setSeekIndicatorText(value as string);
    }
    indicatorTimeoutRef.current = setTimeout(hideIndicators, durationMs);
  }, [hideIndicators]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('.media-controls-container')) return;
    if (!mediaRef.current || duration <= 0) return;

    const now = Date.now();

    if (now - lastTapTimeRef.current < DOUBLE_CLICK_THRESHOLD) {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      lastTapTimeRef.current = 0;

      const rect = playerContentRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = event.clientX - rect.left;
      const clickXPercent = clickX / rect.width;

      let seekAmount = 0;
      let indicatorText = "";
      if (clickXPercent < 0.3) {
        seekAmount = -10;
        indicatorText = "-10s";
      } else if (clickXPercent > 0.7) {
        seekAmount = 10;
        indicatorText = "+10s";
      } else {
        togglePlayPause();
        showIndicatorWithTimeout('seek', isPlaying ? 'Pause' : 'Play', 800);
        return;
      }

      const targetTime = Math.max(0, Math.min(currentTime + seekAmount, duration));
      seekTo(targetTime);
      showIndicatorWithTimeout('seek', indicatorText);

    } else {
      lastTapTimeRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        if (isFullscreen) {
          setControlsVisible(v => !v);
          if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = null;
          }
        }
        lastTapTimeRef.current = 0;
      }, DOUBLE_CLICK_THRESHOLD);
    }
  };

  const customLongPressBinds = useCustomLongPress({
    threshold: LONG_PRESS_THRESHOLD,
    moveThreshold: 15,
    onLongPressStart: (event) => {
      const target = event.target as HTMLElement;
      const controlsContainer = document.querySelector('.media-controls-container');
      if (controlsContainer && controlsContainer.contains(target)) {
        console.log("Long press ignored on controls");
        return;
      }

      if (gestureStateRef.current.isDragging) {
        console.log("Long press ignored during other drag");
        return;
      }

      console.log("Custom Long Press Detected - Starting Hold Seek");
      gestureStateRef.current.isHoldingSeek = true;
      gestureStateRef.current.holdSeekStartTime = currentTime;
      setShowHoldSeekIndicator(true);
      setHoldSeekTime(currentTime);
      hideIndicators();
    },
    onLongPressEnd: (event) => {
      if (gestureStateRef.current.isHoldingSeek) {
        console.log("Custom Long Press Finish (Pointer Up)");
        gestureStateRef.current.isHoldingSeek = false;
        indicatorTimeoutRef.current = setTimeout(hideIndicators, 500);
      }
    },
    onCancel: (event) => {
      if (gestureStateRef.current.isHoldingSeek) {
        console.log("Custom Long Press Cancelled (Movement/Leave)");
        gestureStateRef.current.isHoldingSeek = false;
        hideIndicators();
      }
    }
  });

  const bindDrag = useDrag(({ event, down, movement: [mx, my], initial: [ix, iy], velocity: [vx, vy], direction: [dx, dy], first, last, memo }) => {
    const originalEvent = event as PointerEvent;
    const target = originalEvent?.target as HTMLElement;
    if (first && target?.closest('.media-controls-container')) {
      console.log("Drag ignored on controls");
      return;
    }

    if (!mediaRef.current || duration <= 0) return;

    const container = playerContentRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
      indicatorTimeoutRef.current = null;
    }

    if (first) {
      if (gestureStateRef.current.isHoldingSeek) {
        memo = 'hold-seek';
        console.log("Drag Start: Continuing Hold Seek");
        setShowHoldSeekIndicator(true);
        setHoldSeekTime(currentTime);
      } else {
        memo = Math.abs(dx) > Math.abs(dy) ? 'seek' : (ix < rect.width / 2 ? 'brightness' : 'volume');
        gestureStateRef.current = {
          ...gestureStateRef.current,
          volume: volume, brightness: simulatedBrightness, isDragging: true, dragStartX: ix, dragStartY: iy,
        };
        console.log("Drag Start:", memo);

        if (memo === 'volume') {
          showIndicatorWithTimeout('volume', volume, 99999);
        } else if (memo === 'brightness') {
          showIndicatorWithTimeout('brightness', simulatedBrightness, 99999);
        } else {
          hideIndicators();
        }
      }
    }

    if (!memo) return;

    if (memo === 'hold-seek') {
      const seekChange = (mx / rect.width) * (duration * 0.5);
      const targetTime = Math.max(0, Math.min(gestureStateRef.current.holdSeekStartTime + seekChange, duration));
      seekTo(targetTime);
      setHoldSeekTime(targetTime);
    } else if (memo === 'seek') {
      if (last) {
        const seekChange = (mx / rect.width) * (duration * 0.5);
        const finalTargetTime = Math.max(0, Math.min(currentTime + seekChange, duration));
        console.log("Seek End:", finalTargetTime);
        seekTo(finalTargetTime);
      }
    } else {
      const change = -my / (rect.height * 1.5);
      if (memo === 'volume') {
        const newVolume = gestureStateRef.current.volume + change;
        const clampedVolume = Math.max(0, Math.min(newVolume, 1));
        setMediaVolume(clampedVolume);
        setIndicatorValue(clampedVolume);
        setShowVolumeIndicator(true);
      } else if (memo === 'brightness') {
        const newBrightness = gestureStateRef.current.brightness + change;
        const clampedBrightness = Math.max(0.1, Math.min(newBrightness, 1));
        setSimulatedBrightness(clampedBrightness);
        setIndicatorValue(clampedBrightness);
        setShowBrightnessIndicator(true);
      }
    }

    if (last) {
      console.log("Drag End");
      gestureStateRef.current.isDragging = false;

      if (!gestureStateRef.current.isHoldingSeek) {
        indicatorTimeoutRef.current = setTimeout(hideIndicators, 1000);
      }
      memo = undefined;
    }
    return memo;
  }, {
    axis: undefined, threshold: 10,
    eventOptions: { passive: false },
    filterTaps: true,
    pointer: { touch: true }
  });

  const combinedBinds = (...args: any[]) => ({
    ...bindDrag(...args),
    ...customLongPressBinds,
  });

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (!mediaRef.current || duration <= 0) return;

    console.log("Key pressed:", event.code);

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        togglePlayPause();
        break;
      case 'KeyK':
        togglePlayPause();
        break;
      case 'ArrowRight':
        event.preventDefault();
        seekTo(Math.min(currentTime + 5, duration));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        seekTo(Math.max(currentTime - 5, 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setMediaVolume(Math.min(volume + 0.1, 1));
        break;
      case 'ArrowDown':
        event.preventDefault();
        setMediaVolume(Math.max(volume - 0.1, 0));
        break;
      case 'KeyM':
        toggleMute();
        break;
      case 'KeyF':
        toggleFullscreen();
        break;
      case 'KeyN':
        if (event.shiftKey) {
          handleNextTrack();
        }
        break;
      case 'KeyP':
        if (event.shiftKey) {
          handlePreviousTrack();
        }
        break;
    }
  }, [
    togglePlayPause, seekTo, setMediaVolume, toggleMute, toggleFullscreen,
    handleNextTrack, handlePreviousTrack, currentTime, duration, volume, mediaRef
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const resetControlsTimeout = useCallback(() => {
    if (!isFullscreen) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
      return;
    }

    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
      controlsTimeoutRef.current = null;
    }, CONTROLS_HIDE_DELAY);
  }, [isFullscreen]);

  useEffect(() => {
    const container = mediaContainerRef.current;
    if (!container || !isFullscreen) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
      return;
    }

    const handleActivity = () => {
      resetControlsTimeout();
    };

    resetControlsTimeout();

    container.addEventListener('mousemove', handleActivity);
    container.addEventListener('click', handleActivity);
    container.addEventListener('touchstart', handleActivity);

    return () => {
      container.removeEventListener('mousemove', handleActivity);
      container.removeEventListener('click', handleActivity);
      container.removeEventListener('touchstart', handleActivity);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    };
  }, [isFullscreen, mediaContainerRef, resetControlsTimeout]);

  if (isPlaylistLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p>Loading playlist...</p>
      </div>
    );
  }

  const currentMedia = mediaList[currentMediaIndex] ?? null;
  const isAudio = currentMedia?.type === 'audio';

  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto px-4 relative">
      <div className="text-center my-6">
        <h1 className="text-3xl font-bold text-gradient">
          Ultimate Media Player
        </h1>
        <p className="text-muted-foreground mt-2">
          Play your local audio and video files with style
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0">
        <div
          className={cn(
            "flex flex-col",
            isFullscreen ? "fixed inset-0 z-50 bg-black" : "lg:col-span-2",
            "transition-all duration-300 ease-in-out"
          )}
          ref={mediaContainerRef}
        >
          <div
            ref={playerContentRef}
            className={cn(
              "relative w-full flex-grow rounded-lg overflow-hidden bg-black/40 flex items-center justify-center cursor-pointer",
              isFullscreen ? "rounded-none w-full h-full" : "aspect-video",
              "min-h-0"
            )}
            onClick={handleClick}
            {...combinedBinds()}
            style={{ touchAction: 'none' }}
          >
            <div className="absolute inset-x-0 top-0 pt-4 flex items-start justify-center pointer-events-none z-30 space-x-4">
              {showVolumeIndicator && (
                <div className="flex flex-col items-center bg-black/60 p-3 rounded-lg">
                  <Volume2 size={24} className="mb-2 text-white" />
                  <div className="w-2 h-24 bg-gray-600 rounded-full overflow-hidden">
                    <div className="bg-white rounded-full" style={{ height: `${indicatorValue * 100}%`, marginTop: `${(1 - indicatorValue) * 100}%` }} />
                  </div>
                  <span className="text-white text-sm mt-2">{Math.round(indicatorValue * 100)}%</span>
                </div>
              )}
              {showBrightnessIndicator && (
                <div className="flex flex-col items-center bg-black/60 p-3 rounded-lg">
                  <Sun size={24} className="mb-2 text-white" />
                  <div className="w-2 h-24 bg-gray-600 rounded-full overflow-hidden">
                    <div className="bg-white rounded-full" style={{ height: `${indicatorValue * 100}%`, marginTop: `${(1 - indicatorValue) * 100}%` }} />
                  </div>
                  <span className="text-white text-sm mt-2">{Math.round(indicatorValue * 100)}%</span>
                </div>
              )}
              {showSeekIndicator && (
                <div className="flex items-center space-x-2 bg-black/60 p-3 px-4 rounded-lg text-white text-xl font-semibold">
                  {seekIndicatorText.startsWith('+') && <FastForward size={24} />}
                  {seekIndicatorText.startsWith('-') && <Rewind size={24} />}
                  {seekIndicatorText === 'Play' && <Play size={24} />}
                  {seekIndicatorText === 'Pause' && <Pause size={24} />}
                  <span>{seekIndicatorText}</span>
                </div>
              )}
              {showHoldSeekIndicator && holdSeekTime !== null && (
                <div className="flex items-center space-x-2 bg-black/60 p-3 px-4 rounded-lg text-white text-xl font-semibold">
                  <span>{formatTime(holdSeekTime)} / {formatTime(duration)}</span>
                </div>
              )}
            </div>

            <ErrorBoundary>
              <PlayerContent
                key={currentMedia?.id ?? 'no-media'}
                currentMediaIndex={currentMediaIndex}
                currentMedia={currentMedia}
                mediaRef={mediaRef}
                isPlaying={isPlaying}
                showVisualizer={showVisualizer}
                analyser={analyser}
                isLooping={isLooping}
                isMuted={isMuted}
                volume={volume}
                connectAudioSource={connectAudioSource}
                onFileSelect={addMediaItem}
                isFullscreen={isFullscreen}
              />
            </ErrorBoundary>

            <div
              className="absolute inset-0 pointer-events-none transition-colors duration-100"
              style={{
                backgroundColor: `rgba(0, 0, 0, ${1 - simulatedBrightness})`,
                zIndex: 10
              }}
            />
          </div>

          <div className={cn(
            "w-full media-controls-container flex-shrink-0 z-20",
            isFullscreen && "absolute bottom-0 left-0 right-0 transition-opacity duration-300 ease-in-out",
            isFullscreen && !controlsVisible && "opacity-0 pointer-events-none",
            isFullscreen && controlsVisible && "opacity-100 pointer-events-auto"
          )}>
            <MediaControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              isMuted={isMuted}
              isLooping={isLooping}
              isShuffling={isShuffling}
              togglePlayPause={togglePlayPause}
              seekTo={seekTo}
              setVolume={setMediaVolume}
              toggleMute={toggleMute}
              handleNextTrack={handleNextTrack}
              handlePreviousTrack={handlePreviousTrack}
              toggleLoop={toggleLoop}
              toggleShuffle={toggleShuffle}
              toggleVisualizer={setShowVisualizer}
              toggleFullscreen={toggleFullscreen}
              isFullscreen={isFullscreen}
              showVisualizerToggle={isAudio}
            />
          </div>
        </div>

        {!isFullscreen && (
          <div className="lg:col-span-1 flex flex-col min-h-0">
            <Playlist
              mediaList={mediaList}
              currentMediaIndex={currentMediaIndex}
              isPlaying={isPlaying}
              onItemClick={(index) => setCurrentMediaIndex(index)}
              onRemoveItem={removeMediaItem}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPlayer;
