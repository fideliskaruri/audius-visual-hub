import { toast } from "sonner";
import { PlaylistItem } from "@/types/media";
import { useCallback } from "react";

interface UseFileUploadProps {
  addMediaItem: (item: PlaylistItem) => Promise<void>;
  currentMediaIndex: number;
  setCurrentMediaIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  mediaListLength: number;
}

export function useFileUpload({
  addMediaItem,
  currentMediaIndex,
  setCurrentMediaIndex,
  setIsPlaying,
  mediaListLength
}: UseFileUploadProps) {

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      const unsupportedFiles: string[] = [];
      let addedCount = 0;

      for (const file of Array.from(files)) {
        const fileType = file.type.startsWith("video/") ? "video" :
          file.type.startsWith("audio/") ? "audio" : null;
        const fileExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';

        let isPotentiallyPlayable = false;
        if (fileExt === 'mkv' && fileType === 'video') {
          console.warn(`Attempting to load MKV file (${file.name}). Playback depends on browser's internal codec support.`);
          isPotentiallyPlayable = true;
        } else if (fileType) {
          const testEl = fileType === 'video' ? document.createElement('video') : document.createElement('audio');
          if (testEl.canPlayType(file.type)) {
            isPotentiallyPlayable = true;
          } else {
            unsupportedFiles.push(`${file.name} (codec/container: ${file.type || 'unknown'})`);
          }
        } else {
          unsupportedFiles.push(`${file.name} (unknown format)`);
        }

        if (isPotentiallyPlayable) {
          const newItem: PlaylistItem = {
            id: crypto.randomUUID(),
            name: file.name,
            url: '',
            type: fileType || 'video',
            file: file
          };
          await addMediaItem(newItem);
          addedCount++;
        }
      }

      if (unsupportedFiles.length > 0) {
        toast.warning(`Unsupported file(s): ${unsupportedFiles.join(", ")}`);
      }

      if (addedCount > 0) {
        if (currentMediaIndex === -1 && mediaListLength === 0) {
          setCurrentMediaIndex(0);
          setIsPlaying(false);
        }
      }
    },
    [addMediaItem, currentMediaIndex, setCurrentMediaIndex, setIsPlaying, mediaListLength]
  );

  return {
    handleFileSelect,
  };
}
