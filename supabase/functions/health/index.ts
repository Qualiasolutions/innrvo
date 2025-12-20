import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ALLOWED_ORIGINS = [
  'https://www.inrvo.com',
  'https://inrvo.com',
  'https://inrvo.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
});

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: 'up' | 'down';
    elevenlabs: 'configured' | 'not_configured';
    gemini: 'configured' | 'not_configured';
  };
  latency?: {
    database_ms: number;
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Check Supabase database connection
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    let databaseStatus: 'up' | 'down' = 'down';
    let dbLatency = 0;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const dbStart = Date.now();

      try {
        // Simple query to check database connectivity
        const { error } = await supabase
          .from('audio_tag_presets')
          .select('id')
          .limit(1);

        databaseStatus = error ? 'down' : 'up';
        dbLatency = Date.now() - dbStart;
      } catch {
        databaseStatus = 'down';
      }
    }

    // Check if API keys are configured (not their validity, just presence)
    const elevenlabsKey = Deno.env.get('ELEVENLABS_API_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    const healthStatus: HealthStatus = {
      status: databaseStatus === 'up' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: databaseStatus,
        elevenlabs: elevenlabsKey ? 'configured' : 'not_configured',
        gemini: geminiKey ? 'configured' : 'not_configured',
      },
      latency: {
        database_ms: dbLatency,
      },
    };

    // Determine overall status
    if (databaseStatus === 'down') {
      healthStatus.status = 'unhealthy';
    } else if (!elevenlabsKey || !geminiKey) {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'unhealthy' ? 503 : 200;

    return new Response(
      JSON.stringify(healthStatus, null, 2),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );

  } catch (error) {
    console.error('Health check error:', error);

    const unhealthyStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'down',
        elevenlabs: 'not_configured',
        gemini: 'not_configured',
      },
    };

    return new Response(
      JSON.stringify(unhealthyStatus, null, 2),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
});
