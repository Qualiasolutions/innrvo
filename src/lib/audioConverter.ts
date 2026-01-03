/**
 * Audio conversion utilities for voice cloning
 * Converts WebM/MP4 recordings to high-quality WAV format for better voice cloning results
 */

// Debug logging - only enabled in development
const DEBUG = import.meta.env?.DEV ?? false;

/**
 * Convert WebM/MP4 audio blob to WAV format with high quality settings
 *
 * Why this matters for voice cloning:
 * - WebM uses Opus codec with lossy compression (poor for voice cloning)
 * - WAV is uncompressed PCM audio (preserves voice characteristics)
 * - 44.1kHz sample rate matches ElevenLabs expected format
 * - Single channel (mono) is sufficient and reduces file size
 * - Normalization targets ElevenLabs optimal levels (-18dB RMS, -3dB peak)
 *
 * @param blob - Input audio blob (WebM, MP4, etc.)
 * @returns Promise<Blob> - High-quality WAV blob suitable for voice cloning
 */
export async function convertToWAV(blob: Blob): Promise<Blob> {
  if (DEBUG) console.log('[convertToWAV] Starting conversion, input blob size:', blob.size, 'type:', blob.type);

  // Create audio context - 44.1kHz is standard high-quality sample rate for voice
  const audioContext = new AudioContext({ sampleRate: 44100 });

  try {
    // Decode the input audio to raw PCM data
    const arrayBuffer = await blob.arrayBuffer();
    if (DEBUG) console.log('[convertToWAV] ArrayBuffer size:', arrayBuffer.byteLength);

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    if (DEBUG) console.log('[convertToWAV] Decoded audio - duration:', audioBuffer.duration, 'sampleRate:', audioBuffer.sampleRate, 'channels:', audioBuffer.numberOfChannels, 'length:', audioBuffer.length);

    // Convert to mono if stereo (voice cloning doesn't need stereo)
    const monoData = audioBuffer.numberOfChannels > 1
      ? mergeChannels(audioBuffer)
      : audioBuffer.getChannelData(0);

    if (DEBUG) console.log('[convertToWAV] Mono data length:', monoData.length);

    if (monoData.length === 0) {
      throw new Error('Audio decoding produced empty data');
    }

    // Apply normalization to ElevenLabs optimal levels
    // Target: -18dB RMS (center of -23 to -18 dB range), -3dB peak limit
    const channelData = normalizeToElevenLabsSpecs(monoData, -18, -3);

    // Create WAV file with optimal settings for voice cloning
    const wavBlob = encodeWAV(channelData, audioBuffer.sampleRate);

    // Validate the WAV blob has correct header
    const wavArrayBuffer = await wavBlob.arrayBuffer();
    const wavBytes = new Uint8Array(wavArrayBuffer);
    const riff = String.fromCharCode(wavBytes[0], wavBytes[1], wavBytes[2], wavBytes[3]);
    const wave = String.fromCharCode(wavBytes[8], wavBytes[9], wavBytes[10], wavBytes[11]);

    if (riff !== 'RIFF' || wave !== 'WAVE') {
      console.error('[convertToWAV] Invalid WAV headers:', { riff, wave });
      throw new Error('WAV encoding failed - invalid headers');
    }

    if (DEBUG) console.log('[convertToWAV] Conversion successful - output size:', wavBlob.size, 'type:', wavBlob.type);
    return wavBlob;
  } catch (error) {
    console.error('[convertToWAV] Conversion failed:', error);
    throw error;
  } finally {
    // Clean up audio context to free resources
    await audioContext.close();
  }
}

/**
 * Merge stereo channels to mono by averaging
 */
function mergeChannels(audioBuffer: AudioBuffer): Float32Array {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const merged = new Float32Array(length);

  // Average all channels
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let channel = 0; channel < numberOfChannels; channel++) {
      sum += audioBuffer.getChannelData(channel)[i];
    }
    merged[i] = sum / numberOfChannels;
  }

  return merged;
}

/**
 * Utility: Convert dB to linear amplitude
 */
function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Utility: Convert linear amplitude to dB
 */
function linearToDb(linear: number): number {
  if (linear <= 0) return -100;
  return 20 * Math.log10(linear);
}

/**
 * Apply RMS normalization to ElevenLabs optimal levels
 *
 * ElevenLabs IVC recommendations (from docs):
 * - Target RMS: -18 dB (0.126 linear) - center of -23 to -18 dB optimal range
 * - Peak limit: -3 dB (0.708 linear) - prevents distortion
 * - Use soft-knee compression near peak limit for natural sound
 *
 * Why this matters for voice cloning:
 * - Consistent audio levels improve voice clone quality
 * - Proper peak limiting prevents "weird twist" artifacts
 * - Soft-knee compression sounds more natural than hard clipping
 *
 * @param samples - Float32Array of audio samples
 * @param targetRmsDb - Target RMS in dB (default: -18 for ElevenLabs optimal)
 * @param peakLimitDb - Peak limit in dB (default: -3 per ElevenLabs recommendation)
 * @returns Float32Array - Normalized audio samples
 */
function normalizeToElevenLabsSpecs(
  samples: Float32Array,
  targetRmsDb: number = -18,
  peakLimitDb: number = -3
): Float32Array {
  // Convert dB targets to linear scale
  const targetRms = dbToLinear(targetRmsDb); // -18dB = 0.126
  const peakLimit = dbToLinear(peakLimitDb); // -3dB = 0.708

  // Calculate current RMS and peak
  let sumSquares = 0;
  let currentPeak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    sumSquares += samples[i] * samples[i];
    if (abs > currentPeak) currentPeak = abs;
  }
  const currentRms = Math.sqrt(sumSquares / samples.length);

  // If audio is too quiet (silence), skip normalization
  if (currentRms < 0.0001) {
    if (DEBUG) console.log('[normalizeToElevenLabsSpecs] Audio too quiet, skipping normalization');
    return samples;
  }

  // Calculate RMS-based gain
  let gain = targetRms / currentRms;

  // Check if gain would cause peaks to exceed limit
  const projectedPeak = currentPeak * gain;
  if (projectedPeak > peakLimit) {
    // Reduce gain to respect peak limit
    const oldGain = gain;
    gain = peakLimit / currentPeak;
    if (DEBUG) console.log(`[normalizeToElevenLabsSpecs] Gain limited by peak: ${oldGain.toFixed(2)}x -> ${gain.toFixed(2)}x`);
  }

  // Apply gain with soft-knee compression near peak limit
  const normalized = new Float32Array(samples.length);
  const kneeStart = peakLimit * 0.85; // Start compression at 85% of peak limit
  const kneeRange = peakLimit - kneeStart;
  let compressedSamples = 0;

  for (let i = 0; i < samples.length; i++) {
    let sample = samples[i] * gain;
    const abs = Math.abs(sample);

    // Soft-knee compression for samples approaching peak limit
    if (abs > kneeStart) {
      // Calculate how far into the knee region we are (0-1)
      const excess = abs - kneeStart;
      // Use exponential curve for natural-sounding compression
      // ratio ~4:1 at the knee, approaches hard limit at peakLimit
      const compressionRatio = 4;
      const compressedExcess = kneeRange * (1 - Math.exp(-excess / kneeRange * compressionRatio));
      const newAbs = kneeStart + compressedExcess;
      sample = sample > 0 ? newAbs : -newAbs;
      compressedSamples++;
    }

    // Hard limit as safety (should rarely trigger with soft knee)
    if (Math.abs(sample) > peakLimit) {
      sample = sample > 0 ? peakLimit : -peakLimit;
    }

    normalized[i] = sample;
  }

  const finalRms = Math.sqrt(normalized.reduce((sum, s) => sum + s * s, 0) / normalized.length);
  const finalPeak = Math.max(...normalized.map(Math.abs));

  if (DEBUG) {
    console.log(`[normalizeToElevenLabsSpecs] Normalized:`, {
      inputRms: `${linearToDb(currentRms).toFixed(1)}dB`,
      inputPeak: `${linearToDb(currentPeak).toFixed(1)}dB`,
      outputRms: `${linearToDb(finalRms).toFixed(1)}dB`,
      outputPeak: `${linearToDb(finalPeak).toFixed(1)}dB`,
      gain: `${gain.toFixed(2)}x`,
      compressedSamples: `${compressedSamples} (${(compressedSamples / samples.length * 100).toFixed(2)}%)`,
    });
  }

  return normalized;
}

/**
 * Encode PCM audio data to WAV format
 *
 * WAV format structure:
 * - RIFF header (12 bytes)
 * - fmt chunk (24 bytes) - audio format info
 * - data chunk (8 bytes + audio data)
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1; // Mono
  const bitsPerSample = 16; // 16-bit PCM
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // Write fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // Write data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples (convert float32 to int16)
  floatTo16BitPCM(view, 44, samples);

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Write string to DataView (for WAV headers)
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Convert Float32 samples to 16-bit PCM
 */
function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    // Clamp to [-1, 1] range and convert to 16-bit integer
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

/**
 * Get audio duration from blob without decoding
 */
export async function getAudioDuration(blob: Blob): Promise<number> {
  const audioContext = new AudioContext();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.duration;
  } finally {
    await audioContext.close();
  }
}

/**
 * Validate audio quality for voice cloning
 * Aligned with ElevenLabs IVC recommendations
 *
 * @returns { valid: boolean, duration: number, message?: string }
 */
export async function validateAudioForCloning(blob: Blob): Promise<{
  valid: boolean;
  duration: number;
  message?: string;
}> {
  const MIN_DURATION = 60; // ElevenLabs: "at least 1 minute of audio"
  const MAX_DURATION = 120; // ElevenLabs: "avoid exceeding 3 minutes" (we use 2 min for safety)
  const MIN_SIZE = 50000; // bytes (~50KB)

  // Check file size
  if (blob.size < MIN_SIZE) {
    return {
      valid: false,
      duration: 0,
      message: 'Audio file too small. Please record a longer sample.'
    };
  }

  // Check duration
  const duration = await getAudioDuration(blob);

  if (duration < MIN_DURATION) {
    return {
      valid: false,
      duration,
      message: `Recording too short (${duration.toFixed(1)}s). Please record at least ${MIN_DURATION} seconds for best quality.`
    };
  }

  if (duration > MAX_DURATION) {
    return {
      valid: false,
      duration,
      message: `Recording too long (${duration.toFixed(1)}s). Please keep it under ${MAX_DURATION} seconds.`
    };
  }

  return { valid: true, duration };
}
