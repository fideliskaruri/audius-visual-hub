import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDrag } from '@use-gesture/react';
import { cn } from "@/lib/utils";
import MediaControls from "./MediaControls";
import Playlist from "./Playlist";
import FileUpload from "./FileUpload";
import PlayerContent from "./PlayerContent";
import ErrorBoundary from "./ErrorBoundary";
import { usePlaylistStorage } from "@/hooks/usePlaylistStorage";
import { useMediaControls } from "@/hooks/useMediaControls";
import { useAudioContext } from "@/hooks/useAudioContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Volume2, Sun } from "lucide-react";

const CONTROLS_HIDE_DELAY = 4000; // Changed to 4 seconds

const MediaPlayer: React.FC = () => {
  // --- Use Playlist Storage Hook ---
  const {
    mediaList,
    addMediaItem,
    removeMediaItem,
    currentMediaIndex,
    setCurrentMediaIndex,
    isLoading: isPlaylistLoading,
  } = usePlaylistStorage();

  // --- Use Media Controls Hook ---
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

  // --- Use Audio Context ---
  const {
    audioContext,
    analyser,
    connectAudioSource
  } = useAudioContext();

  // --- Use File Upload Hook ---
  const { handleFileSelect } = useFileUpload({
    addMediaItem,
    currentMediaIndex,
    setCurrentMediaIndex,
    setIsPlaying,
    mediaListLength: mediaList.length,
  });

  // Local state
  const [showVisualizer, setShowVisualizer] = useState<boolean>(true);
  const [simulatedBrightness, setSimulatedBrightness] = useState(1); // 0 (dark) to 1 (normal)
  const [controlsVisible, setControlsVisible] = useState<boolean>(true); // State for controls visibility
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [indicatorValue, setIndicatorValue] = useState(0); // Holds current value for the active indicator
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timer to hide indicators

  // Ref for the content area
  const playerContentRef = useRef<HTMLDivElement>(null);
  const gestureStateRef = useRef({
    volume: 0,
    brightness: 1,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
  });
  const lastTapTimeRef = useRef(0); // For double-click detection
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout for single/double click distinction
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for the hide timer

  // --- Click / Double-Click Handler ---
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    // Ignore clicks on controls
    if (target.closest('.media-controls-container')) return;
    if (!mediaRef.current || duration <= 0) return;

    const now = Date.now(); // Use Date.now() for click events
    const DOUBLE_CLICK_THRESHOLD = 300; // ms

    if (now - lastTapTimeRef.current < DOUBLE_CLICK_THRESHOLD) {
      // Double click detected
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current); // Cancel single click timeout
      lastTapTimeRef.current = 0; // Reset tap time

      const rect = playerContentRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Get click position relative to the element
      const clickX = event.clientX - rect.left;
      const clickXPercent = clickX / rect.width;

      if (clickXPercent < 0.3) { // Double click left side
        console.log("Double Click Left: Seek Backward");
        seekTo(Math.max(currentTime - 10, 0));
      } else if (clickXPercent > 0.7) { // Double click right side
        console.log("Double Click Right: Seek Forward");
        seekTo(Math.min(currentTime + 10, duration));
      } else { // Double click center
        console.log("Double Click Center: Play/Pause");
        togglePlayPause();
      }
    } else {
      // Potential single click - wait to see if it becomes a double click
      lastTapTimeRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        // If timeout executes, it was a single click
        console.log("Single Click: (No action defined, could toggle controls visibility)");
        // Example: toggleControlsVisibility();
        lastTapTimeRef.current = 0; // Reset after timeout
      }, DOUBLE_CLICK_THRESHOLD);
    }
  };

  // --- Drag Gesture (Seek, Volume, Brightness) ---
  const bindDrag = useDrag(({ event, down, movement: [mx, my], initial: [ix, iy], xy: [cx, cy], velocity: [vx, vy], direction: [dx, dy], first, last, memo }) => {
    const target = event.target as HTMLElement;
    // Ignore drags starting on controls
    if (first && target.closest('.media-controls-container')) return;
    if (!mediaRef.current || duration <= 0) return;

    const container = playerContentRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // --- Clear indicator hide timeout on new drag activity ---
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
      indicatorTimeoutRef.current = null;
    }

    if (first) {
      // Determine gesture type based on initial movement direction
      memo = Math.abs(dx) > Math.abs(dy) ? 'seek' : (ix < rect.width / 2 ? 'brightness' : 'volume');
      gestureStateRef.current = {
        volume: volume,
        brightness: simulatedBrightness,
        isDragging: true,
        dragStartX: ix,
        dragStartY: iy,
      };
      console.log("Gesture Start:", memo);

      // --- Show initial indicator ---
      if (memo === 'volume') {
        setShowVolumeIndicator(true);
        setShowBrightnessIndicator(false);
        setIndicatorValue(gestureStateRef.current.volume);
      } else if (memo === 'brightness') {
        setShowBrightnessIndicator(true);
        setShowVolumeIndicator(false);
        setIndicatorValue(gestureStateRef.current.brightness);
      } else {
        // Hide indicators if seeking
        setShowVolumeIndicator(false);
        setShowBrightnessIndicator(false);
      }
    }

    if (!memo) return; // If type couldn't be determined or ignored

    // Calculate changes based on gesture type
    if (memo === 'seek') {
      // Horizontal drag for seeking
      const seekChange = (mx / rect.width) * (duration / 2); // Adjust sensitivity
      const targetTime = mediaRef.current.currentTime + seekChange;
      // seekTo(targetTime); // Seek continuously? Might be laggy.
      // Seek only on drag end for better performance?
      if (last) {
        const finalTargetTime = mediaRef.current.currentTime + (mx / rect.width) * (duration / 2);
        console.log("Seek End:", finalTargetTime);
        seekTo(finalTargetTime);
      } else {
        // Optionally show visual feedback during drag
        console.log("Seeking (drag):", targetTime);
      }
    } else {
      // Vertical drag for volume or brightness
      const change = -my / (rect.height * 1.5); // Adjust sensitivity (negative because Y increases downwards)

      if (memo === 'volume') {
        const newVolume = gestureStateRef.current.volume + change;
        const clampedVolume = Math.max(0, Math.min(newVolume, 1)); // Clamp 0-1
        setMediaVolume(clampedVolume); // Update actual volume
        setIndicatorValue(clampedVolume); // Update indicator value
        console.log("Volume Drag:", clampedVolume);
      } else if (memo === 'brightness') {
        const newBrightness = gestureStateRef.current.brightness + change;
        const clampedBrightness = Math.max(0.1, Math.min(newBrightness, 1)); // Clamp brightness
        setSimulatedBrightness(clampedBrightness); // Update actual brightness
        setIndicatorValue(clampedBrightness); // Update indicator value
        console.log("Brightness Drag:", clampedBrightness);
      }
    }

    if (last) {
      console.log("Gesture End");
      gestureStateRef.current.isDragging = false;
      memo = undefined;

      // --- Hide indicators after a delay ---
      indicatorTimeoutRef.current = setTimeout(() => {
        setShowVolumeIndicator(false);
        setShowBrightnessIndicator(false);
        indicatorTimeoutRef.current = null;
      }, 1000); // Hide after 1 second
    }
    return memo; // Pass memo to next event
  }, {
    axis: undefined, // Allow movement on both axes initially
    threshold: 10, // Minimum movement pixels to trigger drag
  });

  // Keyboard Shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore shortcuts if typing in an input, textarea, etc.
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    // Only apply shortcuts if media is loaded
    if (!mediaRef.current || duration <= 0) return;

    console.log("Key pressed:", event.code); // For debugging

    switch (event.code) {
      case 'Space':
        event.preventDefault(); // Prevent page scroll
        togglePlayPause();
        break;
      case 'KeyK': // Common alternative for play/pause
        togglePlayPause();
        break;
      case 'ArrowRight':
        event.preventDefault();
        seekTo(Math.min(currentTime + 5, duration)); // Seek forward 5s
        break;
      case 'ArrowLeft':
        event.preventDefault();
        seekTo(Math.max(currentTime - 5, 0)); // Seek backward 5s
        break;
      case 'ArrowUp':
        event.preventDefault();
        setMediaVolume(Math.min(volume + 0.1, 1)); // Increase volume
        break;
      case 'ArrowDown':
        event.preventDefault();
        setMediaVolume(Math.max(volume - 0.1, 0)); // Decrease volume
        break;
      case 'KeyM':
        toggleMute();
        break;
      case 'KeyF':
        toggleFullscreen();
        break;
      case 'KeyN': // Next track (Shift+N often used)
        if (event.shiftKey) {
          handleNextTrack();
        }
        break;
      case 'KeyP': // Previous track (Shift+P often used)
        if (event.shiftKey) {
          handlePreviousTrack();
        }
        break;
      // Add more shortcuts (e.g., 'L' for loop, number keys for seeking percentage)
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

  // --- Function to manage controls visibility timeout ---
  const resetControlsTimeout = useCallback(() => {
    if (!isFullscreen) {
      // Not fullscreen: ensure visible, clear timer
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
      return;
    }

    // Is fullscreen: show controls, reset timer
    setControlsVisible(true); // Ensure visible on activity
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
      controlsTimeoutRef.current = null;
    }, CONTROLS_HIDE_DELAY); // Use the updated delay
  }, [isFullscreen]); // Depend on isFullscreen

  // --- Effect to handle activity detection for controls ---
  useEffect(() => {
    const container = mediaContainerRef.current;
    if (!container || !isFullscreen) {
      // Ensure controls are visible when not fullscreen or container missing
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
      return;
    }

    // --- Attach listeners when fullscreen ---
    const handleActivity = () => {
      resetControlsTimeout();
    };

    resetControlsTimeout(); // Initial call when entering fullscreen

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

  // Add loading indicator while playlist loads from DB
  if (isPlaylistLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p>Loading playlist...</p> {/* Or use a spinner component */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0"> {/* Add min-h-0 */}
        <div
          className={cn(
            "flex flex-col", // Ensure vertical layout
            isFullscreen ? "fixed inset-0 z-50 bg-black" : "lg:col-span-2",
            "transition-all duration-300 ease-in-out" // Added transition
          )}
          ref={mediaContainerRef}
        >
          {/* Gesture Area & Brightness Overlay */}
          <div
            ref={playerContentRef}
            className={cn(
              "relative w-full flex-grow rounded-lg overflow-hidden bg-black/40 flex items-center justify-center cursor-pointer",
              isFullscreen ? "rounded-none w-full h-full" : "aspect-video", // Maintain aspect ratio when not fullscreen
              "min-h-0" // Prevent flex item from growing indefinitely
            )}
            onClick={handleClick}
            {...bindDrag()}
            style={{ touchAction: 'none' }} // Prevent default browser touch actions like scrolling
          >
            {/* --- Volume & Brightness Indicators --- */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              {/* Volume Indicator */}
              {showVolumeIndicator && (
                <div className="flex flex-col items-center bg-black/60 p-3 rounded-lg">
                  <Volume2 size={24} className="mb-2 text-white" />
                  <div className="w-2 h-24 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="bg-white rounded-full transition-all duration-100"
                      style={{ height: `${indicatorValue * 100}%`, marginTop: `${(1 - indicatorValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-white text-sm mt-2">{Math.round(indicatorValue * 100)}%</span>
                </div>
              )}
              {/* Brightness Indicator */}
              {showBrightnessIndicator && (
                <div className="flex flex-col items-center bg-black/60 p-3 rounded-lg">
                  <Sun size={24} className="mb-2 text-white" />
                  <div className="w-2 h-24 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="bg-white rounded-full transition-all duration-100"
                      style={{ height: `${indicatorValue * 100}%`, marginTop: `${(1 - indicatorValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-white text-sm mt-2">{Math.round(indicatorValue * 100)}%</span>
                </div>
              )}
            </div>

            <ErrorBoundary>
              <PlayerContent
                key={currentMedia?.id ?? 'no-media'} // Keep key prop
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
                onFileSelect={handleFileSelect} // Pass file select handler
                isFullscreen={isFullscreen}
              />
            </ErrorBoundary>

            {/* Simulated Brightness Overlay */}
            <div
              className="absolute inset-0 pointer-events-none transition-colors duration-100"
              style={{
                backgroundColor: `rgba(0, 0, 0, ${1 - simulatedBrightness})`,
                zIndex: 10 // Ensure it's above the video but below controls
              }}
            />
          </div>

          {/* Controls Container */}
          <div className={cn(
            "w-full media-controls-container flex-shrink-0 z-20", // Ensure z-index
            // Styles for fullscreen auto-hide
            isFullscreen && "absolute bottom-0 left-0 right-0 transition-opacity duration-300 ease-in-out",
            isFullscreen && !controlsVisible && "opacity-0 pointer-events-none", // Hide when not visible in fullscreen
            isFullscreen && controlsVisible && "opacity-100 pointer-events-auto" // Show when visible in fullscreen
            // Note: Default styles (non-fullscreen) don't need opacity/pointer-events changes here
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

        {/* Playlist Section */}
        {!isFullscreen && (
          <div className="lg:col-span-1 flex flex-col min-h-0"> {/* Add min-h-0 */}
            {console.log("Rendering Playlist Section (isFullscreen=false)")}
            <Playlist
              mediaList={mediaList}
              currentMediaIndex={currentMediaIndex}
              isPlaying={isPlaying}
              onItemClick={(index) => setCurrentMediaIndex(index)}
              onRemoveItem={removeMediaItem} // Pass removeMediaItem
            />
            <FileUpload onFileSelect={handleFileSelect} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPlayer;
