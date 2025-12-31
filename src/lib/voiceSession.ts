/**
 * Voice Session Management
 *
 * Manages real-time voice conversation sessions with Gemini Live API.
 * Coordinates audio capture, playback, and WebSocket communication.
 *
 * Features:
 * - Session lifecycle management
 * - Transcript storage
 * - Barge-in (interruption) handling
 * - Reconnection support
 */

// Debug logging - only enabled in development
const DEBUG = import.meta.env?.DEV ?? false;

import {
  GeminiLiveClient,
  getGeminiLiveClient,
  fetchGeminiLiveConfig,
  type GeminiLiveConfig,
  type ConnectionState,
} from './geminiLive';

import {
  AudioCapture,
  getAudioCapture,
  type AudioCaptureState,
} from './audioCapture';

import {
  AudioPlayback,
  getAudioPlayback,
  type AudioPlaybackState,
} from './audioPlayback';

// ============================================================================
// Types
// ============================================================================

export interface VoiceSessionCallbacks {
  onStateChange?: (state: VoiceSessionState) => void;
  onTranscript?: (transcript: TranscriptEntry) => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (error: Error) => void;
}

export type VoiceSessionState =
  | 'idle'
  | 'requesting-mic'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'agent-speaking'
  | 'error'
  | 'disconnected';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export interface VoiceSessionConfig {
  /** Preferred voice name (default: Aoede) */
  voiceName?: string;
  /** Auto-start listening after connection */
  autoListen?: boolean;
}

// ============================================================================
// Voice Session Class
// ============================================================================

export class VoiceSession {
  private state: VoiceSessionState = 'idle';
  private callbacks: VoiceSessionCallbacks = {};
  private config: Required<VoiceSessionConfig>;

  // Components
  private geminiClient: GeminiLiveClient;
  private audioCapture: AudioCapture;
  private audioPlayback: AudioPlayback;

  // Session state
  private sessionId: string | null = null;
  private transcripts: TranscriptEntry[] = [];
  private isMuted = false;

  constructor(config: VoiceSessionConfig = {}) {
    this.config = {
      voiceName: config.voiceName ?? 'Aoede',
      autoListen: config.autoListen ?? true,
    };

    // Get singleton instances
    this.geminiClient = getGeminiLiveClient();
    this.audioCapture = getAudioCapture({ sampleRate: 16000 });
    this.audioPlayback = getAudioPlayback({ sampleRate: 24000 });

    if (DEBUG) console.log('[VoiceSession] Initialized');
  }

  /**
   * Get current session state
   */
  getState(): VoiceSessionState {
    return this.state;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get all transcripts from current session
   */
  getTranscripts(): TranscriptEntry[] {
    return [...this.transcripts];
  }

  /**
   * Check if microphone is muted
   */
  isMicMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Start a new voice session
   */
  async start(callbacks: VoiceSessionCallbacks = {}): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'disconnected' && this.state !== 'error') {
      if (DEBUG) console.log('[VoiceSession] Session already active');
      return;
    }

    this.callbacks = callbacks;
    this.sessionId = this.generateSessionId();
    this.transcripts = [];

    if (DEBUG) console.log('[VoiceSession] Starting session:', this.sessionId);

    try {
      // Step 1: Request microphone permission
      this.setState('requesting-mic');

      await this.audioCapture.start({
        onAudioData: this.handleAudioData.bind(this),
        onVolumeChange: this.handleVolumeChange.bind(this),
        onError: this.handleCaptureError.bind(this),
      });

      // Pause capture until connected
      this.audioCapture.pause();

      // Step 2: Initialize audio playback
      await this.audioPlayback.init();
      this.audioPlayback.setCallbacks({
        onPlaybackStart: () => this.handlePlaybackStateChange('playing'),
        onPlaybackEnd: () => this.handlePlaybackStateChange('idle'),
        onError: this.handlePlaybackError.bind(this),
      });

      // Step 3: Connect to Gemini Live
      this.setState('connecting');

      const geminiConfig = await fetchGeminiLiveConfig(this.config.voiceName);

      await this.geminiClient.connect(geminiConfig, {
        onConnected: this.handleConnected.bind(this),
        onDisconnected: this.handleDisconnected.bind(this),
        onError: this.handleGeminiError.bind(this),
        onTranscript: this.handleTranscript.bind(this),
        onAudioResponse: this.handleAudioResponse.bind(this),
        onInterrupted: this.handleInterrupted.bind(this),
        onTurnComplete: this.handleTurnComplete.bind(this),
      });

    } catch (error) {
      if (DEBUG) console.error('[VoiceSession] Failed to start:', error);
      this.setState('error');
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop the current voice session
   */
  stop(): void {
    if (DEBUG) console.log('[VoiceSession] Stopping session');

    // Stop all components
    this.audioCapture.stop();
    this.audioPlayback.stop();
    this.geminiClient.disconnect();

    this.sessionId = null;
    this.setState('idle');
  }

  /**
   * Mute/unmute microphone
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;

    if (muted) {
      this.audioCapture.pause();
    } else {
      this.audioCapture.resume();
    }

    if (DEBUG) console.log('[VoiceSession] Muted:', muted);
  }

  /**
   * Toggle microphone mute
   */
  toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Send a text message (for hybrid text + voice)
   */
  sendText(text: string): void {
    if (!this.geminiClient.isConnected()) {
      if (DEBUG) console.warn('[VoiceSession] Cannot send text: not connected');
      return;
    }

    this.geminiClient.sendText(text);

    // Add to transcripts
    this.addTranscript('user', text, true);
  }

  /**
   * Interrupt the agent (barge-in)
   */
  interrupt(): void {
    if (DEBUG) console.log('[VoiceSession] User interrupting');
    this.audioPlayback.interrupt();

    if (this.state === 'agent-speaking') {
      this.setState('listening');
    }
  }

  /**
   * Set playback volume
   */
  setVolume(volume: number): void {
    this.audioPlayback.setVolume(volume);
  }

  /**
   * Get playback volume
   */
  getVolume(): number {
    return this.audioPlayback.getVolume();
  }

  // ============================================================================
  // Private Methods - Event Handlers
  // ============================================================================

  private handleConnected(): void {
    if (DEBUG) console.log('[VoiceSession] Connected to Gemini');
    this.setState('connected');

    // Start listening if auto-listen enabled
    if (this.config.autoListen && !this.isMuted) {
      this.audioCapture.resume();
      this.setState('listening');
    }
  }

  private handleDisconnected(reason?: string): void {
    if (DEBUG) console.log('[VoiceSession] Disconnected:', reason);
    this.setState('disconnected');

    // Stop audio
    this.audioCapture.pause();
    this.audioPlayback.interrupt();
  }

  private handleGeminiError(error: Error): void {
    if (DEBUG) console.error('[VoiceSession] Gemini error:', error);
    this.setState('error');
    this.callbacks.onError?.(error);
  }

  private handleTranscript(text: string, isFinal: boolean, isUser: boolean): void {
    if (DEBUG) console.log('[VoiceSession] Transcript:', { text: text.substring(0, 50), isFinal, isUser });

    this.addTranscript(isUser ? 'user' : 'assistant', text, isFinal);
  }

  private handleAudioResponse(audioData: ArrayBuffer): void {
    // Queue audio for playback
    this.audioPlayback.queueAudio(audioData);

    // Update state if not already speaking
    if (this.state !== 'agent-speaking') {
      this.setState('agent-speaking');
    }
  }

  private handleInterrupted(): void {
    if (DEBUG) console.log('[VoiceSession] Agent interrupted');
    this.audioPlayback.interrupt();

    if (this.state === 'agent-speaking') {
      this.setState('listening');
    }
  }

  private handleTurnComplete(): void {
    if (DEBUG) console.log('[VoiceSession] Turn complete');

    // Wait for audio to finish playing, then switch to listening
    // The playback end callback will handle state change
  }

  private handleAudioData(audioData: ArrayBuffer): void {
    if (this.isMuted || this.state === 'agent-speaking') {
      return;
    }

    // Send audio to Gemini
    this.geminiClient.sendAudio(audioData);
  }

  private handleVolumeChange(volume: number): void {
    this.callbacks.onVolumeChange?.(volume);
  }

  private handleCaptureError(error: Error): void {
    if (DEBUG) console.error('[VoiceSession] Capture error:', error);
    this.setState('error');
    this.callbacks.onError?.(error);
  }

  private handlePlaybackError(error: Error): void {
    if (DEBUG) console.error('[VoiceSession] Playback error:', error);
    // Don't fail session for playback errors, just log
    this.callbacks.onError?.(error);
  }

  private handlePlaybackStateChange(playbackState: 'playing' | 'idle'): void {
    if (playbackState === 'idle' && this.state === 'agent-speaking') {
      // Agent finished speaking, switch to listening
      this.setState('listening');
    }
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  private setState(state: VoiceSessionState): void {
    if (this.state === state) return;

    if (DEBUG) console.log('[VoiceSession] State:', this.state, '->', state);
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `voice-${timestamp}-${random}`;
  }

  private addTranscript(role: 'user' | 'assistant', text: string, isFinal: boolean): void {
    const entry: TranscriptEntry = {
      id: `${role}-${Date.now()}`,
      role,
      text,
      timestamp: new Date(),
      isFinal,
    };

    // Update existing non-final entry or add new
    if (!isFinal) {
      const existingIndex = this.transcripts.findIndex(
        t => t.role === role && !t.isFinal
      );
      if (existingIndex >= 0) {
        this.transcripts[existingIndex] = entry;
      } else {
        this.transcripts.push(entry);
      }
    } else {
      // Replace non-final with final
      const existingIndex = this.transcripts.findIndex(
        t => t.role === role && !t.isFinal
      );
      if (existingIndex >= 0) {
        this.transcripts[existingIndex] = entry;
      } else {
        this.transcripts.push(entry);
      }
    }

    this.callbacks.onTranscript?.(entry);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let sessionInstance: VoiceSession | null = null;

/**
 * Get the voice session singleton
 */
export function getVoiceSession(config?: VoiceSessionConfig): VoiceSession {
  if (!sessionInstance) {
    sessionInstance = new VoiceSession(config);
  }
  return sessionInstance;
}

/**
 * Reset the voice session singleton (useful for testing)
 */
export function resetVoiceSession(): void {
  if (sessionInstance) {
    sessionInstance.stop();
    sessionInstance = null;
  }
}

/**
 * Check if browser supports voice sessions
 */
export function isVoiceSessionSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia !== 'undefined' &&
    typeof window !== 'undefined' &&
    (typeof window.AudioContext !== 'undefined' ||
     typeof (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext !== 'undefined') &&
    typeof WebSocket !== 'undefined'
  );
}
