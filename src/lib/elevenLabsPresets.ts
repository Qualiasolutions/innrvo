import { VoiceProfile } from '../../types';

/**
 * ElevenLabs Preset Voices
 *
 * These are pre-configured ElevenLabs voices available to all users.
 * They provide high-quality TTS without requiring voice cloning.
 *
 * Voice IDs are from ElevenLabs' public voice library.
 */

export const ELEVENLABS_PRESET_VOICES: VoiceProfile[] = [
  {
    id: 'elevenlabs-rachel',
    name: 'Rachel',
    provider: 'elevenlabs',
    voiceName: 'Rachel',
    description: 'Calm and warm voice, perfect for relaxation',
    isCloned: false,
    elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL',
  },
  {
    id: 'elevenlabs-adam',
    name: 'Adam',
    provider: 'elevenlabs',
    voiceName: 'Adam',
    description: 'Deep and resonant voice for grounding meditations',
    isCloned: false,
    elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB',
  },
  {
    id: 'elevenlabs-bella',
    name: 'Bella',
    provider: 'elevenlabs',
    voiceName: 'Bella',
    description: 'Soft and soothing voice for sleep meditations',
    isCloned: false,
    elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Using Rachel for now
  },
  {
    id: 'elevenlabs-domi',
    name: 'Domi',
    provider: 'elevenlabs',
    voiceName: 'Domi',
    description: 'Strong and confident voice for affirmations',
    isCloned: false,
    elevenLabsVoiceId: 'AZnzlk1XvdvUeBnXmlld',
  },
  {
    id: 'elevenlabs-elli',
    name: 'Elli',
    provider: 'elevenlabs',
    voiceName: 'Elli',
    description: 'Youthful and energetic voice for motivation',
    isCloned: false,
    elevenLabsVoiceId: 'MF3mGyEYCl7XYWbV9V6O',
  },
  {
    id: 'elevenlabs-josh',
    name: 'Josh',
    provider: 'elevenlabs',
    voiceName: 'Josh',
    description: 'Deep and wise voice for guided journeys',
    isCloned: false,
    elevenLabsVoiceId: 'TxGEqnHWrfWFTfGW9XjX',
  },
];

/**
 * Get a preset voice by ID
 */
export function getPresetVoice(id: string): VoiceProfile | undefined {
  return ELEVENLABS_PRESET_VOICES.find(v => v.id === id);
}

/**
 * Check if a voice ID is a preset voice
 */
export function isPresetVoice(voiceId: string): boolean {
  return voiceId.startsWith('elevenlabs-');
}

/**
 * Get the ElevenLabs voice ID for a preset
 */
export function getPresetElevenLabsId(voiceId: string): string | undefined {
  const preset = getPresetVoice(voiceId);
  return preset?.elevenLabsVoiceId;
}
