import { useState, useEffect, useRef } from "react";
import { PlaylistItem } from "@/types/media";
import { toast } from "sonner";

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
  seekForward: () => void;
  seekBackward: () => void;
  setMediaVolume: (vol: number) => void;
  volumeUp: () => void;
  volumeDown: () => void;
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
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.75);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);

  // Handle media events
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleTimeUpdate = () => setCurrentTime(media.currentTime);
    const handleDurationChange = () => setDuration(media.duration);
    const handleEnded = () => handleNextTrack();
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      toast.error("Error playing media");
      console.error("Media error:", media.error);
    };

    media.addEventListener("timeupdate", handleTimeUpdate);
    media.addEventListener("durationchange", handleDurationChange);
    media.addEventListener("ended", handleEnded);
    media.addEventListener("play", handlePlay);
    media.addEventListener("pause", handlePause);
    media.addEventListener("error", handleError);

    return () => {
      media.removeEventListener("timeupdate", handleTimeUpdate);
      media.removeEventListener("durationchange", handleDurationChange);
      media.removeEventListener("ended", handleEnded);
      media.removeEventListener("play", handlePlay);
      media.removeEventListener("pause", handlePause);
      media.removeEventListener("error", handleError);
    };
  }, [mediaRef.current, currentMediaIndex]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't handle shortcuts when focus is in input fields
      }
      
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBackward();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekForward();
          break;
        case "ArrowUp":
          e.preventDefault();
          volumeUp();
          break;
        case "ArrowDown":
          e.preventDefault();
          volumeDown();
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "n":
        case "N":
          handleNextTrack();
          break;
        case "p":
        case "P":
          handlePreviousTrack();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentMediaIndex, mediaList]);

  // Apply volume after media element is created
  useEffect(() => {
    if (mediaRef.current) {
      // Set volume programmatically 
      (mediaRef.current as any).volume = volume;
    }
  }, [mediaRef.current, currentMediaIndex]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (mediaContainerRef.current?.requestFullscreen) {
        mediaContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Media controls
  const togglePlayPause = () => {
    const media = mediaRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
    } else {
      media.play().catch(error => {
        toast.error("Couldn't play media. Try selecting a file first.");
        console.error("Error playing media:", error);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleNextTrack = () => {
    if (mediaList.length === 0) return;
    
    let nextIndex;
    if (isShuffling) {
      nextIndex = Math.floor(Math.random() * mediaList.length);
      while (nextIndex === currentMediaIndex && mediaList.length > 1) {
        nextIndex = Math.floor(Math.random() * mediaList.length);
      }
    } else {
      nextIndex = (currentMediaIndex + 1) % mediaList.length;
    }
    
    setCurrentMediaIndex(nextIndex);
    setCurrentTime(0);
    setIsPlaying(true);
    
    setTimeout(() => {
      if (mediaRef.current) {
        mediaRef.current.play().catch(console.error);
      }
    }, 100);
  };

  const handlePreviousTrack = () => {
    if (mediaList.length === 0) return;
    
    // If we're more than 3 seconds into the song, go back to the start
    if (currentTime > 3) {
      setCurrentTime(0);
      if (mediaRef.current) {
        mediaRef.current.currentTime = 0;
      }
      return;
    }
    
    let prevIndex;
    if (isShuffling) {
      prevIndex = Math.floor(Math.random() * mediaList.length);
      while (prevIndex === currentMediaIndex && mediaList.length > 1) {
        prevIndex = Math.floor(Math.random() * mediaList.length);
      }
    } else {
      prevIndex = (currentMediaIndex - 1 + mediaList.length) % mediaList.length;
    }
    
    setCurrentMediaIndex(prevIndex);
    setCurrentTime(0);
    setIsPlaying(true);
    
    setTimeout(() => {
      if (mediaRef.current) {
        mediaRef.current.play().catch(console.error);
      }
    }, 100);
  };

  const seekTo = (time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };
  
  const seekForward = () => {
    if (mediaRef.current) {
      const newTime = Math.min(mediaRef.current.currentTime + 10, duration);
      mediaRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  
  const seekBackward = () => {
    if (mediaRef.current) {
      const newTime = Math.max(mediaRef.current.currentTime - 10, 0);
      mediaRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const setMediaVolume = (vol: number) => {
    const newVolume = Math.max(0, Math.min(1, vol));
    setVolume(newVolume);
    if (mediaRef.current) {
      // Use setAttribute for volume to avoid TypeScript error
      mediaRef.current.setAttribute('volume', newVolume.toString());
      // Also set the property directly for functionality to work
      (mediaRef.current as any).volume = newVolume;
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      if (mediaRef.current) {
        mediaRef.current.muted = false;
      }
    }
  };
  
  const volumeUp = () => setMediaVolume(volume + 0.1);
  const volumeDown = () => setMediaVolume(volume - 0.1);

  const toggleMute = () => {
    if (mediaRef.current) {
      mediaRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleLoop = () => {
    if (mediaRef.current) {
      mediaRef.current.loop = !isLooping;
      setIsLooping(!isLooping);
    }
  };

  const toggleShuffle = () => {
    setIsShuffling(!isShuffling);
  };

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
    seekForward,
    seekBackward,
    setMediaVolume,
    volumeUp,
    volumeDown,
    toggleMute,
    toggleLoop,
    toggleShuffle,
    toggleFullscreen,
    handleNextTrack,
    handlePreviousTrack
  };
}
