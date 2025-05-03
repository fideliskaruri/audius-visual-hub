import { useState, useEffect, useCallback } from 'react';
import { PlaylistItem } from '@/types/media';
import {
  savePlaylistItem,
  getAllPlaylistItems,
  deletePlaylistItem,
  // clearPlaylistItems // Optional: Add a button/action to clear DB
} from '@/lib/db'; // Import DB functions

const LOCAL_STORAGE_KEY_INDEX = 'audius_visual_hub_current_index';
// We no longer store the list itself in localStorage, only the index and metadata order

export function usePlaylistStorage() {
  const [mediaList, setMediaList] = useState<PlaylistItem[]>([]);
  const [currentMediaIndex, setCurrentMediaIndexState] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Add loading state

  // --- Load Initial Playlist from IndexedDB ---
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getAllPlaylistItems()
      .then(storedItems => {
        if (!isMounted) return;

        if (storedItems && storedItems.length > 0) {
          console.log("Loading playlist from IndexedDB...");
          const loadedList: PlaylistItem[] = storedItems.map(({ id, file }) => ({
            id: id,
            name: file.name,
            url: URL.createObjectURL(file), // Create Blob URL for this session
            type: file.type.startsWith('video/') ? 'video' : 'audio',
            file: file, // Keep the file object reference if needed elsewhere
          }));
          setMediaList(loadedList);

          // Load last playing index from localStorage
          const savedIndex = localStorage.getItem(LOCAL_STORAGE_KEY_INDEX);
          const initialIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
          // Ensure index is valid for the loaded list
          setCurrentMediaIndexState(
            (initialIndex >= 0 && initialIndex < loadedList.length) ? initialIndex : (loadedList.length > 0 ? 0 : -1)
          );
          console.log("Playlist loaded, initial index:", initialIndex);

        } else {
          console.log("No playlist found in IndexedDB.");
          setCurrentMediaIndexState(-1); // Ensure index is -1 if list is empty
        }
      })
      .catch(error => {
        console.error("Error loading playlist from IndexedDB:", error);
        // Handle error, maybe clear state?
        setMediaList([]);
        setCurrentMediaIndexState(-1);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      // --- Revoke Blob URLs on Unmount ---
      // Important to prevent memory leaks when component unmounts/app closes
      console.log("Revoking Blob URLs on unmount/cleanup...");
      setMediaList(prevList => {
        prevList.forEach(item => {
          if (item.url.startsWith('blob:')) {
            URL.revokeObjectURL(item.url);
          }
        });
        return []; // Clear list state on unmount? Or keep for HMR? Decide based on needs.
      });
      // --- End Revoke ---
    };
  }, []); // Run only once on mount

  // --- Update Index Storage ---
  useEffect(() => {
    if (!isLoading && currentMediaIndex !== -1) {
      localStorage.setItem(LOCAL_STORAGE_KEY_INDEX, currentMediaIndex.toString());
    } else if (!isLoading && currentMediaIndex === -1) {
      localStorage.removeItem(LOCAL_STORAGE_KEY_INDEX);
    }
  }, [currentMediaIndex, isLoading]);


  // --- Modified Add Item ---
  const addMediaItem = useCallback(async (newItem: PlaylistItem) => {
    if (!newItem.file) {
      console.error("Cannot add item to DB without File object:", newItem);
      return;
    }
    // Save to DB first
    await savePlaylistItem(newItem.id, newItem.file);
    // Then update state (ensure URL is created if not already)
    const itemWithUrl = {
      ...newItem,
      url: newItem.url || URL.createObjectURL(newItem.file)
    };
    setMediaList(prevList => [...prevList, itemWithUrl]);
  }, []);

  // --- Modified Remove Item ---
  const removeMediaItem = useCallback(async (id: string) => {
    let removedItemUrl: string | null = null;
    let newIndex = currentMediaIndex;

    setMediaList(prevList => {
      const itemIndex = prevList.findIndex(item => item.id === id);
      if (itemIndex === -1) return prevList; // Not found

      removedItemUrl = prevList[itemIndex].url; // Get URL to revoke

      const newList = prevList.filter(item => item.id !== id);

      // Adjust current index if necessary
      if (newList.length === 0) {
        newIndex = -1;
      } else if (itemIndex === currentMediaIndex) {
        // If removing the current item, move to the next (or previous if last)
        newIndex = itemIndex % newList.length;
      } else if (itemIndex < currentMediaIndex) {
        // If removing an item before the current one, decrement index
        newIndex = currentMediaIndex - 1;
      }
      // If removing after current, index stays the same relative to remaining items

      return newList;
    });

    // Update index state separately after list state update
    setCurrentMediaIndexState(newIndex);

    // Remove from DB
    await deletePlaylistItem(id);

    // Revoke Blob URL after state update and DB deletion
    if (removedItemUrl && removedItemUrl.startsWith('blob:')) {
      console.log("Revoking Blob URL for removed item:", removedItemUrl);
      URL.revokeObjectURL(removedItemUrl);
    }
  }, [currentMediaIndex]); // Add currentMediaIndex dependency

  // --- Setter for Index (used by controls) ---
  const setCurrentMediaIndex = useCallback((index: number) => {
    // Add validation if needed
    setCurrentMediaIndexState(index);
  }, []);

  // --- Modified Set List (used by file upload) ---
  // This needs careful handling with DB persistence
  const setMediaListAndPersist = useCallback(async (newItems: PlaylistItem[]) => {
    // This assumes newItems contains File objects and valid IDs
    // 1. Determine items to add/remove from DB (diffing) - complex!
    // OR: Clear DB and re-add all (simpler but potentially slower)

    // Simple approach: Clear and re-add
    console.log("Clearing DB and re-persisting new list...");
    // await clearPlaylistItems(); // Use with caution!
    const updatedListWithUrls: PlaylistItem[] = [];

    for (const item of newItems) {
      if (!item.file) {
        console.warn("Skipping item without File object during persist:", item);
        continue;
      }
      // await savePlaylistItem(item.id, item.file); // Re-save
      const url = item.url || URL.createObjectURL(item.file); // Ensure URL
      updatedListWithUrls.push({ ...item, url });
    }

    // Revoke old URLs before setting new list
    setMediaList(prevList => {
      prevList.forEach(item => {
        if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
      });
      return updatedListWithUrls; // Set the new list
    });

    // Decide how to handle index after a full list replace
    setCurrentMediaIndexState(updatedListWithUrls.length > 0 ? 0 : -1);

  }, []);


  return {
    mediaList,
    // setMediaList, // Expose the safer 'setMediaListAndPersist' or 'add/remove' instead
    addMediaItem,
    removeMediaItem,
    currentMediaIndex,
    setCurrentMediaIndex,
    isLoading,
  };
}
