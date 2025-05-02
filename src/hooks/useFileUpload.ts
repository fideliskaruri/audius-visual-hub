
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
