# Prompt Menu Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 4 individual buttons (Clone Voice, Templates, Music, Microphone) in the chat prompt window with a single "+" button that opens a radial/popup menu containing all those options.

**Architecture:** Add a new menu state to App.tsx, create a popup menu component that appears above the "+" button when clicked, containing the 4 existing action buttons in a clean grid or radial layout.

**Tech Stack:** React, Tailwind CSS, existing glass-morphism styling patterns

---

## Current State

**File:** `App.tsx` lines 847-887

Currently has 4 buttons inline:
1. Clone Voice (Waveform icon) → `setShowCloneModal(true)`
2. Templates (Sparkle icon) → `setShowTemplatesModal(true)`
3. Music (Music icon) → `setShowMusicModal(true)`
4. Microphone (Mic icon) → Start/Stop recording

---

### Task 1: Add Menu State

**Files:**
- Modify: `App.tsx:140-150` (state declarations area)

**Step 1: Add the menu open state**

Add after the existing modal states (around line 147):

```tsx
const [showPromptMenu, setShowPromptMenu] = useState(false);
```

**Step 2: Commit**

```bash
git add App.tsx
git commit -m "feat: add showPromptMenu state for prompt action menu"
```

---

### Task 2: Create the Plus Button

**Files:**
- Modify: `App.tsx:847-887` (button area)
- Modify: `constants.tsx` (add Plus icon if needed)

**Step 1: Add Plus icon to constants.tsx**

Add to the ICONS object (around line 380):

```tsx
Plus: (
  <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
),
```

**Step 2: Commit**

```bash
git add constants.tsx
git commit -m "feat: add Plus icon to ICONS"
```

---

### Task 3: Replace 4 Buttons with Plus Button and Menu

**Files:**
- Modify: `App.tsx:847-887`

**Step 1: Replace the 4 buttons with the Plus button and popup menu**

Replace lines 847-887 with:

```tsx
{/* Plus Menu Button */}
<div className="relative">
  <button
    onClick={() => setShowPromptMenu(!showPromptMenu)}
    className={`p-2.5 md:p-3 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] rounded-xl md:rounded-2xl transition-all btn-press focus-ring flex items-center justify-center ${
      showPromptMenu
        ? 'bg-indigo-500/20 text-indigo-400 rotate-45'
        : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
    }`}
    title="Open menu"
  >
    {ICONS.Plus}
  </button>

  {/* Popup Menu */}
  {showPromptMenu && (
    <>
      {/* Backdrop to close menu */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => setShowPromptMenu(false)}
      />

      {/* Menu Container */}
      <div className="absolute bottom-full left-0 mb-3 z-50 glass rounded-2xl p-2 border border-white/10 shadow-xl shadow-black/20 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="grid grid-cols-2 gap-2">
          {/* Clone Voice */}
          <button
            onClick={() => {
              setShowCloneModal(true);
              setShowPromptMenu(false);
            }}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-indigo-400 transition-all btn-press focus-ring flex flex-col items-center gap-1.5"
            title="Clone your voice"
          >
            <span className="w-5 h-5">{ICONS.Waveform}</span>
            <span className="text-[10px] font-medium">Clone</span>
          </button>

          {/* Templates */}
          <button
            onClick={() => {
              setShowTemplatesModal(true);
              setShowPromptMenu(false);
            }}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-purple-400 transition-all btn-press focus-ring flex flex-col items-center gap-1.5"
            title="Browse templates"
          >
            <span className="w-5 h-5">{ICONS.Sparkle}</span>
            <span className="text-[10px] font-medium">Templates</span>
          </button>

          {/* Music */}
          <button
            onClick={() => {
              setShowMusicModal(true);
              setShowPromptMenu(false);
            }}
            className={`p-3 rounded-xl transition-all btn-press focus-ring flex flex-col items-center gap-1.5 ${
              selectedBackgroundTrack.id !== 'none'
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-400'
            }`}
            title={`Background: ${selectedBackgroundTrack.name}`}
          >
            <span className="w-5 h-5">{ICONS.Music}</span>
            <span className="text-[10px] font-medium">Music</span>
          </button>

          {/* Microphone */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              startRecording();
              setShowPromptMenu(false);
            }}
            onMouseUp={stopRecording}
            onTouchStart={(e) => {
              e.preventDefault();
              startRecording();
              setShowPromptMenu(false);
            }}
            onTouchEnd={stopRecording}
            className={`p-3 rounded-xl transition-all btn-press focus-ring flex flex-col items-center gap-1.5 ${
              isRecording
                ? 'bg-rose-500 text-white scale-105 shadow-rose-500/40'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
            title="Hold to speak"
          >
            <span className="w-5 h-5">{ICONS.Microphone}</span>
            <span className="text-[10px] font-medium">Speak</span>
          </button>
        </div>
      </div>
    </>
  )}
</div>
```

**Step 2: Commit**

```bash
git add App.tsx
git commit -m "feat: replace 4 buttons with plus menu in prompt window"
```

---

### Task 4: Add CSS Animation Classes

**Files:**
- Modify: `index.css`

**Step 1: Add slide-in animation if not present**

Add to index.css:

```css
/* Menu animations */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in-from-bottom {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.animate-in {
  animation-duration: 200ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  animation-fill-mode: forwards;
}

.fade-in {
  animation-name: fade-in;
}

.slide-in-from-bottom-2 {
  animation-name: slide-in-from-bottom;
}
```

**Step 2: Commit**

```bash
git add index.css
git commit -m "feat: add menu popup animation classes"
```

---

### Task 5: Handle Click Outside to Close Menu

**Files:**
- Modify: `App.tsx`

**Step 1: The backdrop div already handles this**

The backdrop `<div className="fixed inset-0 z-40" onClick={() => setShowPromptMenu(false)} />` handles closing when clicking outside.

**Step 2: Close menu when Escape is pressed (optional enhancement)**

Add useEffect after state declarations:

```tsx
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showPromptMenu) {
      setShowPromptMenu(false);
    }
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [showPromptMenu]);
```

**Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: add Escape key handler to close prompt menu"
```

---

### Task 6: Test the Implementation

**Step 1: Run the dev server**

```bash
npm run dev
```

**Step 2: Test the following**

- [ ] Plus button appears in place of the 4 buttons
- [ ] Clicking Plus button opens the menu
- [ ] Plus button rotates 45° when menu is open (becomes X)
- [ ] Menu appears above the button with animation
- [ ] Clicking Clone opens clone modal and closes menu
- [ ] Clicking Templates opens templates modal and closes menu
- [ ] Clicking Music opens music modal and closes menu
- [ ] Music button shows emerald highlight when track is selected
- [ ] Hold Microphone to record, release to stop
- [ ] Clicking outside menu closes it
- [ ] Pressing Escape closes menu
- [ ] Menu works on mobile (touch events)

**Step 3: Commit final state**

```bash
git add -A
git commit -m "feat: complete prompt menu button implementation"
```

---

## Summary

This plan consolidates 4 action buttons into a single "+" button with a popup menu, reducing visual clutter in the prompt window while maintaining all functionality. The menu uses existing glass-morphism styling and adds smooth animation for a polished feel.

**Key Files Modified:**
- `App.tsx` - State, button replacement, menu JSX
- `constants.tsx` - Plus icon
- `index.css` - Animation classes
