import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ensureAudioContextResumed,
  getAudioContextClass,
  isIOSBrowser,
  requiresUserGestureForAudio,
} from '../../src/lib/iosAudioUtils';

describe('iosAudioUtils', () => {
  describe('getAudioContextClass', () => {
    it('should return AudioContext when available', () => {
      const AudioContextClass = getAudioContextClass();
      expect(AudioContextClass).toBeDefined();
    });

    it('should fall back to webkitAudioContext', () => {
      const originalAudioContext = window.AudioContext;
      // @ts-ignore
      delete window.AudioContext;

      const AudioContextClass = getAudioContextClass();
      expect(AudioContextClass).toBeDefined();

      // Restore
      // @ts-ignore
      window.AudioContext = originalAudioContext;
    });
  });

  describe('ensureAudioContextResumed', () => {
    let mockAudioContext: AudioContext;

    beforeEach(() => {
      mockAudioContext = new AudioContext();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should return false for null AudioContext', async () => {
      const result = await ensureAudioContextResumed(null);
      expect(result).toBe(false);
    });

    it('should return false for closed AudioContext', async () => {
      await mockAudioContext.close();
      const result = await ensureAudioContextResumed(mockAudioContext);
      expect(result).toBe(false);
    });

    it('should return true for already running AudioContext', async () => {
      // Default mock state is 'running'
      expect(mockAudioContext.state).toBe('running');
      const result = await ensureAudioContextResumed(mockAudioContext);
      expect(result).toBe(true);
    });

    it('should resume suspended AudioContext and return true', async () => {
      await mockAudioContext.suspend();
      expect(mockAudioContext.state).toBe('suspended');

      const result = await ensureAudioContextResumed(mockAudioContext);
      expect(result).toBe(true);
      expect(mockAudioContext.state).toBe('running');
    });

    it('should deduplicate concurrent resume calls', async () => {
      await mockAudioContext.suspend();
      const resumeSpy = vi.spyOn(mockAudioContext, 'resume');

      // Call multiple times concurrently
      const results = await Promise.all([
        ensureAudioContextResumed(mockAudioContext),
        ensureAudioContextResumed(mockAudioContext),
        ensureAudioContextResumed(mockAudioContext),
      ]);

      // All should return true
      expect(results).toEqual([true, true, true]);
      // But resume should only be called once
      expect(resumeSpy).toHaveBeenCalledTimes(1);
    });

    it('should return false if resume throws', async () => {
      await mockAudioContext.suspend();
      vi.spyOn(mockAudioContext, 'resume').mockRejectedValueOnce(
        new Error('User gesture required')
      );

      const result = await ensureAudioContextResumed(mockAudioContext);
      expect(result).toBe(false);
    });

    it('should handle sequential resume calls after first completes', async () => {
      await mockAudioContext.suspend();
      const resumeSpy = vi.spyOn(mockAudioContext, 'resume');

      // First call
      const result1 = await ensureAudioContextResumed(mockAudioContext);
      expect(result1).toBe(true);

      // Suspend again
      await mockAudioContext.suspend();

      // Second call (should trigger a new resume)
      const result2 = await ensureAudioContextResumed(mockAudioContext);
      expect(result2).toBe(true);

      // Resume should be called twice (once for each suspend)
      expect(resumeSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('isIOSBrowser', () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('should detect iPhone', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          maxTouchPoints: 5,
        },
        writable: true,
      });

      expect(isIOSBrowser()).toBe(true);
    });

    it('should detect iPad via userAgent', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          maxTouchPoints: 5,
        },
        writable: true,
      });

      expect(isIOSBrowser()).toBe(true);
    });

    it('should detect iPad via maxTouchPoints (iPadOS 13+)', () => {
      // iPadOS 13+ reports as Mac but has touch support
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
          maxTouchPoints: 5,
        },
        writable: true,
      });

      expect(isIOSBrowser()).toBe(true);
    });

    it('should return false for Android', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/112.0.0.0',
          maxTouchPoints: 5,
        },
        writable: true,
      });

      expect(isIOSBrowser()).toBe(false);
    });

    it('should return false for desktop Mac', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/112.0.0.0',
          maxTouchPoints: 0,
        },
        writable: true,
      });

      expect(isIOSBrowser()).toBe(false);
    });

    it('should return false for Windows', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/112.0.0.0',
          maxTouchPoints: 0,
        },
        writable: true,
      });

      expect(isIOSBrowser()).toBe(false);
    });

    it('should return false for SSR (no navigator)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
      });

      expect(isIOSBrowser()).toBe(false);
    });
  });

  describe('requiresUserGestureForAudio', () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('should return true for iOS', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          maxTouchPoints: 5,
        },
        writable: true,
      });

      expect(requiresUserGestureForAudio()).toBe(true);
    });

    it('should return true for Chrome on Android', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/112.0.0.0 Mobile Safari/537.36',
          maxTouchPoints: 5,
        },
        writable: true,
      });

      expect(requiresUserGestureForAudio()).toBe(true);
    });

    it('should return false for Firefox on Android', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/109.0 Firefox/112.0',
          maxTouchPoints: 5,
        },
        writable: true,
      });

      expect(requiresUserGestureForAudio()).toBe(false);
    });

    it('should return false for desktop browsers', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/112.0.0.0',
          maxTouchPoints: 0,
        },
        writable: true,
      });

      expect(requiresUserGestureForAudio()).toBe(false);
    });

    it('should return true for SSR (safe default)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
      });

      expect(requiresUserGestureForAudio()).toBe(true);
    });
  });
});
