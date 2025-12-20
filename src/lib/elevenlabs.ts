// ElevenLabs API service for voice cloning and TTS
// Now uses Edge Functions for secure API key handling
// API keys are stored server-side, never exposed to browser

import { elevenLabsTTS, elevenLabsCloneVoice, isEdgeFunctionAvailable } from './edgeFunctions';

// Legacy direct API access (deprecated - only used as fallback)
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io';

// Feature flag: Use Edge Functions for all API calls
const USE_EDGE_FUNCTIONS = true;

export interface VoiceCloningOptions {
  name: string;
  description?: string;
  labels?: Record<string, string>;
}

export interface TTSOptions {
  model_id?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface VoiceCloningResult {
  voice_id: string;
  name: string;
}

/**
 * Check if ElevenLabs is configured
 * With Edge Functions, we just need to be authenticated
 */
export function isElevenLabsConfigured(): boolean {
  // Edge Functions handle API keys server-side
  // We just need Supabase to be configured for auth
  return USE_EDGE_FUNCTIONS || !!ELEVENLABS_API_KEY;
}

export const elevenlabsService = {
  /**
   * Creates an instant voice clone from audio sample
   * Uses Edge Functions for secure API key handling
   * @param audioBlob - Audio blob (recommended 30+ seconds for best quality)
   * @param options - Voice cloning options
   * @returns Promise<string> - Voice ID
   */
  async cloneVoice(audioBlob: Blob, options: VoiceCloningOptions): Promise<string> {
    // Validate audio duration first
    let duration = 0;
    try {
      duration = await getAudioDuration(audioBlob);
      console.log(`Audio duration: ${duration.toFixed(1)}s`);

      if (duration < 10) {
        throw new Error(`Audio is too short (${duration.toFixed(1)}s). Please record at least 10 seconds for basic quality, 30+ seconds recommended.`);
      }
    } catch (e: any) {
      if (e.message?.includes('too short')) {
        throw e;
      }
      console.warn('Could not determine audio duration, proceeding anyway:', e.message);
    }

    // Convert WebM to WAV for better compatibility
    let audioFile: Blob;

    if (audioBlob.type === 'audio/webm' || audioBlob.type.includes('webm')) {
      try {
        console.log('Converting WebM to WAV for better compatibility...');
        audioFile = await convertToWav(audioBlob);
        console.log(`Converted to WAV: ${(audioFile.size / 1024).toFixed(1)} KB`);
      } catch (conversionError) {
        console.warn('WAV conversion failed, using original:', conversionError);
        audioFile = audioBlob;
      }
    } else {
      audioFile = audioBlob;
    }

    // Use Edge Functions (secure, API key server-side)
    if (USE_EDGE_FUNCTIONS) {
      console.log('Uploading voice via Edge Function...');
      const voiceId = await elevenLabsCloneVoice(audioFile, options.name, options.description);
      console.log(`Voice cloned successfully! Voice ID: ${voiceId}`);
      return voiceId;
    }

    // Legacy fallback (deprecated - exposes API key)
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs not configured. Please sign in to use voice cloning.');
    }

    const formData = new FormData();
    formData.append('name', options.name);
    formData.append('files', audioFile, 'voice_sample.wav');

    if (options.description) {
      formData.append('description', options.description);
    }

    if (options.labels) {
      formData.append('labels', JSON.stringify(options.labels));
    }

    console.log('Uploading voice to ElevenLabs (legacy)...');

    const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Voice cloning failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail?.message || errorData.detail || errorData.message || `HTTP ${response.status}`;

        if (response.status === 401) {
          errorMessage = 'Invalid ElevenLabs API key.';
        } else if (response.status === 422) {
          errorMessage = `Invalid request: ${errorMessage}. Make sure your audio is clear and at least 10 seconds long.`;
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        }
      } catch {
        errorMessage = `Voice cloning failed with status ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.voice_id) {
      throw new Error('No voice_id returned from ElevenLabs API');
    }

    console.log(`Voice cloned successfully! Voice ID: ${data.voice_id}`);
    return data.voice_id;
  },

  /**
   * Generates speech using a cloned voice
   * Uses Edge Functions for secure API key handling
   * @param text - Text to synthesize
   * @param voiceId - Voice ID from cloning
   * @param options - TTS options
   * @returns Promise<string> - Base64 encoded audio (MP3)
   */
  async generateSpeech(
    text: string,
    voiceId: string,
    options: TTSOptions = {}
  ): Promise<string> {
    if (!text || text.trim() === '') {
      throw new Error('Text is required for speech generation');
    }

    // Use Edge Functions (secure, API key server-side)
    if (USE_EDGE_FUNCTIONS) {
      return elevenLabsTTS(voiceId, text, {
        stability: options.voice_settings?.stability ?? 0.5,
        similarity_boost: options.voice_settings?.similarity_boost ?? 0.75,
        style: options.voice_settings?.style ?? 0.0,
        use_speaker_boost: options.voice_settings?.use_speaker_boost ?? true,
      });
    }

    // Legacy fallback (deprecated - exposes API key)
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs not configured. Please sign in to use TTS.');
    }

    const requestData = {
      text,
      model_id: options.model_id || 'eleven_multilingual_v2',
      voice_settings: {
        stability: options.voice_settings?.stability ?? 0.5,
        similarity_boost: options.voice_settings?.similarity_boost ?? 0.75,
        style: options.voice_settings?.style ?? 0.0,
        use_speaker_boost: options.voice_settings?.use_speaker_boost ?? true,
      },
    };

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify(requestData),
      }
    );

    if (!response.ok) {
      let errorMessage = 'TTS generation failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail?.message || errorData.detail || errorData.message || `HTTP ${response.status}`;

        if (response.status === 401) {
          errorMessage = 'Invalid ElevenLabs API key';
        } else if (response.status === 404) {
          errorMessage = 'Voice not found. It may have been deleted.';
        }
      } catch {
        errorMessage = `TTS failed with status ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    const audioBlob = await response.blob();

    // Convert to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert audio to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read audio blob'));
      reader.readAsDataURL(audioBlob);
    });
  },

  /**
   * Gets the status of a voice
   * @param voiceId - Voice ID to check
   * @returns Promise<string> - Status ('ready' if voice exists)
   */
  async getVoiceStatus(voiceId: string): Promise<string> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/v1/voices/${voiceId}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return 'deleted';
      }
      throw new Error('Failed to get voice status');
    }

    return 'ready';
  },

  /**
   * Deletes a voice clone from ElevenLabs
   * @param voiceId - Voice ID to delete
   */
  async deleteVoice(voiceId: string): Promise<void> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/v1/voices/${voiceId}`,
      {
        method: 'DELETE',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      let errorMessage = 'Failed to delete voice';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // Ignore JSON parse errors
      }
      throw new Error(errorMessage);
    }
  },

  /**
   * Lists all voices for the user
   * @returns Promise<Array> - Array of voice objects
   */
  async getUserVoices(): Promise<any[]> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json();
    return data.voices || [];
  },

  /**
   * Get user subscription info (for checking quotas)
   */
  async getUserInfo(): Promise<any> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/user`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  },
};

/**
 * Helper function to get audio duration from a blob
 * Includes timeout to prevent hanging on malformed audio
 */
async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(blob);

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Timeout getting audio duration'));
    }, 5000);

    audio.addEventListener('loadedmetadata', () => {
      clearTimeout(timeout);
      const duration = audio.duration;
      URL.revokeObjectURL(url);

      // Handle Infinity duration (common with WebM)
      if (!isFinite(duration) || duration === Infinity) {
        // Estimate based on file size (rough approximation: ~128kbps for webm)
        const estimatedDuration = (blob.size / 16000); // bytes / (128kbps / 8)
        console.log(`Duration was Infinity, estimating: ${estimatedDuration.toFixed(1)}s`);
        resolve(estimatedDuration);
      } else {
        resolve(duration);
      }
    });

    audio.addEventListener('error', () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio metadata'));
    });

    audio.src = url;
  });
}

/**
 * Convert WebM audio to WAV format for better ElevenLabs compatibility
 * Uses Web Audio API for decoding and manual WAV encoding
 */
async function convertToWav(webmBlob: Blob): Promise<Blob> {
  const audioContext = new AudioContext({ sampleRate: 44100 });

  try {
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Encode as WAV
    const wavBuffer = encodeWAV(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } finally {
    await audioContext.close();
  }
}

/**
 * Encode an AudioBuffer to WAV format
 */
function encodeWAV(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  // Interleave channels
  const length = audioBuffer.length * numChannels * (bitDepth / 8);
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write audio data
  const channelData: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Converts base64 audio to blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
