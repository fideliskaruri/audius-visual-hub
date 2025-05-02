
import React from "react";
import { PlaylistItem } from "@/types/media";
import MediaInfo from "./MediaInfo";
import Visualizer from "./Visualizer";

interface PlayerContentProps {
  currentMediaIndex: number;
  currentMedia: PlaylistItem | null;
  mediaRef: React.RefObject<HTMLAudioElement | HTMLVideoElement>;
  isPlaying: boolean;
  showVisualizer: boolean;
  analyser: AnalyserNode | null;
  isLooping: boolean;
  isMuted: boolean;
  volume: number;
  togglePlayPause: () => void;
  connectAudioSource: (mediaElement: HTMLMediaElement) => void;
  onFileSelect: (files: FileList) => void;
}

const PlayerContent: React.FC<PlayerContentProps> = ({
  currentMediaIndex,
  currentMedia,
  mediaRef,
  isPlaying,
  showVisualizer,
  analyser,
  isLooping,
  isMuted,
  volume,
  togglePlayPause,
  connectAudioSource,
  onFileSelect
}) => {
  const isAudio = currentMedia?.type === 'audio';
  
  // If no media is selected
  if (currentMediaIndex < 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4">
        <p className="text-lg text-muted-foreground mb-4">
          No media selected
        </p>
        <FileUpload onFileSelect={onFileSelect} />
      </div>
    );
  }

  // For audio files
  if (isAudio) {
    return (
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
              (mediaRef.current as any).volume = volume;
              // Connect the audio element to the audio context
              connectAudioSource(mediaRef.current);
            }
          }}
        />
        <MediaInfo 
          currentMedia={currentMedia} 
          isPlaying={isPlaying}
        />
      </>
    );
  }

  // For video files
  return (
    <video
      ref={mediaRef as React.RefObject<HTMLVideoElement>}
      src={currentMedia?.dataUrl}
      className="max-h-full max-w-full object-contain"
      loop={isLooping}
      muted={isMuted}
      onClick={togglePlayPause}
      onLoadedMetadata={() => {
        if (mediaRef.current) {
          (mediaRef.current as any).volume = volume;
          // Connect the video element to the audio context for visualization
          connectAudioSource(mediaRef.current);
        }
      }}
    />
  );
};

export default PlayerContent;

// Import FileUpload to avoid circular dependencies
import FileUpload from "./FileUpload";
