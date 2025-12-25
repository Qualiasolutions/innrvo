# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO is a personalized meditation app that generates custom meditations using AI. Users describe how they feel, and the app creates personalized meditation scripts with text-to-speech (TTS) playback via voice cloning.

**Key technologies:** React 19, Vite, TypeScript, Supabase (auth + database + storage + edge functions), Tailwind CSS v4, Framer Motion

## Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Build & Preview
npm run build            # Production build (outputs to dist/)
npm run preview          # Preview production build

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:ui          # Run tests with Vitest UI
npm run test:coverage    # Run tests with coverage report
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
  SimpleVoiceClone.tsx # Voice cloning UI (records audio, uploads to Chatterbox)
  VoiceManager.tsx    # Manage cloned voices
  Visualizer.tsx      # Audio visualizer canvas

src/
  contexts/           # React contexts
    ModalContext.tsx  # Centralized modal state management
    AudioContext.tsx  # Audio playback state
    VoiceContext.tsx  # Voice selection state
  hooks/              # Custom hooks (useVoiceCloning, useMeditationAgent, etc.)
  lib/
    agent/            # MeditationAgent - conversational AI with wisdom teachers
      MeditationAgent.ts     # Main agent class - handles conversation, meditation generation
      knowledgeBase.ts       # Wisdom teachers (Buddha, Rumi, Thich Nhat Hanh, etc.)
    edgeFunctions.ts  # Client for Supabase Edge Functions
    voiceService.ts   # TTS service abstraction
    credits.ts        # Credit system for voice cloning
lib/
  supabase.ts         # Supabase client + database operations
```

### Backend (Supabase Edge Functions)

All API keys (Gemini, Replicate) are stored server-side in Edge Functions. Frontend only sends JWT tokens.

```
supabase/functions/
  gemini-script/      # Generate meditation scripts via Gemini 2.0 Flash
  chatterbox-tts/     # Text-to-speech via Chatterbox (Replicate)
  chatterbox-clone/   # Voice cloning - stores audio sample in Supabase Storage
  generate-speech/    # TTS wrapper for cloned voices
  health/             # Health check endpoint
  export-user-data/   # GDPR data export
  _shared/            # Shared utilities (rate limiting, circuit breaker, tracing)
```

### Database (Supabase)

Key tables with RLS enabled:
- `voice_profiles` - User voice profiles (cloned via Chatterbox)
- `voice_clones` - Base64 audio samples for cloning
- `meditation_history` - Saved meditations with audio storage paths
- `users` - Extended auth.users with preferences

Migrations are in `supabase/migrations/` (numbered SQL files).

### Key Data Flow

1. **Meditation Generation:**
   User prompt → `AgentChat` → `MeditationAgent.chat()` → Gemini Edge Function → Script → Editor view

2. **TTS Playback:**
   Script + Voice → `chatterbox-tts` Edge Function → Audio base64 → V0MeditationPlayer

3. **Voice Cloning:**
   Record audio → Convert to WAV → `chatterbox-clone` Edge Function → Voice profile saved

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
REPLICATE_API_TOKEN=r8_...
```

## Important Patterns

### Modal Management
All modals use centralized `ModalContext`. Access via `useModals()` hook:
```tsx
const { showCloneModal, setShowCloneModal, closeAllModals } = useModals();
```

### Path Alias
`@/` maps to project root. Use for imports: `import { supabase } from '@/lib/supabase'`

### Audio Handling
- WebM recordings are converted to WAV before cloning (Chatterbox requires WAV)
- Audio is stored as base64 in database or in Supabase Storage (`meditation-audio` bucket)

### Edge Function Calls
All edge function calls go through `src/lib/edgeFunctions.ts` which handles:
- JWT authentication
- Request ID generation for tracing
- Retry with exponential backoff
- Timeout handling

### Meditation Player (V0MeditationPlayer)
The player focuses on playback controls without displaying script text:
- Breathing circle visualizer (4-7-8 pattern)
- Play/pause, seek, skip controls
- Background music toggle and volume
- Voice volume control
- Supabase save integration
- Floating particle animations

## Testing

Tests use Vitest + React Testing Library + happy-dom:
- Test files: `*.test.ts` or `*.spec.ts`
- Setup file: `tests/setup.ts`
- Mocks: `tests/mocks/`
- Coverage thresholds enforced for `src/lib/credits.ts` (90%)
