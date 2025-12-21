# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO is a web-based AI-powered wellness platform for personalized meditations and immersive storytelling. Users can create guided meditations using Gemini AI, clone their voice with ElevenLabs, and interact with a conversational meditation agent.

## Tech Stack

- **Frontend**: React 19, Vite 6, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI**: Google Gemini 2.0 Flash (script generation), ElevenLabs (voice cloning + TTS)
- **Testing**: Vitest with happy-dom, Testing Library
- **Deployment**: Vercel

## Commands

```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once (CI mode)
npm run test:coverage    # Generate coverage report
```

## Architecture

### Core Services (`src/lib/`)
- `voiceService.ts` - Unified voice synthesis abstraction
- `elevenlabs.ts` - Voice cloning and TTS API
- `edgeFunctions.ts` - Secure server-side API calls via Supabase Edge Functions
- `credits.ts` - Credit system (currently disabled - unlimited access)
- `textSync.ts` - Audio-text synchronization for inline playback

### Agent System (`src/lib/agent/`)
- `MeditationAgent.ts` - Conversational AI with tool capabilities
- `knowledgeBase.ts` - Wisdom traditions, meditation types, emotional states
- `agentTools.ts` - Agent-callable functions
- `conversationStore.ts` - Persistent conversation state

### Context System (`src/contexts/modals/`)
Centralized modal management with separate contexts for Auth, Clone, Settings, Legal, Navigation.

### Edge Functions (`supabase/functions/`)
- `gemini-script` - Generate meditations using Gemini
- `generate-speech` - TTS via ElevenLabs
- `elevenlabs-voice-ops` - Voice cloning operations
- `process-voice` - Voice validation and processing

## Key Files

- `App.tsx` - Main app component
- `constants.tsx` - Templates, voices, backgrounds, icons
- `types.ts` - TypeScript interfaces
- `geminiService.ts` - Client-side Gemini integration

## Audio Tag System

Meditation scripts use embedded tags like `[pause]`, `[breathing]`, `[whisper]` that are color-coded in the UI:
- Cyan: pauses
- Emerald: breathing exercises
- Violet: voice styles
- Rose: sounds/effects

## Database

Supabase with RLS (Row Level Security) on all tables:
- `user_profiles` - Extended user data
- `voice_clones` - User voice recordings with metadata
- `voice_sessions` - Generated meditation history
- `audio_tags` - Meditation effect markers
- `agent_conversations` - Chat history

Migrations are in `supabase/migrations/` - use sequential naming.

## Testing Notes

- Coverage thresholds enforced on `src/lib/credits.ts` (90% requirement)
- Tests use happy-dom environment
- Mock setup in `tests/setup.ts` includes Sentry and AudioContext mocks

## Environment Variables

Required in `.env.local`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase publishable key
- `VITE_SENTRY_DSN` - Sentry error tracking (optional)

Edge Function secrets (set in Supabase dashboard):
- `ELEVENLABS_API_KEY`
- `GEMINI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
