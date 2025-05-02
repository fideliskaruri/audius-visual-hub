import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PlaylistItem } from "@/types/media";

interface UsePlaylistStorageReturn {
  mediaList: PlaylistItem[];
  currentMediaIndex: number;
  setMediaList: React.Dispatch<React.SetStateAction<PlaylistItem[]>>;
  setCurrentMediaIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function usePlaylistStorage(): UsePlaylistStorageReturn {
  const [mediaList, setMediaList] = useState<PlaylistItem[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(-1);

  // Load playlist metadata from localStorage on initial render
  useEffect(() => {
    try {
      const savedPlaylistMeta = localStorage.getItem('mediaPlaylistMeta');
      if (savedPlaylistMeta) {
        const parsedMeta = JSON.parse(savedPlaylistMeta);
        // We'll only save metadata, not the actual file data
        if (Array.isArray(parsedMeta) && parsedMeta.length > 0) {
          setMediaList(parsedMeta);
          
          const lastIndex = parseInt(localStorage.getItem('currentMediaIndex') || '-1');
          if (lastIndex >= 0 && lastIndex < parsedMeta.length) {
            setCurrentMediaIndex(lastIndex);
          }
        }
      }
    } catch (error) {
      console.error("Error loading playlist from localStorage:", error);
      toast.error("Couldn't load your saved playlist");
    }
  }, []);

  // Save only playlist metadata to localStorage (not the actual file data)
  useEffect(() => {
    try {
      // Extract only the metadata (excluding the large dataUrl)
      const metadataList = mediaList.map(({ id, name, type, duration, size, filePath }) => ({
        id, name, type, duration, size, filePath,
        // We'll keep the filePath instead of dataUrl
        dataUrl: ''
      }));
      
      localStorage.setItem('mediaPlaylistMeta', JSON.stringify(metadataList));
    } catch (error) {
      console.error("Error saving playlist metadata to localStorage:", error);
      toast.error("Couldn't save your playlist metadata");
    }
  }, [mediaList]);

  // Save current media index to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentMediaIndex', currentMediaIndex.toString());
  }, [currentMediaIndex]);

  return {
    mediaList,
    currentMediaIndex,
    setMediaList,
    setCurrentMediaIndex
  };
}
