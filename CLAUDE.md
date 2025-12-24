# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO is a personalized meditation app that generates custom meditation scripts using AI and converts them to speech with voice cloning. Users can clone their own voice or select from built-in voices to hear meditations in a familiar tone.

**Tech Stack**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Supabase (auth, database, edge functions) + ElevenLabs/Chatterbox (TTS/voice cloning) + Gemini (script generation)

## Development Commands

```bash
npm run dev          # Start development server (Vite)
npm run build        # Production build
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Tests with Vitest UI
npm run test:coverage # Coverage report (90% threshold for credits.ts)
npm run test -- src/lib/credits  # Run specific test file
```

## Edge Function Deployment

```bash
# Deploy a specific function
supabase functions deploy generate-speech

# Deploy all functions
supabase functions deploy

# View function logs
supabase functions logs generate-speech --tail
```

## Architecture

### Frontend Structure

Single-page architecture with `App.tsx` containing most UI logic. State managed through React Context providers:

- **`ModalProvider`** (`src/contexts/ModalContext.tsx`) - Centralized modal state for 14+ modal types
- **`AudioProvider`** (`src/contexts/AudioContext.tsx`) - Audio playback and background music
- **`VoiceProvider`** (`src/contexts/VoiceContext.tsx`) - Voice selection and cloning state

Components are lazy-loaded for bundle optimization:
```typescript
const Visualizer = lazy(() => import('./components/Visualizer'));
const AuthModal = lazy(() => import('./components/AuthModal'));
```

### Backend Architecture

All AI/external API calls route through Supabase Edge Functions for security (API keys server-side only):

```
Frontend → src/lib/edgeFunctions.ts → Supabase Edge Functions → External APIs
```

**Edge Functions** (`supabase/functions/`):
- `generate-speech/` - ElevenLabs TTS with rate limiting
- `gemini-script/` - Meditation script generation via Gemini
- `chatterbox-clone/` - Voice cloning via Replicate's Chatterbox model
- `chatterbox-tts/` - TTS via Chatterbox (alternative to ElevenLabs)
- `export-user-data/` - GDPR data export
- `health/` - System health checks

**Shared utilities** (`supabase/functions/_shared/`):
- `rateLimit.ts` - Request rate limiting per user
- `compression.ts` - Response compression
- `tracing.ts` - Request logging with correlation IDs

### AI Agent System

The **MeditationAgent** (`src/lib/agent/MeditationAgent.ts`) is a conversational AI that:
1. Has natural conversations (not immediately generating meditations)
2. Detects emotional state from user input
3. Only generates meditations when explicitly requested
4. Uses a knowledge base of wisdom teachers (`src/lib/agent/knowledgeBase.ts`)
5. Personalizes scripts based on user context and preferences (`src/lib/preferencesService.ts`)

Key trigger phrases for meditation generation:
- "I'll craft a", "Let me create", "Creating your"

### Database Schema

Main tables (`supabase/schema.sql`, migrations in `supabase/migrations/`):
- `voice_profiles` - User voice clones with provider voice IDs (ElevenLabs, Chatterbox)
- `voice_clones` - Audio samples for cloning
- `meditation_history` - Past meditation sessions with audio storage
- `voice_sessions` - Generated audio history
- `users` - Extended user profiles with audio tag preferences

All tables have RLS policies - users can only access their own data.

### Voice Flow

1. **Clone Voice**: Record 30+ sec → Convert WebM to WAV (`src/lib/audioConverter.ts`) → Edge Function → ElevenLabs or Chatterbox
2. **Generate Meditation**: User prompt → Agent conversation → Explicit request → Gemini script → TTS provider
3. **Voice Selection**: Built-in voices (`constants.tsx`) + User clones (`voice_profiles` table)

**Voice Providers** (`types.ts:VoiceProvider`):
- `browser` - Web Speech API (free, no quality)
- `elevenlabs` - ElevenLabs (high quality, paid)
- `chatterbox` - Replicate Chatterbox (alternative, open source)

## Key Files

- `App.tsx` - Main application component (~1200 lines)
- `types.ts` - TypeScript definitions for views, voice profiles, audio tags
- `constants.tsx` - Built-in voices, templates, background tracks, audio tags
- `src/lib/edgeFunctions.ts` - Edge function API wrapper
- `src/lib/voiceService.ts` - Voice operations (cloning, TTS)
- `geminiService.ts` - Script generation prompts

## Environment Variables

Frontend (`.env.local`):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SENTRY_DSN=https://...  # Optional
```

Edge Function secrets (set in Supabase dashboard, not .env):
```
ELEVENLABS_API_KEY=sk_...
GEMINI_API_KEY=AI...
REPLICATE_API_TOKEN=r8_...  # For Chatterbox
```

## Testing

Tests use Vitest with happy-dom. Setup in `tests/setup.ts`, mocks in `tests/mocks/`.

The credits service (`src/lib/credits.ts`) has 90% coverage threshold.

## Path Aliases

`@/*` resolves to project root (configured in tsconfig.json and vite.config.ts).

## MCP Integration

The project supports MCP tools for Supabase operations. See `README_MCP.md` for usage patterns.

Key MCP commands:
- `mcp__supabase__execute_sql` - Run SQL queries
- `mcp__supabase__list_tables` - View schema
- `mcp__supabase__get_logs` - Debug edge functions
- `mcp__supabase__get_advisors` - Security/performance checks
