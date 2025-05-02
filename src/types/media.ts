
export interface PlaylistItem {
  id: string;
  name: string;
  type: 'audio' | 'video';
  dataUrl: string;
  filePath?: string; // Added for storing path or object URL
  duration: number;
  size: number;
}
