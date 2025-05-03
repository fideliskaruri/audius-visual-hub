import React, { useEffect } from "react";
import { PlaylistItem } from "@/types/media";
import MediaInfo from "./MediaInfo";
import Visualizer from "./Visualizer";
import FileUpload from "./FileUpload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlayerContentProps {
  currentMediaIndex: number;
  currentMedia: PlaylistItem | null;
  mediaRef: React.RefObject<HTMLAudioElement | HTMLVideoElement>;
  isPlaying: boolean;
  showVisualizer: boolean;
  analyser: AnalyserNode | null;
  isLooping: boolean;
  isMuted: boolean;
  volume: number;
  connectAudioSource: (mediaElement: HTMLMediaElement) => void;
  onFileSelect: (files: FileList) => void;
  isFullscreen: boolean;
}

const PlayerContent: React.FC<PlayerContentProps> = ({
  currentMediaIndex,
  currentMedia,
  mediaRef,
  isPlaying,
  showVisualizer,
  analyser,
  isLooping,
  isMuted,
  volume,
  connectAudioSource,
  onFileSelect,
  isFullscreen
}) => {
  const isAudio = currentMedia?.type === 'audio';

  const checkMediaSupport = (file: PlaylistItem): boolean => {
    if (!file || !file.url) {
      console.error("Invalid file or missing URL", file);
      return false;
    }

    const fileExt = file.url.includes('.') ?
      file.url.split('.').pop()?.toLowerCase() : '';

    // --- Add MKV Check ---
    if (fileExt === 'mkv') {
      toast.warning(`MKV files (${file.name}) are often unsupported by browsers. Playback may fail. Consider converting to MP4.`);
      // Allow attempting playback, but warn the user.
      // Alternatively, return false here to block MKV completely:
      // return false;
    }
    // --- End MKV Check ---

    if (file.type === 'video') {
      const video = document.createElement('video');
      const canPlayMP4 = video.canPlayType('video/mp4') !== '';
      const canPlayWebM = video.canPlayType('video/webm') !== '';
      const canPlayOgg = video.canPlayType('video/ogg') !== '';

      if ((fileExt === 'mp4' && !canPlayMP4) ||
        (fileExt === 'webm' && !canPlayWebM) ||
        (fileExt === 'ogg' && !canPlayOgg)) {
        console.warn(`Browser doesn't support ${fileExt} video format`);
        return false;
      }
    }

    if (file.type === 'audio') {
      const audio = document.createElement('audio');
      const canPlayMP3 = audio.canPlayType('audio/mpeg') !== '';
      const canPlayOggAudio = audio.canPlayType('audio/ogg') !== '';
      const canPlayWAV = audio.canPlayType('audio/wav') !== '';

      if ((fileExt === 'mp3' && !canPlayMP3) ||
        (fileExt === 'ogg' && !canPlayOggAudio) ||
        (fileExt === 'wav' && !canPlayWAV)) {
        console.warn(`Browser doesn't support ${fileExt} audio format`);
        return false;
      }
    }

    return true;
  };

  useEffect(() => {
    const media = mediaRef.current;
    if (media && currentMedia && isAudio) {
      const connect = () => {
        if (mediaRef.current) {
          console.log("Connecting audio source for visualizer...");
          connectAudioSource(mediaRef.current);
        }
      };

      if (media.readyState >= 3) {
        connect();
      } else {
        media.addEventListener('canplay', connect, { once: true });
      }

      return () => {
        media.removeEventListener('canplay', connect);
      };
    }
  }, [currentMedia, isAudio, connectAudioSource, mediaRef]);

  // --- Effect to Load Media Source ---
  // NOTE: With the key prop added below, this effect becomes simpler
  // as cleanup is handled by unmounting. We only need to load the initial src.
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) {
      console.error("Media ref is null shortly after mount/key change.");
      return;
    }

    // The element is new due to the key, so src should be empty initially.
    // We just need to set it if currentMedia is valid.
    if (currentMedia && currentMedia.url) {
      if (!checkMediaSupport(currentMedia)) {
        toast.error(`Unsupported format: ${currentMedia.name}`);
        return;
      }
      console.log(`[Effect Key=${currentMedia.id}] Setting initial src: ${currentMedia.url}`);
      media.src = currentMedia.url;
      // No need to call media.load() here, setting src on a new element triggers load.
    } else {
      console.log(`[Effect Key=${currentMedia?.id ?? 'none'}] No valid media/URL on mount.`);
    }

    // Cleanup is now implicitly handled by React unmounting the element
    // when the key changes. Blob URL revocation should still happen
    // in useFileUpload/usePlaylistStorage when items are removed/app closes.

  }, [currentMedia, mediaRef]); // Depend on currentMedia and the ref

  if (currentMediaIndex < 0 || !currentMedia) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4 h-full">
        <p className="text-lg text-muted-foreground mb-4">
          No media selected
        </p>
        <FileUpload onFileSelect={(files) => files && onFileSelect(files)} />
      </div>
    );
  }

  if (isAudio) {
    return (
      <>
        {showVisualizer && analyser && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Visualizer analyser={analyser} />
          </div>
        )}
        <audio
          key={currentMedia.id} // Add key here
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          className="hidden"
          loop={isLooping}
          muted={isMuted}
          preload="metadata"
        // src is set by the useEffect now
        />
        <MediaInfo currentMedia={currentMedia} isPlaying={isPlaying} />
      </>
    );
  }

  // Render Video
  return (
    <>
      <video
        key={currentMedia.id} // Add key here
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        className={cn(
          "max-h-full max-w-full object-contain w-full h-full",
          isFullscreen && "object-contain"
        )}
        playsInline
        preload="metadata"
        loop={isLooping}
        muted={isMuted}
      // src is set by the useEffect now
      />
      {/* Optional: <MediaInfo currentMedia={currentMedia} isPlaying={isPlaying} /> */}
    </>
  );
};

export default PlayerContent;
