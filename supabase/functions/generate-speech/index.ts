import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, createCompressedResponse } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

/**
 * Generate Speech - Unified TTS endpoint with multi-provider support
 *
 * Provider priority:
 * 1. Fish Audio: Primary (best quality, real-time API) - uses fish_audio_model_id
 * 2. ElevenLabs: For legacy cloned voices with elevenlabs_voice_id
 * 3. Chatterbox: Fallback (via Replicate API) - uses voice_sample_url
 */

interface GenerateSpeechRequest {
  text: string;
  voiceId: string;
  voiceSettings?: {
    exaggeration?: number;  // Emotion exaggeration (0-1) - Chatterbox
    cfgWeight?: number;     // CFG weight for quality (0-1) - Chatterbox
    stability?: number;     // Voice stability (0-1) - ElevenLabs
    similarity_boost?: number; // Similarity boost (0-1) - ElevenLabs
  };
}

interface GenerateSpeechResponse {
  success: boolean;
  audioBase64?: string;
  format?: string;
  error?: string;
}

// Lazy-load Supabase client to reduce cold start
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseClient;
}

// ============================================================================
// ElevenLabs TTS (for legacy cloned voices)
// ============================================================================

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const FISH_AUDIO_API_URL = 'https://api.fish.audio';

async function runElevenLabsTTS(
  text: string,
  voiceId: string,
  options: { stability?: number; similarity_boost?: number },
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<{ base64: string; format: string }> {
  log.info('Generating speech with ElevenLabs', { voiceId, textLength: text.length });

  const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarity_boost ?? 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('ElevenLabs API error', { status: response.status, error: errorText });
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(audioBuffer);

  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  log.info('ElevenLabs TTS successful', { audioSize: bytes.length });
  return { base64: btoa(binary), format: 'audio/mpeg' };
}

// ============================================================================
// Fish Audio TTS (Primary Provider)
// ============================================================================

async function runFishAudioTTS(
  text: string,
  modelId: string,
  options: { speed?: number; temperature?: number },
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<{ base64: string; format: string }> {
  log.info('Generating speech with Fish Audio', { modelId, textLength: text.length });

  const response = await fetch(`${FISH_AUDIO_API_URL}/v1/tts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference_id: modelId,
      text,
      chunk_length: 200,
      format: 'mp3',
      mp3_bitrate: 128,
      latency: 'normal',
      streaming: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Fish Audio API error', { status: response.status, error: errorText });

    if (response.status === 402) {
      throw new Error('Fish Audio quota exceeded');
    }
    if (response.status === 401) {
      throw new Error('Fish Audio authentication failed');
    }
    throw new Error(`Fish Audio API error: ${response.status} - ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(audioBuffer);

  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  log.info('Fish Audio TTS successful', { audioSize: bytes.length });
  return { base64: btoa(binary), format: 'audio/mpeg' };
}

// ============================================================================
// Chatterbox TTS via Replicate (Fallback)
// ============================================================================

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const CHATTERBOX_MODEL = 'resemble-ai/chatterbox:1b8422bc49635c20d0a84e387ed20879c0dd09254ecdb4e75dc4bec10ff94e97';

// Maximum characters per Chatterbox chunk to avoid CUDA errors
// 2000 chars is safe; longer texts cause GPU memory issues
const CHATTERBOX_MAX_CHUNK_SIZE = 2000;

/**
 * Split text into chunks at sentence boundaries for Chatterbox
 * Keeps chunks under maxSize characters to prevent CUDA errors
 */
function splitTextIntoChunks(text: string, maxSize: number): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks: string[] = [];
  // Split on sentence boundaries (. ! ?)
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    // If adding this sentence exceeds max size
    if ((currentChunk + ' ' + sentence).length > maxSize) {
      // Save current chunk if not empty
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      // Start new chunk with this sentence
      // If single sentence is too long, split on commas
      if (sentence.length > maxSize) {
        const subParts = sentence.split(/(?<=,)\s+/);
        for (const part of subParts) {
          if (part.length > maxSize) {
            // Last resort: split at maxSize
            for (let i = 0; i < part.length; i += maxSize) {
              chunks.push(part.slice(i, i + maxSize));
            }
          } else {
            if ((currentChunk + ' ' + part).length > maxSize) {
              if (currentChunk.trim()) chunks.push(currentChunk.trim());
              currentChunk = part;
            } else {
              currentChunk = currentChunk ? currentChunk + ' ' + part : part;
            }
          }
        }
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Fetch audio from URL and convert to base64 data URI
async function fetchAudioAsDataUri(url: string, log: ReturnType<typeof createLogger>): Promise<string | null> {
  try {
    log.info('Fetching audio from storage', { url });
    const response = await fetch(url);
    if (!response.ok) {
      log.error('Failed to fetch audio', { status: response.status });
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Validate WAV format
    if (bytes.length < 12) {
      log.error('Audio file too small');
      return null;
    }

    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);

    if (riff !== 'RIFF' || wave !== 'WAVE') {
      log.error('Audio not in WAV format', { firstBytes: riff, formatBytes: wave });
      return null;
    }

    // Convert to base64
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);

    log.info('Audio fetched and converted', { size: bytes.length, base64Length: base64.length });
    return `data:audio/wav;base64,${base64}`;
  } catch (error) {
    log.error('Error fetching audio', { error: error.message });
    return null;
  }
}

/**
 * Process a single chunk through Chatterbox
 * Returns raw audio bytes (for concatenation)
 */
async function processChatterboxChunk(
  text: string,
  audioPromptDataUri: string | null,
  options: { exaggeration?: number; cfgWeight?: number },
  apiKey: string,
  log: ReturnType<typeof createLogger>,
  chunkIndex?: number
): Promise<Uint8Array> {
  const chunkLabel = chunkIndex !== undefined ? ` (chunk ${chunkIndex + 1})` : '';

  const input: Record<string, unknown> = {
    prompt: text,
    exaggeration: options.exaggeration ?? 0.5,
    cfg_weight: options.cfgWeight ?? 0.7,
    temperature: 0.8,
  };

  if (audioPromptDataUri) {
    input.audio_prompt = audioPromptDataUri;
  }

  log.info(`Creating Replicate prediction${chunkLabel}`, { textLength: text.length });

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const createResponse = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: CHATTERBOX_MODEL.split(':')[1],
        input,
      }),
    });

    if (createResponse.ok) {
      const prediction = await createResponse.json();

      let result = prediction;
      const maxWaitTime = 120000;
      const startTime = Date.now();
      let pollAttempt = 0;
      const pollIntervals = [1000, 2000, 4000, 8000];

      while (result.status !== 'succeeded' && result.status !== 'failed') {
        if (Date.now() - startTime > maxWaitTime) {
          throw new Error(`Prediction timed out${chunkLabel}`);
        }

        const pollInterval = pollIntervals[Math.min(pollAttempt, pollIntervals.length - 1)];
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        pollAttempt++;

        const pollResponse = await fetch(result.urls.get, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (!pollResponse.ok) {
          throw new Error(`Failed to poll prediction: ${pollResponse.status}`);
        }

        result = await pollResponse.json();
      }

      if (result.status === 'failed') {
        log.error(`Prediction failed${chunkLabel}`, { error: result.error });
        throw new Error(result.error || 'TTS prediction failed');
      }

      const audioUrl = result.output;
      if (!audioUrl) {
        throw new Error('No audio URL in prediction output');
      }

      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
      }

      const buffer = await audioResponse.arrayBuffer();
      return new Uint8Array(buffer);
    }

    if (createResponse.status === 429) {
      const errorData = await createResponse.json().catch(() => ({}));
      const retryAfter = errorData.retry_after || (attempt + 1) * 5;

      log.warn(`Rate limited${chunkLabel}, retrying...`, { attempt: attempt + 1, retryAfter });

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      throw new Error('Voice generation is temporarily busy. Please wait and try again.');
    }

    const errorText = await createResponse.text();
    throw new Error(`Failed to create prediction: ${createResponse.status} - ${errorText}`);
  }

  throw new Error('Failed after retries');
}

/**
 * Concatenate multiple WAV audio chunks into a single WAV file
 * Handles header creation and audio data merging
 */
function concatenateWavChunks(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 0) throw new Error('No audio chunks to concatenate');
  if (chunks.length === 1) return chunks[0];

  // Extract audio data from each chunk (skip 44-byte WAV header)
  const audioDataParts: Uint8Array[] = [];
  let sampleRate = 24000; // Default for Chatterbox
  let numChannels = 1;
  let bitsPerSample = 16;

  for (const chunk of chunks) {
    if (chunk.length < 44) {
      throw new Error('Invalid WAV chunk: too small');
    }

    // Read format from first chunk
    if (audioDataParts.length === 0) {
      const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      numChannels = view.getUint16(22, true);
      sampleRate = view.getUint32(24, true);
      bitsPerSample = view.getUint16(34, true);
    }

    // Find the 'data' subchunk
    let dataOffset = 12;
    while (dataOffset < chunk.length - 8) {
      const subchunkId = String.fromCharCode(chunk[dataOffset], chunk[dataOffset + 1], chunk[dataOffset + 2], chunk[dataOffset + 3]);
      const subchunkSize = new DataView(chunk.buffer, chunk.byteOffset + dataOffset + 4, 4).getUint32(0, true);

      if (subchunkId === 'data') {
        audioDataParts.push(chunk.slice(dataOffset + 8, dataOffset + 8 + subchunkSize));
        break;
      }
      dataOffset += 8 + subchunkSize;
    }
  }

  // Calculate total data size
  const totalDataSize = audioDataParts.reduce((sum, part) => sum + part.length, 0);

  // Create new WAV file
  const wavBuffer = new ArrayBuffer(44 + totalDataSize);
  const view = new DataView(wavBuffer);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // Write WAV header
  const setString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  setString(0, 'RIFF');
  view.setUint32(4, 36 + totalDataSize, true);
  setString(8, 'WAVE');
  setString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM format chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  setString(36, 'data');
  view.setUint32(40, totalDataSize, true);

  // Copy audio data
  const outputBytes = new Uint8Array(wavBuffer);
  let offset = 44;
  for (const part of audioDataParts) {
    outputBytes.set(part, offset);
    offset += part.length;
  }

  return outputBytes;
}

async function runChatterboxTTS(
  text: string,
  audioPromptUrl: string | null,
  options: { exaggeration?: number; cfgWeight?: number },
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<string> {
  // Fetch audio prompt once if available
  let audioPromptDataUri: string | null = null;
  if (audioPromptUrl) {
    audioPromptDataUri = await fetchAudioAsDataUri(audioPromptUrl, log);
    if (!audioPromptDataUri) {
      log.warn('Could not fetch audio, proceeding without voice clone');
    }
  }

  // Split text into chunks if needed to avoid CUDA errors
  const chunks = splitTextIntoChunks(text, CHATTERBOX_MAX_CHUNK_SIZE);
  log.info('Processing text', { totalLength: text.length, chunkCount: chunks.length });

  // Process each chunk
  const audioChunks: Uint8Array[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkAudio = await processChatterboxChunk(
      chunks[i],
      audioPromptDataUri,
      options,
      apiKey,
      log,
      chunks.length > 1 ? i : undefined
    );
    audioChunks.push(chunkAudio);
  }

  // Concatenate chunks if multiple
  const finalAudio = chunks.length > 1
    ? concatenateWavChunks(audioChunks)
    : audioChunks[0];

  log.info('Chatterbox TTS complete', { totalChunks: chunks.length, finalSize: finalAudio.length });

  // Convert to base64
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < finalAudio.length; i += chunkSize) {
    const chunk = finalAudio.subarray(i, Math.min(i + chunkSize, finalAudio.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const requestId = getRequestId(req);
  const tracingHeaders = getTracingHeaders(requestId);
  const allHeaders = { ...corsHeaders, ...tracingHeaders };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: allHeaders });
  }

  // Create logger with request context
  const log = createLogger({ requestId, operation: 'generate-speech' });

  try {
    // Validate user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log.warn('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      log.warn('Invalid or expired token', { authError: authError?.message });
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Request authenticated', { userId: user.id });

    // Check rate limit
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.tts);
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded', { userId: user.id, remaining: rateLimitResult.remaining });
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    // Parse request body
    const { text, voiceId, voiceSettings }: GenerateSpeechRequest = await req.json();

    // Validate input
    if (!text) {
      log.warn('Missing text');
      return new Response(
        JSON.stringify({ error: 'Missing text parameter', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API keys
    const fishAudioApiKey = Deno.env.get('FISH_AUDIO_API_KEY');
    const replicateApiKey = Deno.env.get('REPLICATE_API_TOKEN');
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');

    // Get voice profile if voiceId provided
    let voiceProfile: {
      voice_sample_url: string | null;
      provider_voice_id: string | null;
      elevenlabs_voice_id: string | null;
      fish_audio_model_id: string | null;
      provider: string | null;
    } | null = null;

    if (voiceId) {
      const { data, error: profileError } = await supabase
        .from('voice_profiles')
        .select('voice_sample_url, provider_voice_id, elevenlabs_voice_id, fish_audio_model_id, provider')
        .eq('id', voiceId)
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        // Check if it's a "not found" error (voice was deleted or doesn't exist)
        if (profileError.code === 'PGRST116') {
          log.error('Voice profile not found - may have been deleted', { voiceId });
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Voice not found. The selected voice may have been deleted. Please select a different voice.',
              requestId,
            }),
            { status: 404, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
          );
        }
        log.warn('Error fetching voice profile', { voiceId, error: profileError.message });
      } else if (!data) {
        log.error('Voice profile returned null', { voiceId });
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Voice not found. Please select a different voice.',
            requestId,
          }),
          { status: 404, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        voiceProfile = data;
        // Validate that the voice has at least one usable provider ID
        const hasUsableVoice = voiceProfile.fish_audio_model_id ||
                               voiceProfile.elevenlabs_voice_id ||
                               voiceProfile.voice_sample_url;
        if (!hasUsableVoice) {
          log.error('Voice profile has no usable voice ID', { voiceId, voiceProfile });
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Voice is not properly configured. Please re-clone the voice or select a different one.',
              requestId,
            }),
            { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
          );
        }
        log.info('Found voice profile', {
          voiceId,
          provider: voiceProfile?.provider,
          hasFishAudioId: !!voiceProfile?.fish_audio_model_id,
          hasElevenLabsId: !!voiceProfile?.elevenlabs_voice_id,
          hasVoiceSampleUrl: !!voiceProfile?.voice_sample_url,
        });
      }
    }

    // Determine which provider to use (priority: Fish Audio > ElevenLabs > Chatterbox)
    const isFishAudioVoice = voiceProfile?.fish_audio_model_id && fishAudioApiKey;
    const isElevenLabsVoice = voiceProfile?.provider === 'ElevenLabs' && voiceProfile?.elevenlabs_voice_id;

    let audioBase64: string | undefined;
    let audioFormat: string | undefined;

    // Priority 1: Fish Audio (best quality, real-time API)
    if (isFishAudioVoice) {
      log.info('Using Fish Audio TTS (primary)', {
        fishAudioModelId: voiceProfile!.fish_audio_model_id,
        textLength: text.length,
      });

      try {
        const result = await runFishAudioTTS(
          text,
          voiceProfile!.fish_audio_model_id!,
          { speed: 1.0, temperature: 0.7 },
          fishAudioApiKey!,
          log
        );
        audioBase64 = result.base64;
        audioFormat = result.format;
      } catch (fishError: any) {
        log.warn('Fish Audio failed, trying fallback', { error: fishError.message });
        // Fall through to other providers
      }
    }

    // Priority 2: ElevenLabs (legacy cloned voices)
    if (!audioBase64 && isElevenLabsVoice && elevenlabsApiKey) {
      log.info('Using ElevenLabs TTS', {
        elevenlabsVoiceId: voiceProfile!.elevenlabs_voice_id,
        textLength: text.length,
      });

      const result = await runElevenLabsTTS(
        text,
        voiceProfile!.elevenlabs_voice_id!,
        {
          stability: voiceSettings?.stability ?? 0.5,
          similarity_boost: voiceSettings?.similarity_boost ?? 0.75,
        },
        elevenlabsApiKey,
        log
      );
      audioBase64 = result.base64;
      audioFormat = result.format;
    }

    // Priority 3: Chatterbox (fallback via Replicate)
    if (!audioBase64 && replicateApiKey) {
      const audioPromptUrl = voiceProfile?.voice_sample_url || null;

      log.info('Using Chatterbox TTS (fallback)', {
        textLength: text.length,
        hasVoiceSample: !!audioPromptUrl,
      });

      audioBase64 = await runChatterboxTTS(
        text,
        audioPromptUrl,
        {
          exaggeration: voiceSettings?.exaggeration ?? 0.5,
          cfgWeight: voiceSettings?.cfgWeight ?? 0.7,
        },
        replicateApiKey,
        log
      );
      audioFormat = 'audio/wav';
    }

    // No provider available
    if (!audioBase64) {
      log.error('No TTS service available');
      return new Response(
        JSON.stringify({ error: 'No TTS service configured. Please add API keys.', requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('TTS generation successful', { audioSize: audioBase64.length, format: audioFormat });

    // Return compressed response
    return await createCompressedResponse(
      {
        success: true,
        audioBase64,
        format: audioFormat,
        requestId,
      } as GenerateSpeechResponse,
      allHeaders,
      { minSize: 0 } // Always compress audio responses
    );

  } catch (error) {
    log.error('Error generating speech', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        requestId,
      } as GenerateSpeechResponse),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
