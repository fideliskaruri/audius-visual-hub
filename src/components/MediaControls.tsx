
import React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  AudioWaveform,
  Maximize,
  Minimize
} from "lucide-react";
import { formatTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface MediaControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  isShuffling: boolean;
  isFullscreen: boolean;
  showVisualizerToggle: boolean;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  handleNextTrack: () => void;
  handlePreviousTrack: () => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  toggleVisualizer: () => void;
  toggleFullscreen: () => void;
}

const MediaControls: React.FC<MediaControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isLooping,
  isShuffling,
  isFullscreen,
  showVisualizerToggle,
  togglePlayPause,
  seekTo,
  setVolume,
  toggleMute,
  handleNextTrack,
  handlePreviousTrack,
  toggleLoop,
  toggleShuffle,
  toggleVisualizer,
  toggleFullscreen
}) => {
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    seekTo(value);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
  };

  return (
    <div className={cn(
      "mt-4 bg-black/30 backdrop-blur-sm rounded-lg p-4",
      isFullscreen && "absolute bottom-0 left-0 right-0 bg-black/60 mt-0 rounded-none"
    )}>
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-player-muted rounded-full outline-none media-slider"
          style={{
            background: `linear-gradient(to right, #9b87f5 ${
              (currentTime / (duration || 1)) * 100
            }%, #45475A ${(currentTime / (duration || 1)) * 100}%)`,
          }}
        />
        <span className="text-xs text-muted-foreground w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleShuffle}
            className={cn(
              "p-2 rounded-full hover:bg-white/5",
              isShuffling ? "text-player-accent" : "text-muted-foreground"
            )}
            title="Shuffle"
          >
            <Shuffle size={18} />
          </button>
          <button
            onClick={handlePreviousTrack}
            className="p-2 rounded-full hover:bg-white/5"
            title="Previous track"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={togglePlayPause}
            className="p-3 bg-player-accent rounded-full hover:bg-accent/80 transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} fill="white" />}
          </button>
          <button
            onClick={handleNextTrack}
            className="p-2 rounded-full hover:bg-white/5"
            title="Next track"
          >
            <SkipForward size={18} />
          </button>
          <button
            onClick={toggleLoop}
            className={cn(
              "p-2 rounded-full hover:bg-white/5",
              isLooping ? "text-player-accent" : "text-muted-foreground"
            )}
            title="Loop current track"
          >
            <Repeat size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {showVisualizerToggle && (
            <button
              onClick={toggleVisualizer}
              className="p-2 rounded-full hover:bg-white/5 hidden sm:block"
              title="Toggle visualizer"
            >
              <AudioWaveform size={18} />
            </button>
          )}
          <button
            onClick={toggleMute}
            className="p-2 rounded-full hover:bg-white/5"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="relative w-20 hidden sm:block">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1 bg-player-muted rounded-full outline-none media-slider"
              style={{
                background: `linear-gradient(to right, #9b87f5 ${
                  isMuted ? 0 : volume * 100
                }%, #45475A ${isMuted ? 0 : volume * 100}%)`,
              }}
            />
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full hover:bg-white/5 ml-2"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaControls;
