/**
 * Audio conversion utilities for voice cloning
 * Converts WebM/MP4 recordings to high-quality WAV format for better voice cloning results
 */

/**
 * Convert WebM/MP4 audio blob to WAV format with high quality settings
 *
 * Why this matters for voice cloning:
 * - WebM uses Opus codec with lossy compression (poor for voice cloning)
 * - WAV is uncompressed PCM audio (preserves voice characteristics)
 * - Higher sample rate (48kHz) captures more voice detail
 * - Single channel (mono) is sufficient and reduces file size
 *
 * @param blob - Input audio blob (WebM, MP4, etc.)
 * @returns Promise<Blob> - High-quality WAV blob suitable for voice cloning
 */
export async function convertToWAV(blob: Blob): Promise<Blob> {
  // Create audio context with high sample rate for better quality
  const audioContext = new AudioContext({ sampleRate: 48000 });

  try {
    // Decode the input audio to raw PCM data
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Convert to mono if stereo (voice cloning doesn't need stereo)
    const channelData = audioBuffer.numberOfChannels > 1
      ? mergeChannels(audioBuffer)
      : audioBuffer.getChannelData(0);

    // Create WAV file with optimal settings for voice cloning
    const wavBlob = encodeWAV(channelData, audioBuffer.sampleRate);

    return wavBlob;
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
 *
 * @returns { valid: boolean, duration: number, message?: string }
 */
export async function validateAudioForCloning(blob: Blob): Promise<{
  valid: boolean;
  duration: number;
  message?: string;
}> {
  const MIN_DURATION = 6; // seconds - Chatterbox recommendation
  const MAX_DURATION = 90; // seconds
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
