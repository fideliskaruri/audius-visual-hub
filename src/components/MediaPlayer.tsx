import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MediaControls from "./MediaControls";
import Visualizer from "./Visualizer";
import Playlist from "./Playlist";
import FileUpload from "./FileUpload";
import { PlaylistItem } from "@/types/media";
import MediaInfo from "./MediaInfo";

const MediaPlayer: React.FC = () => {
  const [mediaList, setMediaList] = useState<PlaylistItem[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.75);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showVisualizer, setShowVisualizer] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  // Load playlist from localStorage on initial render
  useEffect(() => {
    const savedPlaylist = localStorage.getItem('mediaPlaylist');
    if (savedPlaylist) {
      try {
        const parsedPlaylist = JSON.parse(savedPlaylist);
        // Filter out entries that don't have the necessary properties
        const validPlaylist = parsedPlaylist.filter((item: any) => 
          item.name && item.type && item.dataUrl
        );
        setMediaList(validPlaylist);
        
        const lastIndex = parseInt(localStorage.getItem('currentMediaIndex') || '-1');
        if (lastIndex >= 0 && lastIndex < validPlaylist.length) {
          setCurrentMediaIndex(lastIndex);
        }
      } catch (error) {
        console.error("Error loading playlist from localStorage:", error);
        toast.error("Couldn't load your saved playlist");
      }
    }
  }, []);

  // Save playlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('mediaPlaylist', JSON.stringify(mediaList));
  }, [mediaList]);

  // Save current media index to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentMediaIndex', currentMediaIndex.toString());
  }, [currentMediaIndex]);

  // Setup audio context and analyzer
  useEffect(() => {
    if (mediaRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext && !audioContext) {
        const newAudioContext = new AudioContext();
        setAudioContext(newAudioContext);
        
        const newAnalyser = newAudioContext.createAnalyser();
        newAnalyser.fftSize = 256;
        setAnalyser(newAnalyser);
      }
    }
    
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [mediaRef.current, audioContext]);

  // Connect media element to audio context when both exist
  useEffect(() => {
    if (mediaRef.current && audioContext && analyser) {
      if (audioSourceRef.current) {
        audioSourceRef.current.disconnect();
      }
      
      audioSourceRef.current = audioContext.createMediaElementSource(mediaRef.current as HTMLMediaElement);
      audioSourceRef.current.connect(analyser);
      analyser.connect(audioContext.destination);
    }
  }, [mediaRef.current, audioContext, analyser, currentMediaIndex]);

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

  const toggleVisualizer = () => {
    setShowVisualizer(!showVisualizer);
  };

  const handleFileSelect = (files: FileList) => {
    Array.from(files).forEach((file: File) => {
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const isAudio = file.type.startsWith('audio');
        const isVideo = file.type.startsWith('video');
        
        if (isAudio || isVideo) {
          const newItem: PlaylistItem = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: file.name,
            type: isAudio ? 'audio' : 'video',
            dataUrl: dataUrl,
            duration: 0, // Will be updated once media is loaded
            size: file.size
          };
          
          setMediaList(prev => {
            const newList = [...prev, newItem];
            return newList;
          });
          
          // If this is the first file, set it as current and play it
          if (currentMediaIndex === -1) {
            setCurrentMediaIndex(0);
            setTimeout(() => {
              setIsPlaying(true);
              if (mediaRef.current) {
                mediaRef.current.play().catch(console.error);
              }
            }, 100);
          }
          
          toast.success(`Added ${file.name}`);
        } else {
          toast.error(`${file.name} is not a supported media file`);
        }
      };
      
      fileReader.onerror = () => {
        toast.error(`Failed to load ${file.name}`);
      };
      
      fileReader.readAsDataURL(file);
    });
  };

  const handlePlaylistItemClick = (index: number) => {
    setCurrentMediaIndex(index);
    setCurrentTime(0);
    setIsPlaying(true);
    
    setTimeout(() => {
      if (mediaRef.current) {
        mediaRef.current.play().catch(console.error);
      }
    }, 100);
  };

  const handleRemoveItem = (id: string) => {
    const indexToRemove = mediaList.findIndex(item => item.id === id);
    if (indexToRemove === -1) return;
    
    const newList = mediaList.filter(item => item.id !== id);
    setMediaList(newList);
    
    if (newList.length === 0) {
      setCurrentMediaIndex(-1);
      setIsPlaying(false);
    } else if (indexToRemove === currentMediaIndex) {
      // If we're removing the current item, play the next one or the previous if there's no next
      const newIndex = Math.min(indexToRemove, newList.length - 1);
      setCurrentMediaIndex(newIndex);
      setCurrentTime(0);
      setTimeout(() => {
        if (mediaRef.current) {
          mediaRef.current.play().catch(console.error);
        }
      }, 100);
    } else if (indexToRemove < currentMediaIndex) {
      // If we're removing an item before the current, adjust the index
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };

  const currentMedia = mediaList[currentMediaIndex] || null;
  const isAudio = currentMedia?.type === 'audio';
  
  // Apply volume after media element is created
  useEffect(() => {
    if (mediaRef.current) {
      // Set volume programmatically 
      (mediaRef.current as any).volume = volume;
    }
  }, [mediaRef.current, currentMediaIndex]);
  
  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto px-4">
      <div className="text-center my-6">
        <h1 className="text-3xl font-bold text-gradient">
          Ultimate Media Player
        </h1>
        <p className="text-muted-foreground mt-2">
          Play your local audio and video files with style
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div 
          className={cn(
            "lg:col-span-2 flex flex-col bg-black/20 rounded-xl p-4",
            isFullscreen && "fixed inset-0 z-50 bg-black"
          )} 
          ref={mediaContainerRef}
        >
          <div className="relative w-full flex-grow rounded-lg overflow-hidden bg-black/40 flex items-center justify-center">
            {currentMediaIndex >= 0 ? (
              isAudio ? (
                <>
                  {showVisualizer && analyser && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Visualizer analyser={analyser} />
                    </div>
                  )}
                  <audio
                    ref={mediaRef as React.RefObject<HTMLAudioElement>}
                    src={currentMedia?.dataUrl}
                    className="hidden"
                    loop={isLooping}
                    muted={isMuted}
                    onLoadedMetadata={() => {
                      if (mediaRef.current) {
                        setDuration(mediaRef.current.duration);
                        // Set volume on metadata load
                        (mediaRef.current as any).volume = volume;
                      }
                    }}
                  />
                  <MediaInfo 
                    currentMedia={currentMedia} 
                    isPlaying={isPlaying}
                  />
                </>
              ) : (
                <video
                  ref={mediaRef as React.RefObject<HTMLVideoElement>}
                  src={currentMedia?.dataUrl}
                  className="max-h-full max-w-full object-contain"
                  loop={isLooping}
                  muted={isMuted}
                  onClick={togglePlayPause}
                  onLoadedMetadata={() => {
                    if (mediaRef.current) {
                      setDuration(mediaRef.current.duration);
                      // Set volume on metadata load
                      (mediaRef.current as any).volume = volume;
                    }
                  }}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <p className="text-lg text-muted-foreground mb-4">
                  No media selected
                </p>
                <FileUpload onFileSelect={handleFileSelect} />
              </div>
            )}
          </div>
          
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
            toggleVisualizer={toggleVisualizer}
            toggleFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
            showVisualizerToggle={isAudio}
          />
        </div>
        
        <div className="bg-black/20 rounded-xl p-4 flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Playlist</h2>
          <FileUpload onFileSelect={handleFileSelect} />
          <div className="mt-4 flex-grow overflow-hidden">
            <Playlist
              mediaList={mediaList}
              currentMediaIndex={currentMediaIndex}
              onItemClick={handlePlaylistItemClick}
              onRemoveItem={handleRemoveItem}
              isPlaying={isPlaying}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPlayer;
