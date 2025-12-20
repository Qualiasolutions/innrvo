# Desktop Header Navigation & Music Categories Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert desktop sidebar to horizontal header navigation, transform burger menu into history tab, expand music categories with functional background audio playback.

**Architecture:**
1. Create responsive header with desktop nav links (How It Works, Library, Pricing, About Us) hidden on mobile
2. Replace burger menu content with meditation history (same as Library modal history tab)
3. Restructure footer: move "Powered by Qualia Solutions" under Terms/Privacy, add copyright
4. Expand BACKGROUND_TRACKS with more categories and add actual audio URLs for playback
5. Implement Web Audio API mixing for background music during meditation playback

**Tech Stack:** React, TypeScript, Tailwind CSS, Web Audio API

---

## Task 1: Add Desktop Navigation Links to Header

**Files:**
- Modify: `App.tsx` (lines ~641-712)

**Step 1: Add desktop navigation links after the logo**

Find the header section (around line 641) and add desktop-only navigation links. After the logo div, add:

```tsx
{/* Desktop Navigation Links - Hidden on mobile */}
<div className="hidden md:flex items-center gap-1 ml-6">
  <button
    onClick={() => setShowHowItWorks(true)}
    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
  >
    How It Works
  </button>
  <button
    onClick={() => setShowLibrary(true)}
    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
  >
    Library
  </button>
  <button
    onClick={() => setShowPricing(true)}
    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
  >
    Pricing
  </button>
  <button
    onClick={() => setShowAboutUs(true)}
    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
  >
    About Us
  </button>
</div>
```

**Step 2: Verify in browser**

Run: `npm run dev`
Expected: Desktop shows 4 navigation links in header, mobile shows only burger menu

**Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: add desktop navigation links to header"
```

---

## Task 2: Convert Burger Menu to History Panel

**Files:**
- Modify: `App.tsx` (lines ~1211-1335)

**Step 1: Replace burger menu navigation with history content**

Find the burger menu section (`{showBurgerMenu &&`) and replace the menu items section (lines ~1232-1305) with history content:

```tsx
{/* History Content */}
<div className="flex-1 overflow-y-auto p-4">
  <div className="mb-4">
    <h3 className="text-lg font-bold text-white mb-1">Meditation History</h3>
    <p className="text-xs text-slate-500">Your recent meditations</p>
  </div>

  {user ? (
    <>
      {isLoadingHistory ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500/30 border-t-indigo-500"></div>
        </div>
      ) : meditationHistory.length > 0 ? (
        <div className="space-y-2">
          {meditationHistory.slice(0, 10).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setScript(item.prompt);
                setShowBurgerMenu(false);
              }}
              className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
            >
              <p className="text-sm text-white truncate mb-1">{item.prompt}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                {item.voice_name && <span>{item.voice_name}</span>}
                <span>•</span>
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">No history yet</p>
          <p className="text-slate-600 text-xs mt-1">Create your first meditation</p>
        </div>
      )}
    </>
  ) : (
    <div className="text-center py-8">
      <p className="text-slate-400 text-sm mb-3">Sign in to view history</p>
      <button
        onClick={() => {
          setShowBurgerMenu(false);
          setShowAuthModal(true);
        }}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
      >
        Sign In
      </button>
    </div>
  )}
</div>
```

**Step 2: Update header title in burger menu**

Replace the logo section in burger menu header with "History" title:

```tsx
{/* Header */}
<div className="flex items-center justify-between p-4 border-b border-white/5">
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <span className="font-semibold text-white">History</span>
  </div>
  <button
    onClick={() => setShowBurgerMenu(false)}
    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
  >
    <ICONS.Close className="w-5 h-5" />
  </button>
</div>
```

**Step 3: Verify in browser**

Run: `npm run dev`
Expected: Burger menu now shows "History" title and meditation history list

**Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: convert burger menu to history panel"
```

---

## Task 3: Restructure Footer with Copyright

**Files:**
- Modify: `App.tsx` (burger menu footer section, lines ~1307-1332)

**Step 1: Update footer structure**

Replace the footer section in the burger menu with:

```tsx
{/* Footer */}
<div className="p-4 border-t border-white/5 space-y-2">
  <div className="flex items-center justify-center gap-4 text-[10px] text-slate-600 uppercase tracking-widest">
    <button
      onClick={() => {
        setShowBurgerMenu(false);
        setShowTerms(true);
      }}
      className="hover:text-slate-400 transition-colors"
    >
      Terms
    </button>
    <span className="text-slate-700">•</span>
    <button
      onClick={() => {
        setShowBurgerMenu(false);
        setShowPrivacy(true);
      }}
      className="hover:text-slate-400 transition-colors"
    >
      Privacy
    </button>
  </div>
  <a
    href="https://qualiasolutions.net"
    target="_blank"
    rel="noopener noreferrer"
    className="text-[10px] text-slate-600 hover:text-slate-400 text-center uppercase tracking-widest block transition-colors"
  >
    Powered by Qualia Solutions
  </a>
  <p className="text-[9px] text-slate-700 text-center">
    © {new Date().getFullYear()} INrVO. All rights reserved.
  </p>
</div>
```

**Step 2: Verify in browser**

Run: `npm run dev`
Expected: Footer shows Terms, Privacy, Powered by Qualia Solutions, and copyright in that order

**Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: restructure footer with copyright text"
```

---

## Task 4: Expand Music Categories in Constants

**Files:**
- Modify: `constants.tsx` (lines 164-181)

**Step 1: Update BackgroundTrack interface to include audioUrl**

```tsx
export interface BackgroundTrack {
  id: string;
  name: string;
  description: string;
  category: 'ambient' | 'nature' | 'binaural' | 'instrumental' | 'lofi' | 'classical';
  audioUrl?: string; // URL to audio file for playback
  previewUrl?: string; // For future use
}
```

**Step 2: Expand BACKGROUND_TRACKS with more categories**

Replace the existing BACKGROUND_TRACKS array with:

```tsx
export const BACKGROUND_TRACKS: BackgroundTrack[] = [
  // No Music Option
  { id: 'none', name: 'No Music', description: 'Voice only, no background', category: 'ambient' },

  // Nature Sounds
  { id: 'rain', name: 'Gentle Rain', description: 'Soft rainfall for deep relaxation', category: 'nature', audioUrl: '/audio/rain.mp3' },
  { id: 'ocean', name: 'Ocean Waves', description: 'Rhythmic waves on a peaceful shore', category: 'nature', audioUrl: '/audio/ocean.mp3' },
  { id: 'forest', name: 'Forest Ambience', description: 'Birds and rustling leaves', category: 'nature', audioUrl: '/audio/forest.mp3' },
  { id: 'thunderstorm', name: 'Distant Thunder', description: 'Rolling thunder with rain', category: 'nature', audioUrl: '/audio/thunder.mp3' },
  { id: 'creek', name: 'Babbling Creek', description: 'Gentle stream flowing', category: 'nature', audioUrl: '/audio/creek.mp3' },

  // Ambient
  { id: 'space', name: 'Cosmic Drift', description: 'Deep space ambient tones', category: 'ambient', audioUrl: '/audio/space.mp3' },
  { id: 'drone', name: 'Healing Drone', description: 'Continuous harmonic drone', category: 'ambient', audioUrl: '/audio/drone.mp3' },
  { id: 'meditation-bells', name: 'Temple Bells', description: 'Soft Tibetan singing bowls', category: 'ambient', audioUrl: '/audio/bells.mp3' },

  // Instrumental
  { id: 'piano', name: 'Soft Piano', description: 'Gentle piano melodies', category: 'instrumental', audioUrl: '/audio/piano.mp3' },
  { id: 'guitar', name: 'Acoustic Guitar', description: 'Soft fingerpicking patterns', category: 'instrumental', audioUrl: '/audio/guitar.mp3' },
  { id: 'strings', name: 'Ambient Strings', description: 'Ethereal string arrangements', category: 'instrumental', audioUrl: '/audio/strings.mp3' },

  // Binaural Beats
  { id: 'binaural-alpha', name: 'Alpha Waves', description: '10Hz for relaxation and creativity', category: 'binaural', audioUrl: '/audio/alpha.mp3' },
  { id: 'binaural-theta', name: 'Theta Waves', description: '6Hz for deep meditation', category: 'binaural', audioUrl: '/audio/theta.mp3' },
  { id: 'binaural-delta', name: 'Delta Waves', description: '2Hz for deep sleep', category: 'binaural', audioUrl: '/audio/delta.mp3' },

  // Lo-Fi (New Category)
  { id: 'lofi-chill', name: 'Lo-Fi Chill', description: 'Relaxing lo-fi hip hop beats', category: 'lofi', audioUrl: '/audio/lofi-chill.mp3' },
  { id: 'lofi-rain', name: 'Lo-Fi Rain', description: 'Lo-fi beats with rain ambience', category: 'lofi', audioUrl: '/audio/lofi-rain.mp3' },

  // Classical (New Category)
  { id: 'classical-calm', name: 'Calm Classical', description: 'Peaceful classical compositions', category: 'classical', audioUrl: '/audio/classical.mp3' },
  { id: 'classical-nocturne', name: 'Nocturne', description: 'Chopin-style piano nocturnes', category: 'classical', audioUrl: '/audio/nocturne.mp3' },
];
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add constants.tsx
git commit -m "feat: expand music categories with lofi and classical"
```

---

## Task 5: Update Music Modal UI for New Categories

**Files:**
- Modify: `App.tsx` (music modal section, lines ~1053-1180)

**Step 1: Create helper to group tracks by category**

Add this helper function near the top of the component (after state declarations):

```tsx
// Group tracks by category for music modal
const tracksByCategory = BACKGROUND_TRACKS.reduce((acc, track) => {
  if (!acc[track.category]) acc[track.category] = [];
  acc[track.category].push(track);
  return acc;
}, {} as Record<string, BackgroundTrack[]>);

const categoryConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  'ambient': { label: 'Ambient', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  'nature': { label: 'Nature', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  'binaural': { label: 'Binaural', color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
  'instrumental': { label: 'Instrumental', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  'lofi': { label: 'Lo-Fi', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  'classical': { label: 'Classical', color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
};
```

**Step 2: Replace music modal content**

Replace the music modal section with a category-based layout:

```tsx
{/* MODAL: Music Selector */}
{showMusicModal && (
  <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex flex-col p-4 md:p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto">
    <Background />
    <Starfield />

    <button
      onClick={() => setShowMusicModal(false)}
      className="fixed top-4 left-4 md:top-6 md:left-6 text-slate-600 hover:text-white transition-all flex items-center gap-3 group btn-press focus-ring rounded-full z-[100]"
    >
      <div className="w-10 h-10 md:w-12 md:h-12 min-w-[40px] min-h-[40px] rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
        <ICONS.ArrowBack className="w-4 h-4 md:w-5 md:h-5" />
      </div>
      <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.3em]">Back</span>
    </button>

    <div className="flex-1 flex flex-col items-center pt-16 md:pt-12 relative z-10 max-w-5xl mx-auto w-full">
      <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-4 md:mb-6">Background</div>
      <h2 className="text-2xl md:text-4xl font-extralight text-center mb-2 tracking-tight">
        <span className="bg-gradient-to-r from-emerald-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">Choose Music</span>
      </h2>
      <p className="text-slate-500 text-center mb-6 md:mb-8 text-sm">Select background audio for your meditation</p>

      <div className="w-full space-y-6">
        {Object.entries(tracksByCategory).map(([category, tracks]) => {
          const config = categoryConfig[category];
          return (
            <div key={category}>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${config.color}`}>
                {config.label}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                {tracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      setSelectedBackgroundTrack(track);
                      setShowMusicModal(false);
                    }}
                    className={`p-3 md:p-4 rounded-xl text-left transition-all ${
                      selectedBackgroundTrack.id === track.id
                        ? `${config.bgColor} border-2 border-current ${config.color}`
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ICONS.Music className={`w-4 h-4 ${selectedBackgroundTrack.id === track.id ? config.color : 'text-slate-500'}`} />
                      <span className={`font-medium text-sm truncate ${selectedBackgroundTrack.id === track.id ? 'text-white' : 'text-slate-300'}`}>
                        {track.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{track.description}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
)}
```

**Step 3: Verify in browser**

Run: `npm run dev`
Expected: Music modal shows all categories with expanded track list

**Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: update music modal UI for new categories"
```

---

## Task 6: Implement Background Music Playback

**Files:**
- Modify: `App.tsx` (audio playback section)

**Step 1: Add refs for background audio**

Add after the existing audio refs (around line 57-63):

```tsx
// Background music refs
const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
const backgroundGainRef = useRef<GainNode | null>(null);
const [backgroundVolume, setBackgroundVolume] = useState(0.3); // 30% default
```

**Step 2: Create background audio playback function**

Add this function after the audio utility functions:

```tsx
// Start background music
const startBackgroundMusic = async (track: BackgroundTrack) => {
  // Stop any existing background music
  stopBackgroundMusic();

  if (track.id === 'none' || !track.audioUrl) return;

  try {
    const audio = new Audio(track.audioUrl);
    audio.loop = true;
    audio.volume = backgroundVolume;
    backgroundAudioRef.current = audio;

    await audio.play();
  } catch (error) {
    console.error('Failed to play background music:', error);
  }
};

// Stop background music
const stopBackgroundMusic = () => {
  if (backgroundAudioRef.current) {
    backgroundAudioRef.current.pause();
    backgroundAudioRef.current.currentTime = 0;
    backgroundAudioRef.current = null;
  }
};

// Update background volume
const updateBackgroundVolume = (volume: number) => {
  setBackgroundVolume(volume);
  if (backgroundAudioRef.current) {
    backgroundAudioRef.current.volume = volume;
  }
};
```

**Step 3: Start background music in handleGenerateAndPlay**

In the `handleGenerateAndPlay` function, after `setCurrentView(View.PLAYER);`, add:

```tsx
// Start background music if selected
startBackgroundMusic(selectedBackgroundTrack);
```

**Step 4: Stop background music when exiting player**

Find where the player view is exited (back button handler), and add:

```tsx
stopBackgroundMusic();
```

Also add cleanup in the PLAYER view's back button onClick:

```tsx
onClick={() => {
  stopBackgroundMusic();
  if (audioSourceRef.current) {
    audioSourceRef.current.stop();
  }
  setIsPlaying(false);
  setCurrentView(View.HOME);
}}
```

**Step 5: Add cleanup on unmount**

Add to the existing useEffect cleanup or create new one:

```tsx
useEffect(() => {
  return () => {
    stopBackgroundMusic();
  };
}, []);
```

**Step 6: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add App.tsx
git commit -m "feat: implement background music playback during meditation"
```

---

## Task 7: Add Volume Control to Player View

**Files:**
- Modify: `App.tsx` (PLAYER view section)

**Step 1: Add volume slider to player controls**

In the PLAYER view, add a volume control for background music:

```tsx
{/* Background Music Volume Control */}
{selectedBackgroundTrack.id !== 'none' && (
  <div className="flex items-center gap-3 mt-4">
    <ICONS.Music className="w-4 h-4 text-slate-500" />
    <input
      type="range"
      min="0"
      max="1"
      step="0.1"
      value={backgroundVolume}
      onChange={(e) => updateBackgroundVolume(parseFloat(e.target.value))}
      className="w-32 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
    />
    <span className="text-xs text-slate-500 w-8">{Math.round(backgroundVolume * 100)}%</span>
  </div>
)}
```

**Step 2: Verify in browser**

Run: `npm run dev`
Expected: Volume slider appears in player when background music is selected

**Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: add background music volume control to player"
```

---

## Task 8: Create Placeholder Audio Files

**Files:**
- Create: `public/audio/` directory with placeholder files

**Step 1: Create audio directory structure**

Run: `mkdir -p public/audio`

**Step 2: Add a note about audio files**

Create `public/audio/README.md`:

```markdown
# Background Audio Files

Place MP3 audio files here with the following names:

## Nature
- rain.mp3
- ocean.mp3
- forest.mp3
- thunder.mp3
- creek.mp3

## Ambient
- space.mp3
- drone.mp3
- bells.mp3

## Instrumental
- piano.mp3
- guitar.mp3
- strings.mp3

## Binaural
- alpha.mp3
- theta.mp3
- delta.mp3

## Lo-Fi
- lofi-chill.mp3
- lofi-rain.mp3

## Classical
- classical.mp3
- nocturne.mp3

All files should be:
- Format: MP3
- Duration: 2-5 minutes (will loop)
- Quality: 128kbps minimum
```

**Step 3: Commit**

```bash
git add public/audio/
git commit -m "docs: add audio files readme with required filenames"
```

---

## Task 9: Run Build and Final Verification

**Files:**
- None (verification only)

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Test all features**

Run: `npm run dev`
Verify:
- Desktop: Header shows 4 navigation links
- Mobile: Burger menu shows history panel
- Footer shows Terms, Privacy, Powered by, Copyright
- Music modal shows all 6 categories
- Background music plays during meditation (when audio files are present)
- Volume control works in player

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete desktop header and music categories implementation"
```

---

## Summary

This plan implements:

1. **Desktop Header Navigation** - 4 navigation links (How It Works, Library, Pricing, About Us) visible only on desktop
2. **History Panel** - Burger menu converted to show meditation history instead of navigation
3. **Restructured Footer** - Terms, Privacy, Powered by Qualia Solutions, Copyright in proper order
4. **Expanded Music Categories** - Added Lo-Fi and Classical categories, expanded existing categories from 8 to 20 tracks
5. **Functional Background Music** - Web Audio API integration for actual audio playback during meditation
6. **Volume Control** - Slider to adjust background music volume in player view

All changes are responsive and follow the existing glass-morphism design system.
