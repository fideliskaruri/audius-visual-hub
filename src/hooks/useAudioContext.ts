
import { useState, useEffect, useRef } from "react";

interface UseAudioContextReturn {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  connectAudioSource: (mediaElement: HTMLMediaElement) => void;
  disconnectAudioSource: () => void;
}

export function useAudioContext(): UseAudioContextReturn {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedElementRef = useRef<HTMLMediaElement | null>(null);

  // Setup audio context and analyzer
  useEffect(() => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext && !audioContext) {
      const newAudioContext = new AudioContext();
      setAudioContext(newAudioContext);
      
      const newAnalyser = newAudioContext.createAnalyser();
      newAnalyser.fftSize = 256;
      setAnalyser(newAnalyser);
    }
    
    return () => {
      // Clean up audio context when component unmounts
      if (audioSourceRef.current) {
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  const connectAudioSource = (mediaElement: HTMLMediaElement) => {
    if (!audioContext || !analyser) return;
    
    // If we already have a connected source, disconnect it first
    disconnectAudioSource();
    
    try {
      // Only create a new source if the media element has changed
      if (mediaElement !== connectedElementRef.current) {
        audioSourceRef.current = audioContext.createMediaElementSource(mediaElement);
        connectedElementRef.current = mediaElement;
      }
      
      if (audioSourceRef.current) {
        audioSourceRef.current.connect(analyser);
        analyser.connect(audioContext.destination);
      }
    } catch (error) {
      console.error("Error connecting audio source:", error);
    }
  };

  const disconnectAudioSource = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect();
    }
  };

  return {
    audioContext,
    analyser,
    connectAudioSource,
    disconnectAudioSource
  };
}
