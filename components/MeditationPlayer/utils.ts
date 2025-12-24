import { saveMeditationHistory } from '../../lib/supabase';

/**
 * Data required to save a meditation to history
 */
export interface MeditationSaveData {
  script?: string;
  voiceId?: string;
  voiceName?: string;
  meditationType?: string;
  audioUrl?: string;
  duration?: number;
  backgroundTrackId?: string;
  backgroundTrackName?: string;
  audioTagsUsed?: string[];
  audioBase64?: string;
}

/**
 * Save meditation to user's history in Supabase
 * Uses the existing saveMeditationHistory function which handles user auth internally
 */
export async function saveMeditationToHistory(data: MeditationSaveData): Promise<boolean> {
  try {
    const result = await saveMeditationHistory(
      data.meditationType || 'custom meditation', // prompt
      data.script, // enhancedScript
      data.voiceId, // voiceId
      data.voiceName, // voiceName
      data.backgroundTrackId, // backgroundTrackId
      data.backgroundTrackName, // backgroundTrackName
      data.duration, // durationSeconds
      data.audioTagsUsed, // audioTagsUsed
      data.audioBase64 // audioBase64
    );

    return !!result;
  } catch (error) {
    console.error('Failed to save meditation to history:', error);
    return false;
  }
}
