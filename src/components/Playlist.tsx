
import React from "react";
import { PlaylistItem } from "@/types/media";
import { formatTime, formatFileSize } from "@/lib/formatters";
import { Play, Music, VideoIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaylistProps {
  mediaList: PlaylistItem[];
  currentMediaIndex: number;
  isPlaying: boolean;
  onItemClick: (index: number) => void;
  onRemoveItem: (id: string) => void;
}

const Playlist: React.FC<PlaylistProps> = ({
  mediaList,
  currentMediaIndex,
  isPlaying,
  onItemClick,
  onRemoveItem,
}) => {
  if (mediaList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center">
        <p className="text-muted-foreground">Your playlist is empty</p>
        <p className="text-sm text-muted-foreground mt-2">
          Add some media files to get started
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full no-scrollbar pr-1">
      <ul className="space-y-2">
        {mediaList.map((item, index) => (
          <li
            key={item.id}
            className={cn(
              "relative group flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer",
              index === currentMediaIndex
                ? "bg-player-accent/20"
                : "hover:bg-black/20"
            )}
            onClick={() => onItemClick(index)}
          >
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-black/20">
              {index === currentMediaIndex && isPlaying ? (
                <div className="flex items-center space-x-0.5">
                  <div className="w-1 h-3 bg-player-accent animate-wave" style={{animationDelay: '0ms'}}></div>
                  <div className="w-1 h-4 bg-player-accent animate-wave" style={{animationDelay: '200ms'}}></div>
                  <div className="w-1 h-3 bg-player-accent animate-wave" style={{animationDelay: '400ms'}}></div>
                </div>
              ) : index === currentMediaIndex ? (
                <Play size={16} className="text-player-accent" />
              ) : item.type === "audio" ? (
                <Music size={16} />
              ) : (
                <VideoIcon size={16} />
              )}
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-sm truncate" title={item.name}>
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.type} • {formatFileSize(item.size)}
              </p>
            </div>
            <button
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveItem(item.id);
              }}
              title="Remove from playlist"
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Playlist;
