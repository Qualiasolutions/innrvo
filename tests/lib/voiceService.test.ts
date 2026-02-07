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
  generateSpeechStreaming: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
}));

// Import after mocking
import { voiceService, needsReclone } from '../../src/lib/voiceService';
import { isWebSpeechAvailable } from '../../src/lib/webSpeechService';

// Helper to create mock voice profiles
function createVoiceProfile(overrides: Partial<VoiceProfile> = {}): VoiceProfile {
  return {
    id: 'test-voice-id',
    name: 'Test Voice',
    voiceName: 'Test Voice',
    description: 'Test voice description',
    provider: 'elevenlabs',
    isCloned: false,
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

    it('should detect elevenlabs preset voices by id prefix', () => {
      const voice = createVoiceProfile({ id: 'elevenlabs-rachel' });
      expect(voiceService.detectProvider(voice)).toBe('elevenlabs');
    });

    it('should detect elevenlabs voices with elevenLabsVoiceId', () => {
      const voice = createVoiceProfile({
        id: 'custom-voice-id',
        elevenLabsVoiceId: 'xi-voice-123',
      });
      expect(voiceService.detectProvider(voice)).toBe('elevenlabs');
    });

    it('should fallback to browser for legacy fish-audio voices', () => {
      const voice = createVoiceProfile({
        provider: 'fish-audio' as any,
        elevenLabsVoiceId: undefined,
      });
      expect(voiceService.detectProvider(voice)).toBe('browser');
    });

    it('should fallback to browser for legacy chatterbox voices', () => {
      const voice = createVoiceProfile({
        provider: 'chatterbox' as any,
        elevenLabsVoiceId: undefined,
      });
      expect(voiceService.detectProvider(voice)).toBe('browser');
    });

    it('should detect elevenlabs for cloned voices with elevenLabsVoiceId', () => {
      const voice = createVoiceProfile({
        isCloned: true,
        elevenLabsVoiceId: 'xi-cloned-voice-123',
      });
      expect(voiceService.detectProvider(voice)).toBe('elevenlabs');
    });

    it('should fallback to browser for voices without proper setup', () => {
      const voice = createVoiceProfile({
        id: 'some-voice',
        provider: undefined,
        elevenLabsVoiceId: undefined,
        isCloned: false,
      });
      expect(voiceService.detectProvider(voice)).toBe('browser');
    });
  });

  describe('needsReclone', () => {
    it('should return true for fish-audio voices without elevenLabsVoiceId', () => {
      const voice = createVoiceProfile({
        provider: 'fish-audio' as any,
        elevenLabsVoiceId: undefined,
      });
      expect(needsReclone(voice)).toBe(true);
    });

    it('should return true for chatterbox voices without elevenLabsVoiceId', () => {
      const voice = createVoiceProfile({
        provider: 'chatterbox' as any,
        elevenLabsVoiceId: undefined,
      });
      expect(needsReclone(voice)).toBe(true);
    });

    it('should return true for voices with NEEDS_RECLONE status', () => {
      const voice = createVoiceProfile({
        cloningStatus: 'NEEDS_RECLONE',
      });
      expect(needsReclone(voice)).toBe(true);
    });

    it('should return true for cloned voices without elevenLabsVoiceId', () => {
      const voice = createVoiceProfile({
        isCloned: true,
        elevenLabsVoiceId: undefined,
      });
      expect(needsReclone(voice)).toBe(true);
    });

    it('should return false for fish-audio voices with elevenLabsVoiceId', () => {
      const voice = createVoiceProfile({
        provider: 'fish-audio' as any,
        elevenLabsVoiceId: 'xi-migrated-voice',
      });
      expect(needsReclone(voice)).toBe(false);
    });

    it('should return false for elevenlabs voices', () => {
      const voice = createVoiceProfile({
        provider: 'elevenlabs',
        elevenLabsVoiceId: 'xi-voice-123',
      });
      expect(needsReclone(voice)).toBe(false);
    });

    it('should return false for browser voices', () => {
      const voice = createVoiceProfile({
        id: 'browser-english-us',
        provider: 'browser',
      });
      expect(needsReclone(voice)).toBe(false);
    });
  });

  describe('isVoiceReady', () => {
    it('should check Web Speech availability for browser voices', async () => {
      const voice = createVoiceProfile({ id: 'browser-english-us' });
      const ready = await voiceService.isVoiceReady(voice);
      expect(typeof ready).toBe('boolean');
    });

    it('should return false for browser voices when Web Speech is unavailable', async () => {
      vi.mocked(isWebSpeechAvailable).mockReturnValue(false);
      const voice = createVoiceProfile({ id: 'browser-english-us' });
      const ready = await voiceService.isVoiceReady(voice);
      expect(ready).toBe(false);
    });

    it('should return true for elevenlabs voices with elevenLabsVoiceId', async () => {
      const voice = createVoiceProfile({
        provider: 'elevenlabs',
        elevenLabsVoiceId: 'xi-voice-123',
      });
      const ready = await voiceService.isVoiceReady(voice);
      expect(ready).toBe(true);
    });

    it('should return false for elevenlabs voices without elevenLabsVoiceId', async () => {
      const voice = createVoiceProfile({
        provider: 'elevenlabs',
        elevenLabsVoiceId: undefined,
      });
      const ready = await voiceService.isVoiceReady(voice);
      expect(ready).toBe(false);
    });

    it('should return false for voices that need recloning', async () => {
      const voice = createVoiceProfile({
        provider: 'fish-audio' as any,
        cloningStatus: 'NEEDS_RECLONE',
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
      expect(cost).toBe(300); // 300 per 1K chars for ElevenLabs
    });

    it('should round up for partial thousands', () => {
      const text = 'a'.repeat(1001);
      const cost = voiceService.getEstimatedCost(text, false);
      expect(cost).toBe(301); // Rounds up
    });

    it('should return 0 for empty text', () => {
      const cost = voiceService.getEstimatedCost('', false);
      expect(cost).toBe(0);
    });

    it('should calculate cost for typical meditation (2000 chars)', () => {
      const text = 'a'.repeat(2000);
      const cost = voiceService.getEstimatedCost(text, false);
      expect(cost).toBe(600);
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

// Test text routing via generateSpeech
// ElevenLabs now receives raw text (preprocessing happens server-side in Edge Function)
describe('Text Processing (via generateSpeech)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send raw text to ElevenLabs (preprocessing is server-side)', async () => {
    const { generateSpeechStreaming } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({
      provider: 'elevenlabs',
      elevenLabsVoiceId: 'xi-voice-123',
    });

    const rawText = '[pause] Hello [long pause] world';
    await voiceService.generateSpeech(rawText, voice);

    // Raw text should be sent as-is — Edge Function handles preprocessing
    expect(generateSpeechStreaming).toHaveBeenCalled();
    const callArg = vi.mocked(generateSpeechStreaming).mock.calls[0][1];
    expect(callArg).toBe(rawText);
  });

  it('should send raw text with audio tags to ElevenLabs', async () => {
    const { generateSpeechStreaming } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({
      provider: 'elevenlabs',
      elevenLabsVoiceId: 'xi-voice-123',
    });

    const rawText = '[deep breath] Relax. [exhale slowly] Now rest.';
    await voiceService.generateSpeech(rawText, voice);

    const callArg = vi.mocked(generateSpeechStreaming).mock.calls[0][1];
    // Raw text preserved — server handles conversion
    expect(callArg).toBe(rawText);
  });

  it('should send unknown tags to ElevenLabs as-is (server strips them)', async () => {
    const { generateSpeechStreaming } = await import('../../src/lib/edgeFunctions');
    const voice = createVoiceProfile({
      provider: 'elevenlabs',
      elevenLabsVoiceId: 'xi-voice-123',
    });

    const rawText = '[unknown tag] Hello [another one]';
    await voiceService.generateSpeech(rawText, voice);

    const callArg = vi.mocked(generateSpeechStreaming).mock.calls[0][1];
    expect(callArg).toBe(rawText);
  });

  it('should return needsReclone flag for legacy voices', async () => {
    const voice = createVoiceProfile({
      provider: 'fish-audio' as any,
      elevenLabsVoiceId: undefined,
    });

    const result = await voiceService.generateSpeech('Hello world', voice);

    expect(result.needsReclone).toBe(true);
    expect(result.audioBuffer).toBeNull();
    expect(result.base64).toBe('');
  });
});
