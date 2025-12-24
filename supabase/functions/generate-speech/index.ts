import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, createCompressedResponse } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

/**
 * Generate Speech - Supports both ElevenLabs and Chatterbox providers
 *
 * - ElevenLabs: For legacy cloned voices with elevenlabs_voice_id
 * - Chatterbox: For new clones with voice_sample_url (10x cheaper)
 */

interface GenerateSpeechRequest {
  text: string;
  voiceId: string;
  voiceSettings?: {
    exaggeration?: number;  // Emotion exaggeration (0-1) - Chatterbox only
    cfgWeight?: number;     // CFG weight for quality (0-1) - Chatterbox only
    stability?: number;     // Voice stability (0-1) - ElevenLabs only
    similarity_boost?: number; // Similarity boost (0-1) - ElevenLabs only
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

async function runElevenLabsTTS(
  text: string,
  voiceId: string,
  options: { stability?: number; similarity_boost?: number },
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<{ base64: string; format: string }> {
  log.info('Generating speech with ElevenLabs', { voiceId, textLength: text.length });

  // Use turbo model for faster generation with good quality
  const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',  // Fast, high-quality model
      voice_settings: {
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarity_boost ?? 0.75,
        style: 0.0,  // Neutral style for meditation
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('ElevenLabs API error', { status: response.status, error: errorText });
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  // Convert audio to base64
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
// Chatterbox TTS via Replicate (for new cloned voices)
// ============================================================================

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const CHATTERBOX_MODEL = 'resemble-ai/chatterbox:1b8422bc49635c20d0a84e387ed20879c0dd09254ecdb4e75dc4bec10ff94e97';

async function runChatterboxTTS(
  text: string,
  audioPromptUrl: string | null,
  options: { exaggeration?: number; cfgWeight?: number },
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<string> {
  // Create prediction input - Chatterbox uses 'prompt' not 'text'
  // Optimized parameters for natural, high-quality voice cloning:
  // - exaggeration: 0.5 = neutral (0.3 was too flat, sounded robotic)
  // - cfg_weight: 0.7 = higher quality (0.5 was lower quality)
  // - temperature: 0.8 = natural variability (prevents monotone speech)
  const input: Record<string, unknown> = {
    prompt: text,
    exaggeration: options.exaggeration ?? 0.5,  // Neutral for natural speech
    cfg_weight: options.cfgWeight ?? 0.7,       // Higher for better quality
    temperature: 0.8,                           // Natural variability
  };

  // Add audio prompt if we have a cloned voice reference for zero-shot cloning
  if (audioPromptUrl) {
    input.audio_prompt = audioPromptUrl;
  }

  log.info('Creating Replicate prediction', { model: CHATTERBOX_MODEL, textLength: text.length, hasVoiceSample: !!audioPromptUrl });

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

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    log.error('Failed to create Replicate prediction', { status: createResponse.status, error: errorText });
    throw new Error(`Failed to create prediction: ${createResponse.status} - ${errorText}`);
  }

  const prediction = await createResponse.json();
  log.info('Prediction created', { id: prediction.id, status: prediction.status });

  // Poll for completion (Replicate predictions are async)
  let result = prediction;
  const maxWaitTime = 120000; // 2 minutes max
  const pollInterval = 1000; // 1 second
  const startTime = Date.now();

  while (result.status !== 'succeeded' && result.status !== 'failed') {
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error('Prediction timed out after 2 minutes');
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const pollResponse = await fetch(result.urls.get, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!pollResponse.ok) {
      throw new Error(`Failed to poll prediction: ${pollResponse.status}`);
    }

    result = await pollResponse.json();
    log.info('Prediction status', { id: result.id, status: result.status });
  }

  if (result.status === 'failed') {
    log.error('Prediction failed', { error: result.error });
    throw new Error(result.error || 'TTS prediction failed');
  }

  // Get the audio URL from the output
  const audioUrl = result.output;
  if (!audioUrl) {
    throw new Error('No audio URL in prediction output');
  }

  log.info('Downloading audio from Replicate', { url: audioUrl });

  // Download the audio and convert to base64
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`);
  }

  const audioBlob = await audioResponse.blob();
  const buffer = await audioBlob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Convert to base64 with chunked processing
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
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
    const replicateApiKey = Deno.env.get('REPLICATE_API_TOKEN');
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');

    // Get voice profile if voiceId provided
    let voiceProfile: {
      voice_sample_url: string | null;
      provider_voice_id: string | null;
      elevenlabs_voice_id: string | null;
      provider: string | null;
    } | null = null;

    if (voiceId) {
      const { data, error: profileError } = await supabase
        .from('voice_profiles')
        .select('voice_sample_url, provider_voice_id, elevenlabs_voice_id, provider')
        .eq('id', voiceId)
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        log.warn('Voice profile not found', { voiceId, error: profileError.message });
      } else {
        voiceProfile = data;
        log.info('Found voice profile', {
          voiceId,
          provider: voiceProfile?.provider,
          hasElevenLabsId: !!voiceProfile?.elevenlabs_voice_id,
          hasVoiceSampleUrl: !!voiceProfile?.voice_sample_url,
        });
      }
    }

    // Determine which provider to use based on voice profile
    const isElevenLabsVoice = voiceProfile?.provider === 'ElevenLabs' && voiceProfile?.elevenlabs_voice_id;
    const hasChatterboxSample = voiceProfile?.voice_sample_url;

    let audioBase64: string;
    let audioFormat: string;

    if (isElevenLabsVoice && elevenlabsApiKey) {
      // Use ElevenLabs for legacy cloned voices
      log.info('Using ElevenLabs TTS', {
        voiceId: voiceProfile!.elevenlabs_voice_id,
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

    } else if (replicateApiKey) {
      // Use Chatterbox for new cloned voices or default
      const audioPromptUrl = hasChatterboxSample ? voiceProfile!.voice_sample_url : null;

      log.info('Using Chatterbox TTS', {
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

    } else {
      log.error('No TTS service configured');
      return new Response(
        JSON.stringify({ error: 'No TTS service configured', requestId }),
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
