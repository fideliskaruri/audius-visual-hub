import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { PlaylistItem } from "@/types/media";

interface UseMediaControlsProps {
  mediaList: PlaylistItem[];
  currentMediaIndex: number;
  setCurrentMediaIndex: (index: number) => void;
}

interface UseMediaControlsReturn {
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  duration: number;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  isShuffling: boolean;
  isFullscreen: boolean;
  mediaRef: React.RefObject<HTMLAudioElement | HTMLVideoElement>;
  mediaContainerRef: React.RefObject<HTMLDivElement>;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setMediaVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  toggleFullscreen: () => void;
  handleNextTrack: () => void;
  handlePreviousTrack: () => void;
}

export function useMediaControls({
  mediaList,
  currentMediaIndex,
  setCurrentMediaIndex
}: UseMediaControlsProps): UseMediaControlsReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1); // Local state for volume
  const [isMuted, setIsMutedState] = useState(false); // Local state for mute
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false); // Implement shuffle logic if needed
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const originalOrderRef = useRef<PlaylistItem[]>([]); // For shuffle

  // --- Playback Control ---

  const togglePlayPause = useCallback(async () => {
    if (!mediaRef.current) {
      console.warn("togglePlayPause: mediaRef is null");
      return;
    }
    const media = mediaRef.current;

    if (media.readyState < 1) { // HAVE_NOTHING or HAVE_METADATA
      console.warn("togglePlayPause: Media not ready.");
      // Optionally try to load again? media.load();
      return;
    }

    if (media.paused || media.ended) {
      try {
        console.log("Attempting play...");
        await media.play();
        // isPlaying state will be set by the 'play'/'playing' event listener
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Playback Error:", error);
          toast.error(`Playback Error: ${error.message}`);
          setIsPlaying(false); // Ensure state is false on error
        } else {
          console.log("Play interrupted.");
        }
      }
    } else {
      console.log("Attempting pause...");
      media.pause();
      // isPlaying state will be set by the 'pause' event listener
    }
  }, [mediaRef]); // No dependency on isPlaying state here

  // --- Navigation ---

  const handleNextTrack = useCallback(() => {
    if (mediaList.length === 0) return;
    const nextIndex = (currentMediaIndex + 1) % mediaList.length;
    setCurrentMediaIndex(nextIndex);
    setIsPlaying(false); // Stop playback when changing tracks
  }, [mediaList.length, currentMediaIndex, setCurrentMediaIndex]);

  const handlePreviousTrack = useCallback(() => {
    if (mediaList.length === 0) return;
    const prevIndex = (currentMediaIndex - 1 + mediaList.length) % mediaList.length;
    setCurrentMediaIndex(prevIndex);
    setIsPlaying(false); // Stop playback when changing tracks
  }, [mediaList.length, currentMediaIndex, setCurrentMediaIndex]);

  // --- Seeking and Volume ---

  const seekTo = useCallback((time: number) => {
    if (mediaRef.current && isFinite(time)) {
      mediaRef.current.currentTime = Math.max(0, Math.min(time, duration));
    }
  }, [mediaRef, duration]);

  const setMediaVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(newVolume, 1));
    setVolumeState(clampedVolume);
    if (mediaRef.current) {
      mediaRef.current.volume = clampedVolume;
      if (clampedVolume > 0 && mediaRef.current.muted) {
        mediaRef.current.muted = false; // Unmute if volume is turned up
        setIsMutedState(false);
      }
    }
  }, [mediaRef]);

  const toggleMute = useCallback(() => {
    setIsMutedState(prev => {
      const nextMuted = !prev;
      if (mediaRef.current) {
        mediaRef.current.muted = nextMuted;
      }
      return nextMuted;
    });
  }, [mediaRef]);

  // --- Loop, Shuffle, Fullscreen ---

  const toggleLoop = useCallback(() => setIsLooping(prev => !prev), []);
  const toggleShuffle = useCallback(() => setIsShuffling(prev => !prev), []); // Add shuffle logic later

  const toggleFullscreen = useCallback(async () => {
    const container = mediaContainerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        // Standard method first
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        }
        // Fallbacks for older browsers (consider removing if not needed)
        else if ((container as any).webkitRequestFullscreen) { /* Safari */
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).msRequestFullscreen) { /* IE11 */
          await (container as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) { /* Safari */
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) { /* IE11 */
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error("Fullscreen API error:", error);
      toast.error("Could not toggle fullscreen mode.");
      setIsFullscreen(!!document.fullscreenElement);
    }
  }, [mediaContainerRef]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      console.log("Fullscreen change detected:", !!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
    document.addEventListener('msfullscreenchange', handleFullscreenChange); // IE11

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // --- Event Listeners ---
  useEffect(() => {
    console.log(`[useMediaControls Effect] Running for index: ${currentMediaIndex}`);

    // --- Explicit State Reset on Index Change ---
    console.log("[useMediaControls Effect] Resetting time, duration, playing state.");
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    const media = mediaRef.current;
    if (!media) {
      console.log("[useMediaControls Effect] Media ref is null, skipping listener setup.");
      return;
    }

    console.log("[useMediaControls Effect] Attaching listeners to:", media);
    console.log(`[useMediaControls Effect] Initial media state: paused=${media.paused}, ended=${media.ended}, readyState=${media.readyState}, duration=${media.duration}, currentTime=${media.currentTime}, src=${media.currentSrc}`);

    const handleTimeUpdate = () => setCurrentTime(media.currentTime);
    const handleDurationChange = () => {
      const newDuration = media.duration || 0;
      if (isFinite(newDuration) && newDuration > 0) {
        setDuration(newDuration);
      }
    };
    const handleLoadedMetadata = () => {
      console.log("Event: loadedmetadata");
      const newDuration = media.duration || 0;
      if (isFinite(newDuration) && newDuration > 0) {
        setDuration(newDuration);
      } else {
        console.warn("Loaded metadata but duration is invalid:", newDuration);
        setDuration(0);
      }
      setCurrentTime(0);
      media.volume = volume;
      media.muted = isMuted;
    };
    const handleCanPlay = () => console.log("Event: canplay");
    const handlePlay = () => {
      console.log("Event: play/playing");
      setIsPlaying(true);
    };
    const handlePause = () => {
      if (!media.seeking && !media.ended) {
        console.log("Event: pause");
        setIsPlaying(false);
      } else {
        console.log("Event: pause (ignored during seek/end)");
      }
    };
    const handleEnded = () => {
      console.log("Event: ended");
      setIsPlaying(false);
      setCurrentTime(duration);
      if (!isLooping) {
        handleNextTrack();
      }
    };
    const handleVolumeChange = () => {
      setVolumeState(media.volume);
      setIsMutedState(media.muted);
    };
    const handleError = (e: Event) => {
      const error = media.error;
      console.error("Media Error Event:", e);
      console.error("Media Error Details:", error);
      toast.error(`Media Error: ${error?.message || 'Unknown error'}`);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };

    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('durationchange', handleDurationChange);
    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('canplay', handleCanPlay);
    media.addEventListener('play', handlePlay);
    media.addEventListener('playing', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('ended', handleEnded);
    media.addEventListener('volumechange', handleVolumeChange);
    media.addEventListener('error', handleError);

    const initialDuration = media.duration || 0;
    if (isFinite(initialDuration) && initialDuration > 0) {
      setDuration(initialDuration);
    }
    setCurrentTime(media.currentTime || 0);
    setVolumeState(media.volume);
    setIsMutedState(media.muted);
    setIsPlaying(!media.paused && !media.ended && media.readyState > 2);
    console.log(`[useMediaControls Effect] Synced state: duration=${duration}, currentTime=${currentTime}, isPlaying=${isPlaying}`);

    return () => {
      console.log("[useMediaControls Effect Cleanup] Removing listeners from:", media);
      if (media) {
        media.removeEventListener('timeupdate', handleTimeUpdate);
        media.removeEventListener('durationchange', handleDurationChange);
        media.removeEventListener('loadedmetadata', handleLoadedMetadata);
        media.removeEventListener('canplay', handleCanPlay);
        media.removeEventListener('play', handlePlay);
        media.removeEventListener('playing', handlePlay);
        media.removeEventListener('pause', handlePause);
        media.removeEventListener('ended', handleEnded);
        media.removeEventListener('volumechange', handleVolumeChange);
        media.removeEventListener('error', handleError);
      }
    };
  }, [mediaRef, currentMediaIndex, isLooping, handleNextTrack]);

  return {
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
  };
}
