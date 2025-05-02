
import React from "react";
import { Music } from "lucide-react";
import { PlaylistItem } from "@/types/media";

interface MediaInfoProps {
  currentMedia: PlaylistItem | null;
  isPlaying: boolean;
}

const MediaInfo: React.FC<MediaInfoProps> = ({ currentMedia, isPlaying }) => {
  const displayName = currentMedia?.name || "Unknown Track";
  
  return (
    <div className="flex items-center flex-col justify-center text-center z-10 p-4">
      <div className="w-32 h-32 bg-black/40 rounded-full flex items-center justify-center mb-4 shadow-xl">
        <div className={`w-24 h-24 rounded-full bg-player-accent/20 flex items-center justify-center ${isPlaying ? 'animate-pulse-slow' : ''}`}>
          <Music size={36} className="text-player-accent" />
        </div>
      </div>
      <div className="max-w-sm animate-fade-in">
        <h2 className="text-xl font-medium truncate" title={displayName}>
          {displayName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {currentMedia?.type === "audio" ? "Audio" : "Video"} File
        </p>
      </div>
    </div>
  );
};

export default MediaInfo;
