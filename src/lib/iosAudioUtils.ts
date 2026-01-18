/**
 * iOS Audio Utilities
 *
 * Handles iOS Safari and Chrome-specific audio quirks:
 * - AudioContext starts suspended and requires user gesture to resume
 * - AudioContext can be suspended when app is backgrounded
 * - Missing await on resume() causes race conditions
 *
 * Usage:
 * 1. Call ensureAudioContextResumed() before any source.start()
 * 2. Use getAudioContextClass() for cross-browser AudioContext creation
 */

// Type declaration for legacy WebKit AudioContext
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/**
 * iOS requires a brief settling time after AudioContext.resume() before audio hardware
 * is fully ready. Without this delay, the first few milliseconds of audio may be cut off.
 * Tested on iOS 15-17 Safari and Chrome.
 */
const IOS_RESUME_SETTLE_MS = 10;

/**
 * Cache for pending resume operations to prevent race conditions.
 * Multiple rapid calls to ensureAudioContextResumed() will return the same promise
 * instead of initiating multiple concurrent resume operations.
 */
const pendingResumes = new WeakMap<AudioContext, Promise<boolean>>();

/**
 * Returns the AudioContext constructor for the current browser.
 * Handles the webkitAudioContext fallback for older iOS Safari versions.
 *
 * @returns The AudioContext class to use for instantiation
 *
 * @example
 * const AudioContextClass = getAudioContextClass();
 * const context = new AudioContextClass();
 */
export function getAudioContextClass(): typeof AudioContext {
  return window.AudioContext || window.webkitAudioContext!;
}

/**
 * Ensures AudioContext is resumed and ready for playback.
 * MUST be called before source.start() on iOS.
 *
 * This function is safe to call multiple times rapidly - it will deduplicate
 * concurrent resume operations using a WeakMap cache.
 *
 * @param audioContext - The AudioContext to resume
 * @returns Promise that resolves to true when AudioContext is running, false otherwise
 *
 * @example
 * // Before starting audio playback
 * await ensureAudioContextResumed(audioContextRef.current);
 * source.start();
 */
export async function ensureAudioContextResumed(
  audioContext: AudioContext | null
): Promise<boolean> {
  if (!audioContext) return false;

  // If closed, can't resume - caller needs to create a new one
  if (audioContext.state === 'closed') {
    console.warn('[iosAudioUtils] AudioContext is closed, cannot resume');
    return false;
  }

  // Already running, no action needed
  if (audioContext.state === 'running') {
    return true;
  }

  // Check for existing pending resume to prevent race conditions
  const pending = pendingResumes.get(audioContext);
  if (pending) {
    return pending;
  }

  // Create new resume promise
  const resumePromise = (async (): Promise<boolean> => {
    try {
      await audioContext.resume();
      // iOS requires settling time after resume for audio hardware readiness
      await new Promise(resolve => setTimeout(resolve, IOS_RESUME_SETTLE_MS));
      return audioContext.state === 'running';
    } catch (error) {
      console.warn('[iosAudioUtils] Failed to resume AudioContext:', error);
      return false;
    } finally {
      pendingResumes.delete(audioContext);
    }
  })();

  pendingResumes.set(audioContext, resumePromise);
  return resumePromise;
}

/**
 * Detects if the current browser is iOS Safari or Chrome.
 * Uses both User-Agent and maxTouchPoints to correctly identify iPadOS 13+
 * which reports as Mac in the User-Agent.
 *
 * @returns true if running on iOS/iPadOS
 */
export function isIOSBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  // Check for iOS/iPadOS - use userAgent and maxTouchPoints for iPad detection
  // iPadOS 13+ reports as Mac in UA but has touch support
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && navigator.maxTouchPoints > 1);

  return isIOS;
}

/**
 * Detects if the browser requires user gesture for audio playback.
 * Modern iOS Safari/Chrome and Chrome on Android have this restriction.
 *
 * @returns true if user gesture is required before audio can play
 */
export function requiresUserGestureForAudio(): boolean {
  if (typeof navigator === 'undefined') return true;

  // iOS always requires user gesture
  if (isIOSBrowser()) return true;

  // Chrome on Android may also require it
  const ua = navigator.userAgent;
  if (/Android/.test(ua) && /Chrome/.test(ua)) return true;

  return false;
}
