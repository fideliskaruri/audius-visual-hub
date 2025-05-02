
import { toast } from "sonner";
import { PlaylistItem } from "@/types/media";

interface UseFileUploadProps {
  mediaList: PlaylistItem[];
  setMediaList: React.Dispatch<React.SetStateAction<PlaylistItem[]>>;
  currentMediaIndex: number;
  setCurrentMediaIndex: React.Dispatch<React.SetStateAction<number>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  mediaRef: React.RefObject<HTMLAudioElement | HTMLVideoElement>;
}

export function useFileUpload({
  mediaList,
  setMediaList,
  currentMediaIndex,
  setCurrentMediaIndex,
  setIsPlaying,
  mediaRef
}: UseFileUploadProps) {
  const handleFileSelect = (files: FileList) => {
    Array.from(files).forEach((file: File) => {
      // Create an object URL instead of reading the entire file
      const objectUrl = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio');
      const isVideo = file.type.startsWith('video');
      
      if (isAudio || isVideo) {
        // Check if this file already exists in the playlist (by name and size)
        const fileExists = mediaList.some(
          item => item.name === file.name && item.size === file.size
        );
        
        if (fileExists) {
          toast.info(`${file.name} is already in your playlist`);
          return;
        }
        
        const newItem: PlaylistItem = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          type: isAudio ? 'audio' : 'video',
          dataUrl: objectUrl, // Store object URL
          filePath: objectUrl, // Keep track of the object URL separately
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
    });
  };

  const handleRemoveItem = (id: string) => {
    const indexToRemove = mediaList.findIndex(item => item.id === id);
    if (indexToRemove === -1) return;
    
    // Revoke the object URL to free up memory
    if (mediaList[indexToRemove].dataUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaList[indexToRemove].dataUrl);
    }
    
    const newList = mediaList.filter(item => item.id !== id);
    setMediaList(newList);
    
    if (newList.length === 0) {
      setCurrentMediaIndex(-1);
      setIsPlaying(false);
    } else if (indexToRemove === currentMediaIndex) {
      // If we're removing the current item, play the next one or the previous if there's no next
      const newIndex = Math.min(indexToRemove, newList.length - 1);
      setCurrentMediaIndex(newIndex);
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

  const handlePlaylistItemClick = (index: number) => {
    setCurrentMediaIndex(index);
    setIsPlaying(true);
    
    setTimeout(() => {
      if (mediaRef.current) {
        mediaRef.current.play().catch(console.error);
      }
    }, 100);
  };

  return {
    handleFileSelect,
    handleRemoveItem,
    handlePlaylistItemClick
  };
}
