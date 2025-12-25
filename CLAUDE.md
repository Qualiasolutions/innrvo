# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO is a personalized meditation app that generates custom meditations using AI. Users describe how they feel, and the app creates personalized meditation scripts with text-to-speech (TTS) playback via voice cloning.

**Key technologies:** React 19, Vite, TypeScript, Supabase (auth + database + storage + edge functions), Tailwind CSS v4, Framer Motion

**Node requirement:** >=20.0.0

## Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Build & Type Check
npm run build            # Production build (outputs to dist/)
npm run preview          # Preview production build
npx tsc --noEmit         # Type check without emitting

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:ui          # Run tests with Vitest UI
npm run test:coverage    # Run tests with coverage report
npx vitest run src/lib/credits.test.ts  # Run single test file

# Supabase (local development)
npx supabase start       # Start local Supabase
npx supabase stop        # Stop local Supabase
npx supabase db push     # Push migrations to remote
npx supabase functions serve  # Serve edge functions locally
```

## Architecture

### Frontend Structure (Vite SPA)

```
App.tsx               # Main app component - manages views, state, generation flow
index.tsx             # Entry point - React providers, Sentry, analytics
types.ts              # Shared TypeScript types (View, VoiceProfile, CloningStatus, etc.)
constants.tsx         # Template categories, voice profiles, audio tags

components/           # UI components
  V0MeditationPlayer/ # Audio player - playback controls, breathing visualizer, no script display
  MeditationEditor/   # Script editing with audio tags
  AgentChat.tsx       # AI conversation interface
  SimpleVoiceClone.tsx # Voice cloning UI (records audio, uploads via Fish Audio)
  VoiceManager.tsx    # Manage cloned voices
  Visualizer.tsx      # Audio visualizer canvas

src/
  contexts/           # React contexts
    ModalContext.tsx  # Centralized modal state management
    AudioContext.tsx  # Audio playback state
    VoiceContext.tsx  # Voice selection state
  hooks/
    useVoiceCloning.ts      # Voice cloning workflow (record → process → upload)
    useMeditationAgent.ts   # AI conversation with MeditationAgent
    useVoiceGeneration.ts   # TTS generation workflow
    useAudioPlayback.ts     # Audio player controls
  lib/
    agent/            # MeditationAgent - conversational AI with wisdom teachers
      MeditationAgent.ts     # Main agent class - handles conversation, meditation generation
      knowledgeBase.ts       # Wisdom teachers (Buddha, Rumi, Thich Nhat Hanh, etc.)
    edgeFunctions.ts  # Client for Supabase Edge Functions (Fish Audio, Chatterbox, Gemini)
    voiceService.ts   # TTS service abstraction - routes to appropriate provider
    credits.ts        # Credit system for voice cloning
lib/
  supabase.ts         # Supabase client + database operations
```

### Backend (Supabase Edge Functions)

All API keys (Gemini, Fish Audio, Replicate) are stored server-side in Edge Functions. Frontend only sends JWT tokens.

```
supabase/functions/
  gemini-script/      # Generate meditation scripts via Gemini 2.0 Flash
  fish-audio-tts/     # Primary TTS via Fish Audio (best quality, real-time)
  fish-audio-clone/   # Primary voice cloning via Fish Audio
  chatterbox-tts/     # Fallback TTS via Chatterbox (Replicate)
  chatterbox-clone/   # Fallback voice cloning - stores audio in Supabase Storage
  generate-speech/    # Unified TTS endpoint - routes to Fish Audio or Chatterbox
  health/             # Health check endpoint
  export-user-data/   # GDPR data export
  _shared/            # Shared utilities (rate limiting, circuit breaker, tracing, compression)
```

### Voice Provider Architecture

Provider priority: Fish Audio (primary) → ElevenLabs (legacy) → Chatterbox (fallback)

```
Voice Cloning Flow:
  Record audio → Convert to WAV → fish-audio-clone → Creates Fish Audio model
                                                   → Also stores in Supabase Storage (fallback)

TTS Flow (generate-speech endpoint):
  1. Check fish_audio_model_id → Use Fish Audio API (primary, best quality)
  2. Check elevenlabs_voice_id → Use ElevenLabs API (legacy cloned voices)
  3. Check voice_sample_url → Use Chatterbox via Replicate (zero-shot fallback)
  4. Circuit breaker prevents cascading failures
```

### Database (Supabase)

Key tables with RLS enabled:
- `voice_profiles` - User voice profiles with `fish_audio_model_id` and `voice_sample_url`
- `voice_clones` - Base64 audio samples for cloning
- `meditation_history` - Saved meditations with audio storage paths
- `users` - Extended auth.users with preferences

Migrations are in `supabase/migrations/` (numbered SQL files).

### Key Data Flow

1. **Meditation Generation:**
   User prompt → `AgentChat` → `MeditationAgent.chat()` → Gemini Edge Function → Script → Editor view

2. **TTS Playback:**
   Script + Voice → `generate-speech` Edge Function → Fish Audio (or Chatterbox fallback) → Audio → V0MeditationPlayer

3. **Voice Cloning:**
   Record audio → Convert to WAV → `fish-audio-clone` Edge Function → Voice profile saved (Fish Audio model + Supabase backup)

## Environment Variables

Frontend (`.env.local`):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SENTRY_DSN=https://...  # Optional
```

Edge Function secrets (set in Supabase Dashboard):
```
GEMINI_API_KEY=AI...
FISH_AUDIO_API_KEY=fa_...    # Primary TTS/cloning provider
REPLICATE_API_TOKEN=r8_...   # Fallback provider (Chatterbox)
ELEVENLABS_API_KEY=xi_...    # Legacy voice support (optional)
```

## Important Patterns

### Modal Management
All modals use centralized `ModalContext`. Two hook options:
```tsx
// For single modal - more efficient, only re-renders when this modal changes
const [isOpen, setOpen] = useModal('clone');

// For multiple modals - backwards compatible, re-renders on any modal change
const { showCloneModal, setShowCloneModal, closeAllModals } = useModals();
```

### Path Alias
`@/` maps to project root. Use for imports: `import { supabase } from '@/lib/supabase'`

### Audio Handling
- WebM recordings are converted to WAV before cloning (required by voice APIs)
- Audio is stored as base64 in database or in Supabase Storage (`meditation-audio`, `voice-samples` buckets)

### Edge Function Calls
All edge function calls go through `src/lib/edgeFunctions.ts` which handles:
- JWT authentication
- Request ID generation for tracing
- Retry with exponential backoff
- Timeout handling
- Circuit breaker integration

### Circuit Breaker
Located in `supabase/functions/_shared/circuitBreaker.ts`. Prevents cascading failures:
- Fish Audio: 3 failures → 45s cooldown
- Replicate: 3 failures → 60s cooldown
- Gemini: 5 failures → 30s cooldown

### Meditation Player (V0MeditationPlayer)
The player focuses on playback controls without displaying script text:
- Breathing circle visualizer (4-7-8 pattern)
- Play/pause, seek, skip controls
- Background music toggle and volume
- Voice volume control
- Supabase save integration
- Floating particle animations

### MeditationAgent Conversation Flow
The agent (`src/lib/agent/MeditationAgent.ts`) is conversational by default:
- Detects emotional state from user input
- Only generates meditations when explicitly requested (trigger phrases like "I'll craft a", "Let me create")
- Validates responses to prevent unwanted meditation content in chat
- Supports pasted meditation scripts (bypasses AI processing)
- Builds personalized prompts using extracted context (situation, settings, goals, duration)

## Testing

Tests use Vitest + React Testing Library + happy-dom:
- Test files: `*.test.ts` or `*.spec.ts`
- Setup file: `tests/setup.ts`
- Mocks: `tests/mocks/`
- Coverage thresholds enforced for `src/lib/credits.ts` (90%)
