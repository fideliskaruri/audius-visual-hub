export interface PlaylistItem {
  id: string;
  name: string;
  url: string;  // Make sure this is named consistently
  type: 'audio' | 'video';
  file?: File;  // Optional file reference
}
