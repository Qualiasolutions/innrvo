# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

INrVO (Digital Zen Wellness) is an AI-powered wellness platform built with React and Google's Gemini AI. It provides personalized meditation generation, voice synthesis, and immersive audio experiences.

## Commands

```bash
npm run dev      # Start Vite dev server (port 3000)
npm run build    # Production build
npm run preview  # Preview production build
```

## Deployment

GitHub Actions auto-deploys to Vercel on push to `main` branch (`.github/workflows/deploy.yml`).

## Environment Setup

Create `.env.local` with:
```
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Architecture

### View System
The app uses a single `App.tsx` component managing views via the `View` enum in `types.ts`:
- **HOME** - Main input page with bottom-fixed prompt (ChatGPT-style), text/voice input, template browser, voice selector, music selector
- **PLAYER** - Immersive audio playback with D3 radial visualizer
- (WRITER, STUDIO, MIXER, CLONE views defined but currently routed through HOME/modals)

**Layout:** HOME uses a flex column with prompt fixed at bottom, tagline centered above.

### Modal System
App.tsx manages several modal states for UI overlays:
- `showTemplatesModal` - 3-level hierarchical template browser (category → subgroup → template)
- `showMusicModal` - Background track selector with categorized tracks
- `showCloneModal` - Voice cloning recording interface (SimpleVoiceClone component)
- `showAuthModal` - Sign in/up authentication
- `showVoiceManager` - Saved voice profiles management
- `showBurgerMenu` - Mobile navigation drawer
- `showLibrary` - Meditation history with tabs (`'history' | 'saved'`)
- `showTerms`, `showPrivacy` - Legal pages (Terms of Service, Privacy Policy)
- `showHowItWorks`, `showPricing`, `showAboutUs` - Info modals

### AI Integration Layer
`geminiService.ts` wraps Google Generative AI (@google/genai):
- `enhanceScript()` - gemini-3-pro-preview with Thinking Mode (32KB budget) for meditation script generation
- `quickEdit()` - gemini-3-flash-preview for fast edits
- `generateSpeech()` - gemini-2.5-flash-preview-tts for TTS (24kHz PCM, base64)
- `transcribeAudio()` - gemini-3-flash-preview for speech-to-text from WebM
- `decodeAudioBuffer()` - Utility to convert base64 PCM to AudioBuffer
- `blobToBase64()` - Utility for audio blob conversion

### Data Persistence
`lib/supabase.ts` provides:
- Auth helpers: `signUp`, `signIn`, `signOut`, `getCurrentUser`
- Voice profiles: `createVoiceProfile`, `getUserVoiceProfiles`, `updateVoiceProfile`, `deleteVoiceProfile`
- Voice clones: `createVoiceClone`, `getUserVoiceClones` (stores base64 audio samples)
- Audio generations: `saveAudioGeneration`, `getUserAudioGenerations`
- Meditation history: `saveMeditationHistory`, `getMeditationHistory`, `deleteMeditationHistory` (auto-saves on generation)

Database schema in `supabase-schema.sql` - run in Supabase SQL Editor to set up tables with RLS policies.

### Credits System
`src/lib/credits.ts` manages usage credits:
- Voice clone costs 5,000 credits
- TTS costs 280 credits per 1K characters
- Free tier: 10,000 monthly credits, 2 voice clones/month
- Functions: `getCredits`, `deductCredits`, `canClone`, `getClonesRemaining`

### Component Structure
```
App.tsx              # Main app, all view rendering, state management
components/
  Background.tsx     # Responsive background images (desktop/mobile)
  Visualizer.tsx     # D3 radial audio visualizer
  Starfield.tsx      # Procedural star background with animations
  GlassCard.tsx      # Glass-morphism card component
  LoadingScreen.tsx  # Initial loading animation
  AuthModal.tsx      # Sign in/up modal
  VoiceManager.tsx   # Saved voice profiles management
  SimpleVoiceClone.tsx # Voice cloning recording interface
  ui/ai-voice-input  # Voice recording component with visualizer
constants.tsx        # TEMPLATE_CATEGORIES, VOICE_PROFILES, BACKGROUND_TRACKS, ICONS
types.ts             # View enum, interfaces (SoundLayer, ScriptTemplate, VoiceProfile, BackgroundMusic)
lib/
  supabase.ts        # Supabase client and data operations
  utils.ts           # Utility functions (cn for classnames)
src/lib/
  credits.ts         # Credit management for voice cloning/TTS
  elevenlabs.ts      # ElevenLabs TTS integration (advanced voice cloning)
  voiceService.ts    # Voice synthesis service layer
```

### State Management
All state in App.tsx using React hooks. Key state groups:
- View: `currentView`, `isLoading`
- Script: `script`, `isGenerating`
- Voice: `selectedVoice`, `availableVoices`
- Modals: `showTemplatesModal`, `showMusicModal`, `showCloneModal`, `showAuthModal`, `showVoiceManager`
- Legal: `showTerms`, `showPrivacy`
- Library: `showLibrary`, `libraryTab`, `meditationHistory`, `isLoadingHistory`
- Template selection: `selectedCategory`, `selectedSubgroup` (for 3-level navigation)
- Background music: `selectedBackgroundTrack`
- Recording: `isRecording`, `isRecordingClone`, `recordedAudio`, `recordingProgress`
- Auth: `user`, `showAuthModal`, `savedVoices`
- Audio: `audioContextRef`, `audioSourceRef`, `isPlaying`

## Tech Stack

- **React 19** with TypeScript 5.8, Vite 6
- **Google Generative AI** (@google/genai) - Gemini 3 Pro/Flash, Gemini 2.5 TTS
- **ElevenLabs API** - Advanced voice cloning and TTS (optional)
- **Supabase** - Auth and database for voice profiles/clones
- **D3.js** - Audio visualization
- **Tailwind CSS 4** (via PostCSS) + custom glass-morphism in index.html
- **Web Audio API** / **MediaRecorder API** - Audio capture and playback
- **Lucide React** - Icons

**Path Alias:** `@/` resolves to project root (configured in vite.config.ts and tsconfig.json)

## Styling

Global styles in `index.html` `<style>` block and `index.css`. Key patterns:
- CSS variables for colors: `--bg-deep: #020617`, `--accent-primary: #6366f1`
- Glass-morphism: `.glass`, `.glass-elevated` classes
- Animation classes: `.animate-shine`, `.animate-twinkle`, `.animate-glitch`, `.animate-pulsar`
- Fonts: Plus Jakarta Sans (body), Space Grotesk (neural/tech), Playfair Display (serif)
- Responsive typography using clamp()

## Extending the App

- **Add meditation template**: Edit `TEMPLATE_CATEGORIES` in `constants.tsx`. Structure is hierarchical:
  - `TemplateCategory` → `TemplateSubgroup[]` → `ScriptTemplate[]`
  - Example: Meditation (category) → Happiness (subgroup) → Self-Love (template)
- **Add background track**: Edit `BACKGROUND_TRACKS` in `constants.tsx` (categories: ambient, nature, binaural, instrumental)
- **Add voice profile**: Edit `VOICE_PROFILES` in `constants.tsx` (Gemini voices: Zephyr, Kore, Puck, Fenrir)
- **Modify AI prompts**: Edit prompt strings in `geminiService.ts`
- **Add new view**: Add to `View` enum in `types.ts`, add render logic in App.tsx
- **Add new modal**: Add state `showXModal` in App.tsx, render conditional JSX
- **Add database table**: Update types in `lib/supabase.ts`, add CRUD functions, update `supabase-schema.sql`

## Notes

- Voice cloning stores audio samples but uses Gemini's prebuilt voices for TTS (no custom voice synthesis yet)
- Audio format: 24kHz sample rate, mono PCM, base64 encoded
- The `accent` field in voice_profiles stores the preferred Gemini voice name
- Recording limit: 30 seconds for voice clones, base64 size limit ~15MB