
export enum View {
  HOME = 'home',
  WRITER = 'writer',
  STUDIO = 'studio',
  MIXER = 'mixer',
  PLAYER = 'player',
  CLONE = 'clone'
}

export interface SoundLayer {
  id: string;
  name: string;
  type: 'base' | 'texture';
  volume: number;
  url: string;
}

export interface ScriptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  provider?: string;
  voiceName: string;
  description: string;
  isCloned?: boolean;
  elevenlabsVoiceId?: string;
}

export interface BackgroundMusic {
  id: string;
  name: string;
  description: string;
  url: string;
  category: 'ambient' | 'nature' | 'binaural' | 'instrumental';
  duration: number; // in seconds, 0 for looping
}

export interface AudioTag {
  id: string;
  label: string;        // Display label like "[long pause]"
  description: string;  // Tooltip description
  category: 'pauses' | 'breathing' | 'voice' | 'sounds';
}

export interface AudioTagCategory {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  tags: AudioTag[];
}

// Text synchronization types for inline player
export interface TextSegment {
  type: 'word' | 'pause' | 'audioTag';
  content: string;
  startTime: number;
  endTime: number;
  wordIndex?: number;
  sentenceIndex: number;
}

export interface ScriptTimingMap {
  segments: TextSegment[];
  totalDuration: number;
  wordCount: number;
  sentenceCount: number;
}

export interface PlaybackProgress {
  currentTime: number;
  duration: number;
  percent: number;
  currentWordIndex: number;
  isPlaying: boolean;
}

// Voice cloning status types
export type CloningStatus =
  | { state: 'idle' }
  | { state: 'recording' }
  | { state: 'validating' }
  | { state: 'uploading_to_elevenlabs'; progress?: number }
  | { state: 'saving_to_database' }
  | { state: 'success'; voiceId: string; voiceName: string }
  | { state: 'error'; message: string; canRetry: boolean };

export interface CreditInfo {
  canClone: boolean;
  creditsRemaining: number;
  clonesRemaining: number;
  cloneCost: number;
  reason?: string;
}
