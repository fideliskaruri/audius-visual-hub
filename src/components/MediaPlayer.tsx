
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import MediaControls from "./MediaControls";
import Playlist from "./Playlist";
import FileUpload from "./FileUpload";
import PlayerContent from "./PlayerContent";
import { usePlaylistStorage } from "@/hooks/usePlaylistStorage";
import { useMediaControls } from "@/hooks/useMediaControls";
import { useAudioContext } from "@/hooks/useAudioContext";
import { useFileUpload } from "@/hooks/useFileUpload";

const MediaPlayer: React.FC = () => {
  // Get playlist data and management functions
  const {
    mediaList,
    currentMediaIndex,
    setMediaList,
    setCurrentMediaIndex
  } = usePlaylistStorage();
  
  // Setup media controls
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
  
  // Get audio context and analyzer for visualizer
  const {
    audioContext,
    analyser,
    connectAudioSource,
    disconnectAudioSource
  } = useAudioContext();
  
  // Setup file upload and playlist management
  const {
    handleFileSelect,
    handleRemoveItem,
    handlePlaylistItemClick
  } = useFileUpload({
    mediaList,
    setMediaList,
    currentMediaIndex,
    setCurrentMediaIndex,
    setIsPlaying,
    mediaRef
  });
  
  // Local state
  const [showVisualizer, setShowVisualizer] = useState<boolean>(true);
  
  // Toggle visualizer
  const toggleVisualizer = () => {
    setShowVisualizer(!showVisualizer);
  };

  const currentMedia = mediaList[currentMediaIndex] || null;
  const isAudio = currentMedia?.type === 'audio';
  
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
            <PlayerContent
              currentMediaIndex={currentMediaIndex}
              currentMedia={currentMedia}
              mediaRef={mediaRef}
              isPlaying={isPlaying}
              showVisualizer={showVisualizer}
              analyser={analyser}
              isLooping={isLooping}
              isMuted={isMuted}
              volume={volume}
              togglePlayPause={togglePlayPause}
              connectAudioSource={connectAudioSource}
              onFileSelect={handleFileSelect}
            />
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
