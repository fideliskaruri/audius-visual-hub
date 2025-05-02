
export interface PlaylistItem {
  id: string;
  name: string;
  type: 'audio' | 'video';
  dataUrl: string;
  duration: number;
  size: number;
}
