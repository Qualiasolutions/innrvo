import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, createCompressedResponse } from "../_shared/compression.ts";
import { getRequestId, createLogger, getTracingHeaders } from "../_shared/tracing.ts";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

/**
 * Generate Speech - TTS endpoint using Fish Audio
 *
 * Fish Audio is the primary (and only) TTS provider.
 * ElevenLabs support retained for legacy cloned voices only.
 */

interface GenerateSpeechRequest {
  text: string;
  voiceId: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
  };
}

interface GenerateSpeechResponse {
  success: boolean;
  audioBase64?: string;
  format?: string;
  error?: string;
}

// Lazy-load Supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return supabaseClient;
}

// ============================================================================
// Fish Audio TTS (Primary Provider)
// https://docs.fish.audio/developer-guide/getting-started/quickstart
// ============================================================================

async function runFishAudioTTS(
  text: string,
  modelId: string,
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<{ base64: string; format: string }> {
  log.info('Generating speech with Fish Audio', { modelId, textLength: text.length });

  const response = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      reference_id: modelId,
      format: 'mp3',
      mp3_bitrate: 128,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Fish Audio API error', { status: response.status, error: errorText });

    if (response.status === 402) {
      throw new Error('Fish Audio: Insufficient credits. Please top up your account.');
    }
    if (response.status === 401) {
      throw new Error('Fish Audio: Invalid API key.');
    }
    if (response.status === 404) {
      throw new Error('Fish Audio: Voice model not found. Please re-clone your voice.');
    }
    throw new Error(`Fish Audio error: ${response.status} - ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(audioBuffer);

  // Convert to base64
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
// ElevenLabs TTS (Legacy Support Only)
// ============================================================================

async function runElevenLabsTTS(
  text: string,
  voiceId: string,
  options: { stability?: number; similarity_boost?: number },
  apiKey: string,
  log: ReturnType<typeof createLogger>
): Promise<{ base64: string; format: string }> {
  log.info('Generating speech with ElevenLabs (legacy)', { voiceId, textLength: text.length });

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
    throw new Error(`ElevenLabs error: ${response.status} - ${errorText}`);
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
// Main Handler
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const requestId = getRequestId(req);
  const tracingHeaders = getTracingHeaders(requestId);
  const allHeaders = { ...corsHeaders, ...tracingHeaders };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: allHeaders });
  }

  const log = createLogger({ requestId, operation: 'generate-speech' });

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', requestId }),
        { status: 401, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.tts);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, allHeaders);
    }

    // Parse request
    const { text, voiceId, voiceSettings }: GenerateSpeechRequest = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Missing text parameter', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API keys
    const fishAudioApiKey = Deno.env.get('FISH_AUDIO_API_KEY');
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!fishAudioApiKey) {
      log.error('FISH_AUDIO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TTS service not configured', requestId }),
        { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get voice profile
    if (!voiceId) {
      return new Response(
        JSON.stringify({ error: 'Missing voiceId parameter', requestId }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: voiceProfile, error: profileError } = await supabase
      .from('voice_profiles')
      .select('fish_audio_model_id, elevenlabs_voice_id, provider')
      .eq('id', voiceId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !voiceProfile) {
      log.error('Voice profile not found', { voiceId, error: profileError?.message });
      return new Response(
        JSON.stringify({ error: 'Voice not found. Please select a different voice.', requestId }),
        { status: 404, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Found voice profile', {
      voiceId,
      provider: voiceProfile.provider,
      hasFishAudioId: !!voiceProfile.fish_audio_model_id,
      hasElevenLabsId: !!voiceProfile.elevenlabs_voice_id,
    });

    let audioBase64: string;
    let audioFormat: string;

    // Use Fish Audio (primary)
    if (voiceProfile.fish_audio_model_id) {
      const result = await runFishAudioTTS(
        text,
        voiceProfile.fish_audio_model_id,
        fishAudioApiKey,
        log
      );
      audioBase64 = result.base64;
      audioFormat = result.format;
    }
    // Legacy: ElevenLabs
    else if (voiceProfile.elevenlabs_voice_id && elevenlabsApiKey) {
      const result = await runElevenLabsTTS(
        text,
        voiceProfile.elevenlabs_voice_id,
        voiceSettings || {},
        elevenlabsApiKey,
        log
      );
      audioBase64 = result.base64;
      audioFormat = result.format;
    }
    // No valid voice ID
    else {
      return new Response(
        JSON.stringify({
          error: 'Voice not properly configured. Please re-clone your voice.',
          requestId
        }),
        { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('TTS generation successful', { audioSize: audioBase64.length });

    return await createCompressedResponse(
      { success: true, audioBase64, format: audioFormat, requestId },
      allHeaders,
      { minSize: 0 }
    );

  } catch (error) {
    log.error('Error generating speech', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message, requestId }),
      { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
