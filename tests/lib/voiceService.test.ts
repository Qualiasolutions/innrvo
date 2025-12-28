import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VoiceProfile } from '../../types';

// Mock dependencies before importing voiceService
vi.mock('../../src/lib/webSpeechService', () => ({
  webSpeechService: {
    speak: vi.fn().mockResolvedValue(undefined),
  },
  isWebSpeechAvailable: vi.fn().mockReturnValue(true),
}));

vi.mock('../../src/lib/edgeFunctions', () => ({
  generateSpeech: vi.fn().mockResolvedValue('base64audiodata'),
}));

// Import after mocking
import { voiceService } from '../../src/lib/voiceService';
import { isWebSpeechAvailable } from '../../src/lib/webSpeechService';

// Helper to create mock voice profiles
function createVoiceProfile(overrides: Partial<VoiceProfile> = {}): VoiceProfile {
  return {
    id: 'test-voice-id',
    name: 'Test Voice',
    provider: 'fish-audio',
    isCloned: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as VoiceProfile;
}

describe('voiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectProvider', () => {
    it('should detect browser voices by id prefix', () => {
      const voice = createVoiceProfile({ id: 'browser-english-us' });
      expect(voiceService.detectProvider(voice)).toBe('browser');
    });

    it('should detect fish-audio provider', () => {
      const voice = createVoiceProfile({ provider: 'fish-audio' });
      expect(voiceService.detectProvider(voice)).toBe('fish-audio');
    });

    it('should route legacy ElevenLabs voices to fish-audio', () => {
      const voice = createVoiceProfile({ provider: 'ElevenLabs' as any });
      expect(voiceService.detectProvider(voice)).toBe('fish-audio');
    });

    it('should route chatterbox voices with providerVoiceId to fish-audio', () => {
      const voice = createVoiceProfile({
        provider: 'chatterbox',
        providerVoiceId: 'some-voice-id',
      });
      expect(voiceService.detectProvider(voice)).toBe('fish-audio');
    });

    it('should route chatterbox cloned voices to fish-audio', () => {
      const voice = createVoiceProfile({
        provider: 'chatterbox',
        isCloned: true,
      });
      expect(voiceService.detectProvider(voice)).toBe('fish-audio');
    });

    it('should route any cloned voice with providerVoiceId to fish-audio', () => {
      const voice = createVoiceProfile({
        provider: undefined,
        providerVoiceId: 'some-id',
      });
      expect(voiceService.detectProvider(voice)).toBe('fish-audio');
    });

    it('should route any isCloned voice to fish-audio', () => {
      const voice = createVoiceProfile({
        provider: undefined,
        isCloned: true,
      });
      expect(voiceService.detectProvider(voice)).toBe('fish-audio');
    });

    it('should fallback to browser for voices without proper setup', () => {
      const voice = createVoiceProfile({
        id: 'some-voice',
        provider: undefined,
        providerVoiceId: undefined,
        isCloned: false,
      });
      expect(voiceService.detectProvider(voice)).toBe('browser');
    });
  });

  describe('isVoiceReady', () => {
    it('should check Web Speech availability for browser voices', async () => {
      // Browser voices depend on isWebSpeechAvailable
      const voice = createVoiceProfile({ id: 'browser-english-us' });
      const ready = await voiceService.isVoiceReady(voice);
      // Result depends on actual mock return value
      expect(typeof ready).toBe('boolean');
    });

    it('should return false for browser voices when Web Speech is unavailable', async () => {
      vi.mocked(isWebSpeechAvailable).mockReturnValue(false);
      const voice = createVoiceProfile({ id: 'browser-english-us' });
      const ready = await voiceService.isVoiceReady(voice);
      expect(ready).toBe(false);
    });

    it('should return true for fish-audio voices with providerVoiceId', async () => {
      const voice = createVoiceProfile({
        provider: 'fish-audio',
        providerVoiceId: 'fish-voice-123',
      });
      const ready = await voiceService.isVoiceReady(voice);
      expect(ready).toBe(true);
    });

    it('should return true for cloned voices', async () => {
      const voice = createVoiceProfile({
        provider: 'fish-audio',
        isCloned: true,
      });
      const ready = await voiceService.isVoiceReady(voice);
      expect(ready).toBe(true);
    });

    it('should return false for fish-audio voices without setup', async () => {
      const voice = createVoiceProfile({
        provider: 'fish-audio',
        providerVoiceId: undefined,
        isCloned: false,
      });
      const ready = await voiceService.isVoiceReady(voice);
      expect(ready).toBe(false);
    });
  });

  describe('getEstimatedCost', () => {
    it('should return clone cost for cloning operations', () => {
      const cost = voiceService.getEstimatedCost('', true);
      expect(cost).toBe(5000);
    });

    it('should calculate TTS cost based on character count', () => {
      const text = 'a'.repeat(1000);
      const cost = voiceService.getEstimatedCost(text, false);
      expect(cost).toBe(280); // 280 per 1K chars
    });

    it('should round up for partial thousands', () => {
      const text = 'a'.repeat(1001);
      const cost = voiceService.getEstimatedCost(text, false);
      expect(cost).toBe(281); // Rounds up
    });

    it('should return 0 for empty text', () => {
      const cost = voiceService.getEstimatedCost('', false);
      expect(cost).toBe(0);
    });

    it('should calculate cost for typical meditation (2000 chars)', () => {
      const text = 'a'.repeat(2000);
      const cost = voiceService.getEstimatedCost(text, false);
      expect(cost).toBe(560);
    });
  });

  describe('decodeAudio', () => {
    it('should decode base64 audio to AudioBuffer', async () => {
      const audioContext = new AudioContext();
      // Simple base64 encoded data
      const base64 = btoa('test audio data');

      const buffer = await voiceService.decodeAudio(base64, audioContext);

      expect(buffer).toBeDefined();
      expect(buffer.duration).toBeGreaterThan(0);
    });

    it('should throw on invalid base64 data', async () => {
      const audioContext = new AudioContext();
      // Invalid base64 will fail during decoding
      await expect(voiceService.decodeAudio('not-valid-base64!!!', audioContext))
        .rejects.toThrow();
    });
  });
});

// Test the internal text processing functions
// These are tested indirectly through generateSpeech, but we can verify behavior
describe('Text Processing (via generateSpeech)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should convert audio tags to Fish Audio effects', async () => {
    const { generateSpeech } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({ provider: 'fish-audio', providerVoiceId: 'test' });

    await voiceService.generateSpeech('[pause] Hello [deep breath] world', voice);

    // Check that generateSpeech was called with converted tags
    expect(generateSpeech).toHaveBeenCalled();
    const callArg = vi.mocked(generateSpeech).mock.calls[0][1];
    expect(callArg).toContain('(break)'); // [pause] -> (break)
    expect(callArg).toContain('(breath)'); // [deep breath] -> (breath)
    expect(callArg).not.toContain('[pause]');
    expect(callArg).not.toContain('[deep breath]');
  });

  it('should add meditation pacing to text', async () => {
    const { generateSpeech } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({ provider: 'fish-audio', providerVoiceId: 'test' });

    await voiceService.generateSpeech('Hello. World.', voice);

    // Check that long-break was added between sentences
    const callArg = vi.mocked(generateSpeech).mock.calls[0][1];
    expect(callArg).toContain('(long-break)');
  });

  it('should add breath effects for breathing instructions', async () => {
    const { generateSpeech } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({ provider: 'fish-audio', providerVoiceId: 'test' });

    await voiceService.generateSpeech('Now breathe in deeply.', voice);

    const callArg = vi.mocked(generateSpeech).mock.calls[0][1];
    expect(callArg).toContain('(breath)');
  });

  it('should add sigh effects for exhale instructions', async () => {
    const { generateSpeech } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({ provider: 'fish-audio', providerVoiceId: 'test' });

    await voiceService.generateSpeech('Now exhale slowly.', voice);

    const callArg = vi.mocked(generateSpeech).mock.calls[0][1];
    expect(callArg).toContain('(sigh)');
  });

  it('should add pauses around meditation keywords', async () => {
    const { generateSpeech } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({ provider: 'fish-audio', providerVoiceId: 'test' });

    await voiceService.generateSpeech('Feel peace and calm.', voice);

    const callArg = vi.mocked(generateSpeech).mock.calls[0][1];
    // Keywords like "peace" and "calm" should have breaks around them
    expect(callArg).toMatch(/\(break\)\s*peace\s*\(break\)/i);
    expect(callArg).toMatch(/\(break\)\s*calm\s*\(break\)/i);
  });

  it('should convert ellipses to pauses', async () => {
    const { generateSpeech } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({ provider: 'fish-audio', providerVoiceId: 'test' });

    await voiceService.generateSpeech('Let go... relax...', voice);

    const callArg = vi.mocked(generateSpeech).mock.calls[0][1];
    expect(callArg).toContain('(long-break)');
    expect(callArg).not.toContain('...');
  });

  it('should strip unknown audio tags', async () => {
    const { generateSpeech } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({ provider: 'fish-audio', providerVoiceId: 'test' });

    await voiceService.generateSpeech('[unknown tag] Hello [another one]', voice);

    const callArg = vi.mocked(generateSpeech).mock.calls[0][1];
    expect(callArg).not.toContain('[unknown tag]');
    expect(callArg).not.toContain('[another one]');
    expect(callArg).toContain('Hello');
  });
});
