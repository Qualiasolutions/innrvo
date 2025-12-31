/**
 * Audio Capture Module
 *
 * Handles microphone access and audio streaming for Gemini Live API.
 * Captures audio at 16kHz, mono, PCM16 format (Gemini requirement).
 */

// Debug logging - only enabled in development
const DEBUG = import.meta.env?.DEV ?? false;

// ============================================================================
// Types
// ============================================================================

export interface AudioCaptureCallbacks {
  onAudioData?: (audioData: ArrayBuffer) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: AudioCaptureState) => void;
  onVolumeChange?: (volume: number) => void;
}

export type AudioCaptureState = 'idle' | 'requesting' | 'capturing' | 'paused' | 'error';

export interface AudioCaptureConfig {
  /** Target sample rate (default: 16000 for Gemini) */
  sampleRate?: number;
  /** Chunk size in samples (default: 4096) */
  chunkSize?: number;
  /** Enable echo cancellation (default: true) */
  echoCancellation?: boolean;
  /** Enable noise suppression (default: true) */
  noiseSuppression?: boolean;
  /** Enable automatic gain control (default: false for voice) */
  autoGainControl?: boolean;
}

// ============================================================================
// Audio Capture Class
// ============================================================================

export class AudioCapture {
  private state: AudioCaptureState = 'idle';
  private callbacks: AudioCaptureCallbacks = {};
  private config: Required<AudioCaptureConfig>;

  // Audio processing nodes
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Resampling state
  private resampleBuffer: Float32Array | null = null;
  private resampleRatio = 1;

  constructor(config: AudioCaptureConfig = {}) {
    this.config = {
      sampleRate: config.sampleRate ?? 16000,
      chunkSize: config.chunkSize ?? 4096,
      echoCancellation: config.echoCancellation ?? true,
      noiseSuppression: config.noiseSuppression ?? true,
      autoGainControl: config.autoGainControl ?? false,
    };

    if (DEBUG) console.log('[AudioCapture] Initialized with config:', this.config);
  }

  /**
   * Get current capture state
   */
  getState(): AudioCaptureState {
    return this.state;
  }

  /**
   * Check if microphone permission is granted
   */
  static async checkPermission(): Promise<PermissionState> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state;
    } catch {
      // Fallback for browsers that don't support permissions API
      return 'prompt';
    }
  }

  /**
   * Start capturing audio from microphone
   */
  async start(callbacks: AudioCaptureCallbacks = {}): Promise<void> {
    if (this.state === 'capturing') {
      if (DEBUG) console.log('[AudioCapture] Already capturing');
      return;
    }

    this.callbacks = callbacks;
    this.setState('requesting');

    try {
      // Request microphone access with specific constraints
      if (DEBUG) console.log('[AudioCapture] Requesting microphone access...');

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
          channelCount: 1,
          // Request sample rate, browser may provide different rate
          sampleRate: { ideal: this.config.sampleRate },
        },
        video: false,
      });

      // Create audio context
      // Note: Safari requires webkit prefix sometimes
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass({
        sampleRate: this.config.sampleRate,
      });

      // Calculate resample ratio if needed
      const actualSampleRate = this.audioContext.sampleRate;
      this.resampleRatio = actualSampleRate / this.config.sampleRate;

      if (DEBUG) {
        console.log('[AudioCapture] Audio context created:', {
          actualSampleRate,
          targetSampleRate: this.config.sampleRate,
          resampleRatio: this.resampleRatio,
        });
      }

      // Create source node from media stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create analyser for volume monitoring
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.sourceNode.connect(this.analyserNode);

      // Create processor node for audio capture
      // Note: ScriptProcessorNode is deprecated but AudioWorklet has broader compatibility issues
      const bufferSize = this.config.chunkSize;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = this.handleAudioProcess.bind(this);

      // Connect nodes: source -> analyser -> processor -> destination
      this.analyserNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      // Start volume monitoring
      this.startVolumeMonitoring();

      this.setState('capturing');
      if (DEBUG) console.log('[AudioCapture] Capture started');

    } catch (error) {
      if (DEBUG) console.error('[AudioCapture] Error starting capture:', error);
      this.setState('error');
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop capturing audio
   */
  stop(): void {
    if (DEBUG) console.log('[AudioCapture] Stopping capture...');

    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Disconnect and close audio nodes
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.resampleBuffer = null;
    this.setState('idle');
  }

  /**
   * Pause audio capture (keeps mic open)
   */
  pause(): void {
    if (this.state !== 'capturing') return;
    this.setState('paused');
    if (DEBUG) console.log('[AudioCapture] Capture paused');
  }

  /**
   * Resume audio capture
   */
  resume(): void {
    if (this.state !== 'paused') return;
    this.setState('capturing');
    if (DEBUG) console.log('[AudioCapture] Capture resumed');
  }

  /**
   * Check if capture is active
   */
  isCapturing(): boolean {
    return this.state === 'capturing';
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setState(state: AudioCaptureState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  private handleAudioProcess(event: AudioProcessingEvent): void {
    // Only process if actively capturing
    if (this.state !== 'capturing') return;

    const inputData = event.inputBuffer.getChannelData(0);

    // Resample if needed
    let processedData: Float32Array;
    if (this.resampleRatio !== 1) {
      processedData = this.resample(inputData);
    } else {
      processedData = inputData;
    }

    // Convert Float32 (-1 to 1) to PCM16 (Int16)
    const pcm16Data = this.float32ToPCM16(processedData);

    // Send to callback
    this.callbacks.onAudioData?.(pcm16Data.buffer);
  }

  private resample(inputData: Float32Array): Float32Array {
    const outputLength = Math.floor(inputData.length / this.resampleRatio);
    const output = new Float32Array(outputLength);

    // Simple linear interpolation resampling
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * this.resampleRatio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
      const fraction = srcIndex - srcIndexFloor;

      output[i] = inputData[srcIndexFloor] * (1 - fraction) +
                  inputData[srcIndexCeil] * fraction;
    }

    return output;
  }

  private float32ToPCM16(float32Data: Float32Array): Int16Array {
    const pcm16Data = new Int16Array(float32Data.length);

    for (let i = 0; i < float32Data.length; i++) {
      // Clamp to [-1, 1]
      const sample = Math.max(-1, Math.min(1, float32Data[i]));
      // Convert to Int16 range
      pcm16Data[i] = sample < 0
        ? sample * 0x8000
        : sample * 0x7FFF;
    }

    return pcm16Data;
  }

  private startVolumeMonitoring(): void {
    if (!this.analyserNode) return;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    const checkVolume = () => {
      if (!this.analyserNode || this.state === 'idle') return;

      this.analyserNode.getByteFrequencyData(dataArray);

      // Calculate average volume (0-1)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length / 255;

      this.callbacks.onVolumeChange?.(average);

      // Continue monitoring if analyser still exists and not stopped
      if (this.analyserNode && this.state !== 'idle' as AudioCaptureState) {
        requestAnimationFrame(checkVolume);
      }
    };

    requestAnimationFrame(checkVolume);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let captureInstance: AudioCapture | null = null;

/**
 * Get the audio capture singleton
 */
export function getAudioCapture(config?: AudioCaptureConfig): AudioCapture {
  if (!captureInstance) {
    captureInstance = new AudioCapture(config);
  }
  return captureInstance;
}

/**
 * Reset the audio capture singleton (useful for testing)
 */
export function resetAudioCapture(): void {
  if (captureInstance) {
    captureInstance.stop();
    captureInstance = null;
  }
}
