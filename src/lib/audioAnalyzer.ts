/**
 * Audio Analyzer Module
 *
 * Provides real-time audio level analysis for voice cloning UI.
 * Uses Web Audio API AnalyserNode to get frequency data and volume levels.
 *
 * ElevenLabs IVC optimal levels:
 * - RMS: -23 to -18 dB
 * - Peak: below -3 dB
 */

// Debug logging - only enabled in development
const DEBUG = import.meta.env?.DEV ?? false;

// ============================================================================
// Types
// ============================================================================

export interface AudioAnalyzerConfig {
  /** FFT size for frequency analysis (default: 256) */
  fftSize?: number;
  /** Smoothing time constant 0-1 (default: 0.8) */
  smoothingTimeConstant?: number;
  /** Minimum decibels for analyser (default: -90) */
  minDecibels?: number;
  /** Maximum decibels for analyser (default: -10) */
  maxDecibels?: number;
}

export interface AudioLevelData {
  /** RMS level 0-1 normalized */
  rms: number;
  /** Peak level 0-1 normalized */
  peak: number;
  /** RMS in decibels */
  rmsDb: number;
  /** Peak in decibels */
  peakDb: number;
  /** Frequency bin data for visualizer (0-255 per bin) */
  frequencyBins: Uint8Array;
  /** True if peak > -3dB (clipping zone) */
  isClipping: boolean;
  /** True if RMS < -30dB (too quiet) */
  isTooQuiet: boolean;
  /** True if RMS between -23 and -18 dB (ElevenLabs optimal) */
  isOptimal: boolean;
  /** True if RMS between -30 and -23 dB (acceptable but could be louder) */
  isGood: boolean;
}

export interface AudioAnalyzerCallbacks {
  /** Called every animation frame with level data */
  onLevelUpdate?: (data: AudioLevelData) => void;
  /** Called when audio is clipping (peak > -3dB) */
  onClipping?: () => void;
  /** Called when audio is too quiet (RMS < -30dB) for extended period */
  onSilence?: () => void;
}

// ============================================================================
// Constants - ElevenLabs IVC Thresholds
// ============================================================================

/** Optimal RMS range for ElevenLabs IVC: -18 to -23 dB */
const OPTIMAL_RMS_MIN_DB = -23;
const OPTIMAL_RMS_MAX_DB = -18;

/** Peak limit for ElevenLabs: -3 dB */
const PEAK_LIMIT_DB = -3;

/** Below this is considered too quiet */
const TOO_QUIET_DB = -30;

/** Silence threshold (essentially no audio) */
const SILENCE_DB = -60;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert linear amplitude (0-1) to decibels
 * @param linear - Linear amplitude value (0-1)
 * @returns Decibel value (negative, -Infinity for 0)
 */
export function linearToDb(linear: number): number {
  if (linear <= 0) return -100; // Avoid -Infinity
  return 20 * Math.log10(linear);
}

/**
 * Convert decibels to linear amplitude
 * @param db - Decibel value
 * @returns Linear amplitude (0-1)
 */
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Calculate RMS (Root Mean Square) of audio samples
 * @param samples - Float32Array of audio samples
 * @returns RMS value (0-1)
 */
export function calculateRMS(samples: Float32Array): number {
  if (samples.length === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}

/**
 * Calculate peak amplitude of audio samples
 * @param samples - Float32Array of audio samples
 * @returns Peak value (0-1)
 */
export function calculatePeak(samples: Float32Array): number {
  if (samples.length === 0) return 0;

  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  return peak;
}

// ============================================================================
// Audio Analyzer Class
// ============================================================================

export class AudioAnalyzer {
  private config: Required<AudioAnalyzerConfig>;
  private callbacks: AudioAnalyzerCallbacks = {};

  // Web Audio API nodes
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  // State
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private isActive = false;

  // Pre-allocated buffers to avoid GC pressure
  private frequencyData: Uint8Array | null = null;
  private timeDomainData: Float32Array | null = null;

  // Silence tracking
  private silenceFrames = 0;
  private readonly SILENCE_FRAMES_THRESHOLD = 60; // ~1 second at 60fps

  constructor(config: AudioAnalyzerConfig = {}) {
    this.config = {
      fftSize: config.fftSize ?? 256,
      smoothingTimeConstant: config.smoothingTimeConstant ?? 0.8,
      minDecibels: config.minDecibels ?? -90,
      maxDecibels: config.maxDecibels ?? -10,
    };

    if (DEBUG) console.log('[AudioAnalyzer] Initialized with config:', this.config);
  }

  /**
   * Start analyzing audio from a media stream
   * @param stream - MediaStream from getUserMedia
   * @param callbacks - Callback functions for level updates
   */
  async start(stream: MediaStream, callbacks: AudioAnalyzerCallbacks = {}): Promise<void> {
    if (this.isActive) {
      if (DEBUG) console.log('[AudioAnalyzer] Already active, stopping first');
      this.stop();
    }

    this.callbacks = callbacks;
    this.mediaStream = stream;

    try {
      // Create audio context
      const AudioContextClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.audioContext = new AudioContextClass();

      // Create analyser node with config
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.config.fftSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
      this.analyserNode.minDecibels = this.config.minDecibels;
      this.analyserNode.maxDecibels = this.config.maxDecibels;

      // Create source from stream
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyserNode);

      // Pre-allocate buffers
      this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.timeDomainData = new Float32Array(this.analyserNode.fftSize);

      // Reset state
      this.silenceFrames = 0;
      this.isActive = true;

      // Start analysis loop
      this.startAnalysisLoop();

      if (DEBUG) console.log('[AudioAnalyzer] Started analyzing');
    } catch (error) {
      console.error('[AudioAnalyzer] Failed to start:', error);
      this.stop();
      throw error;
    }
  }

  /**
   * Stop audio analysis and cleanup
   */
  stop(): void {
    if (DEBUG) console.log('[AudioAnalyzer] Stopping...');

    // Cancel animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Disconnect nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Clear buffers
    this.frequencyData = null;
    this.timeDomainData = null;

    // Reset state
    this.mediaStream = null;
    this.isActive = false;
    this.callbacks = {};
  }

  /**
   * Check if analyzer is currently active
   */
  isAnalyzing(): boolean {
    return this.isActive;
  }

  /**
   * Get current audio level data synchronously
   * Useful for one-off readings outside the callback loop
   */
  getCurrentLevel(): AudioLevelData | null {
    if (!this.isActive || !this.analyserNode || !this.frequencyData || !this.timeDomainData) {
      return null;
    }

    return this.computeLevelData();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private startAnalysisLoop(): void {
    const analyze = () => {
      if (!this.isActive) return;

      const levelData = this.computeLevelData();
      if (levelData) {
        // Call level update callback
        this.callbacks.onLevelUpdate?.(levelData);

        // Check for clipping
        if (levelData.isClipping) {
          this.callbacks.onClipping?.();
        }

        // Track silence
        if (levelData.rmsDb < SILENCE_DB) {
          this.silenceFrames++;
          if (this.silenceFrames === this.SILENCE_FRAMES_THRESHOLD) {
            this.callbacks.onSilence?.();
          }
        } else {
          this.silenceFrames = 0;
        }
      }

      // Continue loop
      this.animationFrameId = requestAnimationFrame(analyze);
    };

    this.animationFrameId = requestAnimationFrame(analyze);
  }

  private computeLevelData(): AudioLevelData | null {
    if (!this.analyserNode || !this.frequencyData || !this.timeDomainData) {
      return null;
    }

    // Get frequency data for visualizer
    this.analyserNode.getByteFrequencyData(this.frequencyData);

    // Get time domain data for RMS/peak calculation
    this.analyserNode.getFloatTimeDomainData(this.timeDomainData);

    // Calculate levels
    const rms = calculateRMS(this.timeDomainData);
    const peak = calculatePeak(this.timeDomainData);
    const rmsDb = linearToDb(rms);
    const peakDb = linearToDb(peak);

    // Determine level zones
    const isClipping = peakDb >= PEAK_LIMIT_DB;
    const isTooQuiet = rmsDb < TOO_QUIET_DB;
    const isOptimal = rmsDb >= OPTIMAL_RMS_MIN_DB && rmsDb <= OPTIMAL_RMS_MAX_DB;
    const isGood = rmsDb >= TOO_QUIET_DB && rmsDb < OPTIMAL_RMS_MIN_DB;

    return {
      rms,
      peak,
      rmsDb,
      peakDb,
      frequencyBins: this.frequencyData,
      isClipping,
      isTooQuiet,
      isOptimal,
      isGood,
    };
  }
}

// ============================================================================
// React Hook for Audio Analysis
// ============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseAudioAnalyzerOptions {
  /** Whether to auto-start when stream is provided */
  autoStart?: boolean;
  /** Analyzer configuration */
  config?: AudioAnalyzerConfig;
}

export interface UseAudioAnalyzerReturn {
  /** Current audio level data (null if not active) */
  levelData: AudioLevelData | null;
  /** Whether analyzer is currently active */
  isAnalyzing: boolean;
  /** Start analyzing a media stream */
  start: (stream: MediaStream) => Promise<void>;
  /** Stop analyzing */
  stop: () => void;
}

/**
 * React hook for real-time audio level analysis
 */
export function useAudioAnalyzer(options: UseAudioAnalyzerOptions = {}): UseAudioAnalyzerReturn {
  const [levelData, setLevelData] = useState<AudioLevelData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  // Create analyzer instance on mount
  useEffect(() => {
    analyzerRef.current = new AudioAnalyzer(options.config);

    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.stop();
        analyzerRef.current = null;
      }
    };
  }, []);

  const start = useCallback(async (stream: MediaStream) => {
    if (!analyzerRef.current) {
      analyzerRef.current = new AudioAnalyzer(options.config);
    }

    await analyzerRef.current.start(stream, {
      onLevelUpdate: setLevelData,
    });

    setIsAnalyzing(true);
  }, [options.config]);

  const stop = useCallback(() => {
    if (analyzerRef.current) {
      analyzerRef.current.stop();
    }
    setLevelData(null);
    setIsAnalyzing(false);
  }, []);

  return {
    levelData,
    isAnalyzing,
    start,
    stop,
  };
}

// ============================================================================
// Level Zone Helpers
// ============================================================================

export type LevelZone = 'clipping' | 'optimal' | 'good' | 'quiet' | 'silent';

/**
 * Get the current level zone based on audio levels
 */
export function getLevelZone(levelData: AudioLevelData | null): LevelZone {
  if (!levelData) return 'silent';

  if (levelData.isClipping) return 'clipping';
  if (levelData.isOptimal) return 'optimal';
  if (levelData.isGood) return 'good';
  if (levelData.isTooQuiet) return 'quiet';

  return 'silent';
}

/**
 * Get display info for a level zone
 */
export function getLevelZoneInfo(zone: LevelZone): {
  label: string;
  color: string;
  bgColor: string;
  description: string;
} {
  switch (zone) {
    case 'clipping':
      return {
        label: 'Too Loud',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500',
        description: 'Move back from the microphone',
      };
    case 'optimal':
      return {
        label: 'Perfect',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500',
        description: 'Audio level is ideal for voice cloning',
      };
    case 'good':
      return {
        label: 'Good',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500',
        description: 'Try speaking a bit louder for best results',
      };
    case 'quiet':
      return {
        label: 'Quiet',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500',
        description: 'Speak louder or move closer to the mic',
      };
    case 'silent':
    default:
      return {
        label: 'No Audio',
        color: 'text-slate-400',
        bgColor: 'bg-slate-500',
        description: 'Check your microphone connection',
      };
  }
}
