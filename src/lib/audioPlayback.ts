/**
 * Audio Playback Module
 *
 * Handles real-time audio playback from Gemini Live API responses.
 * Plays PCM16 audio at 24kHz (Gemini output format) with smooth buffering.
 *
 * Features:
 * - Audio queue for smooth playback
 * - Barge-in support (interruption handling)
 * - Volume control
 * - Playback state tracking
 */

// Debug logging - only enabled in development
const DEBUG = import.meta.env?.DEV ?? false;

// ============================================================================
// Types
// ============================================================================

export interface AudioPlaybackCallbacks {
  onStateChange?: (state: AudioPlaybackState) => void;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: Error) => void;
}

export type AudioPlaybackState = 'idle' | 'buffering' | 'playing' | 'paused' | 'error';

export interface AudioPlaybackConfig {
  /** Input sample rate (default: 24000 for Gemini output) */
  sampleRate?: number;
  /** Buffer size in milliseconds (default: 100) */
  bufferMs?: number;
  /** Initial volume 0-1 (default: 1) */
  volume?: number;
}

// ============================================================================
// Audio Playback Class
// ============================================================================

export class AudioPlayback {
  private state: AudioPlaybackState = 'idle';
  private callbacks: AudioPlaybackCallbacks = {};
  private config: Required<AudioPlaybackConfig>;

  // Audio context and nodes
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  // Playback queue
  private audioQueue: ArrayBuffer[] = [];
  private isProcessingQueue = false;
  private currentSourceNode: AudioBufferSourceNode | null = null;

  // State tracking
  private scheduledEndTime = 0;
  private volume = 1;

  constructor(config: AudioPlaybackConfig = {}) {
    this.config = {
      sampleRate: config.sampleRate ?? 24000,
      bufferMs: config.bufferMs ?? 100,
      volume: config.volume ?? 1,
    };

    this.volume = this.config.volume;

    if (DEBUG) console.log('[AudioPlayback] Initialized with config:', this.config);
  }

  /**
   * Get current playback state
   */
  getState(): AudioPlaybackState {
    return this.state;
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async init(): Promise<void> {
    if (this.audioContext) return;

    try {
      // Note: Safari may require webkit prefix
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass({
        sampleRate: this.config.sampleRate,
      });

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
      this.gainNode.connect(this.audioContext.destination);

      // Resume if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (DEBUG) console.log('[AudioPlayback] Audio context initialized', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state,
      });

    } catch (error) {
      if (DEBUG) console.error('[AudioPlayback] Failed to initialize:', error);
      this.setState('error');
      throw error;
    }
  }

  /**
   * Add audio data to playback queue
   * @param audioData PCM16 audio data from Gemini (24kHz, mono)
   */
  queueAudio(audioData: ArrayBuffer): void {
    if (!this.audioContext || !this.gainNode) {
      if (DEBUG) console.warn('[AudioPlayback] Not initialized');
      return;
    }

    this.audioQueue.push(audioData);

    // Start processing queue if not already
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Clear audio queue and stop current playback (for barge-in)
   */
  interrupt(): void {
    if (DEBUG) console.log('[AudioPlayback] Interrupting playback');

    // Clear queue
    this.audioQueue = [];
    this.isProcessingQueue = false;

    // Stop current source
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
      } catch {
        // Ignore error if already stopped
      }
      this.currentSourceNode = null;
    }

    this.scheduledEndTime = 0;
    this.setState('idle');
  }

  /**
   * Set playback volume
   * @param volume Volume level 0-1
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));

    if (this.gainNode) {
      // Smooth volume change
      this.gainNode.gain.setTargetAtTime(
        this.volume,
        this.audioContext!.currentTime,
        0.1
      );
    }

    if (DEBUG) console.log('[AudioPlayback] Volume set to:', this.volume);
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.state !== 'playing') return;

    if (this.audioContext?.state === 'running') {
      this.audioContext.suspend();
    }

    this.setState('paused');
    if (DEBUG) console.log('[AudioPlayback] Paused');
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (this.state !== 'paused') return;

    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.setState('playing');
    if (DEBUG) console.log('[AudioPlayback] Resumed');
  }

  /**
   * Stop and cleanup
   */
  stop(): void {
    this.interrupt();

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.setState('idle');
    if (DEBUG) console.log('[AudioPlayback] Stopped');
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this.state === 'playing';
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: AudioPlaybackCallbacks): void {
    this.callbacks = callbacks;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setState(state: AudioPlaybackState): void {
    const previousState = this.state;
    this.state = state;

    this.callbacks.onStateChange?.(state);

    // Trigger start/end callbacks
    if (state === 'playing' && previousState !== 'playing') {
      this.callbacks.onPlaybackStart?.();
    } else if (state === 'idle' && previousState === 'playing') {
      this.callbacks.onPlaybackEnd?.();
    }
  }

  private async processQueue(): Promise<void> {
    if (!this.audioContext || !this.gainNode || this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    while (this.audioQueue.length > 0) {
      const audioData = this.audioQueue.shift()!;

      try {
        await this.playAudioChunk(audioData);
      } catch (error) {
        if (DEBUG) console.error('[AudioPlayback] Error playing chunk:', error);
        this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.isProcessingQueue = false;

    // Wait for scheduled audio to finish, then set idle
    if (this.scheduledEndTime > this.audioContext.currentTime) {
      const remainingTime = (this.scheduledEndTime - this.audioContext.currentTime) * 1000;
      setTimeout(() => {
        if (this.audioQueue.length === 0 && !this.isProcessingQueue) {
          this.setState('idle');
        }
      }, remainingTime);
    } else {
      this.setState('idle');
    }
  }

  private async playAudioChunk(pcm16Data: ArrayBuffer): Promise<void> {
    if (!this.audioContext || !this.gainNode) return;

    // Convert PCM16 to Float32
    const float32Data = this.pcm16ToFloat32(new Int16Array(pcm16Data));

    // Create audio buffer
    const audioBuffer = this.audioContext.createBuffer(
      1, // channels
      float32Data.length,
      this.config.sampleRate
    );

    // Copy data to buffer
    audioBuffer.getChannelData(0).set(float32Data);

    // Create source node
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(this.gainNode);

    // Schedule playback
    const startTime = Math.max(
      this.audioContext.currentTime,
      this.scheduledEndTime
    );

    sourceNode.start(startTime);
    this.currentSourceNode = sourceNode;

    // Update scheduled end time
    this.scheduledEndTime = startTime + audioBuffer.duration;

    // Update state
    if (this.state !== 'playing') {
      this.setState('playing');
    }

    // Handle end
    sourceNode.onended = () => {
      if (this.currentSourceNode === sourceNode) {
        this.currentSourceNode = null;
      }
    };
  }

  private pcm16ToFloat32(pcm16Data: Int16Array): Float32Array {
    const float32Data = new Float32Array(pcm16Data.length);

    for (let i = 0; i < pcm16Data.length; i++) {
      // Convert from Int16 range to Float32 [-1, 1]
      float32Data[i] = pcm16Data[i] / (pcm16Data[i] < 0 ? 0x8000 : 0x7FFF);
    }

    return float32Data;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let playbackInstance: AudioPlayback | null = null;

/**
 * Get the audio playback singleton
 */
export function getAudioPlayback(config?: AudioPlaybackConfig): AudioPlayback {
  if (!playbackInstance) {
    playbackInstance = new AudioPlayback(config);
  }
  return playbackInstance;
}

/**
 * Reset the audio playback singleton (useful for testing)
 */
export function resetAudioPlayback(): void {
  if (playbackInstance) {
    playbackInstance.stop();
    playbackInstance = null;
  }
}
