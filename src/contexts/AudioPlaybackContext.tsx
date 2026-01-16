import React, { createContext, useContext, useState, useRef, useMemo, useCallback, ReactNode } from 'react';
import { ScriptTimingMap } from '../../types';

/**
 * Data for a meditation that hasn't been saved yet.
 * Stored in context so PlayerPage can save it when user confirms.
 */
export interface PendingMeditation {
  prompt: string;
  script: string;
  voiceId: string;
  voiceName: string;
  backgroundTrackId?: string;
  backgroundTrackName?: string;
  natureSoundId?: string;
  natureSoundName?: string;
  durationSeconds: number;
  audioTags?: string[];
  base64Audio: string;
}

/**
 * AudioPlaybackContext - Separated from AppContext for performance
 *
 * Audio playback state updates at 60fps during playback (currentTime, currentWordIndex).
 * By isolating this in its own context, we prevent cascading re-renders across the entire
 * app when these high-frequency updates occur.
 *
 * Components that only need voice/script state won't re-render during playback.
 */

interface AudioPlaybackContextType {
  // Playback state
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  currentWordIndex: number;
  setCurrentWordIndex: (index: number) => void;
  timingMap: ScriptTimingMap | null;
  setTimingMap: (map: ScriptTimingMap | null) => void;

  // Audio refs - grouped here since they're used with playback
  // Using MutableRefObject to allow assignment from multiple components
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  audioSourceRef: React.MutableRefObject<AudioBufferSourceNode | null>;
  audioBufferRef: React.MutableRefObject<AudioBuffer | null>;
  gainNodeRef: React.MutableRefObject<GainNode | null>;
  backgroundAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  natureSoundAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  // iOS volume fix: GainNodes for background/nature sounds (HTMLAudioElement.volume is read-only on iOS)
  backgroundGainNodeRef: React.MutableRefObject<GainNode | null>;
  natureSoundGainNodeRef: React.MutableRefObject<GainNode | null>;

  // Audio settings
  backgroundVolume: number;
  setBackgroundVolume: (volume: number) => void;
  voiceVolume: number;
  setVoiceVolume: (volume: number) => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;

  // Pending meditation (for save-on-exit flow)
  pendingMeditation: PendingMeditation | null;
  setPendingMeditation: (data: PendingMeditation | null) => void;
  clearPendingMeditation: () => void;
}

const AudioPlaybackContext = createContext<AudioPlaybackContextType | undefined>(undefined);

export const useAudioPlayback = () => {
  const context = useContext(AudioPlaybackContext);
  if (!context) {
    throw new Error('useAudioPlayback must be used within an AudioPlaybackProvider');
  }
  return context;
};

// Selector hooks for granular subscriptions - prevents unnecessary re-renders
export const useIsPlaying = () => {
  const { isPlaying, setIsPlaying } = useAudioPlayback();
  return { isPlaying, setIsPlaying };
};

export const usePlaybackTime = () => {
  const { currentTime, setCurrentTime, duration, setDuration } = useAudioPlayback();
  return { currentTime, setCurrentTime, duration, setDuration };
};

export const usePlaybackRate = () => {
  const { playbackRate, setPlaybackRate } = useAudioPlayback();
  return { playbackRate, setPlaybackRate };
};

interface AudioPlaybackProviderProps {
  children: ReactNode;
}

export const AudioPlaybackProvider: React.FC<AudioPlaybackProviderProps> = ({ children }) => {
  // Playback state - high frequency updates during playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [timingMap, setTimingMap] = useState<ScriptTimingMap | null>(null);

  // Audio settings - less frequent updates
  const [backgroundVolume, setBackgroundVolume] = useState(0.3);
  const [voiceVolume, setVoiceVolume] = useState(0.7);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Pending meditation - for save-on-exit flow
  const [pendingMeditation, setPendingMeditation] = useState<PendingMeditation | null>(null);
  const clearPendingMeditation = useCallback(() => setPendingMeditation(null), []);

  // Audio refs - stable references, never change identity
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const natureSoundAudioRef = useRef<HTMLAudioElement | null>(null);
  // iOS volume fix: GainNodes for background/nature sounds
  const backgroundGainNodeRef = useRef<GainNode | null>(null);
  const natureSoundGainNodeRef = useRef<GainNode | null>(null);

  // Memoize context value - only changes when state actually changes
  const value = useMemo<AudioPlaybackContextType>(() => ({
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    currentWordIndex,
    setCurrentWordIndex,
    timingMap,
    setTimingMap,
    audioContextRef,
    audioSourceRef,
    audioBufferRef,
    gainNodeRef,
    backgroundAudioRef,
    natureSoundAudioRef,
    backgroundGainNodeRef,
    natureSoundGainNodeRef,
    backgroundVolume,
    setBackgroundVolume,
    voiceVolume,
    setVoiceVolume,
    playbackRate,
    setPlaybackRate,
    pendingMeditation,
    setPendingMeditation,
    clearPendingMeditation,
  }), [
    isPlaying, currentTime, duration, currentWordIndex, timingMap,
    backgroundVolume, voiceVolume, playbackRate, pendingMeditation, clearPendingMeditation,
  ]);

  return (
    <AudioPlaybackContext.Provider value={value}>
      {children}
    </AudioPlaybackContext.Provider>
  );
};

export default AudioPlaybackProvider;
