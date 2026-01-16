import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { VoiceProfile, CloningStatus, CreditInfo } from '../../types';
import { VOICE_PROFILES, BACKGROUND_TRACKS, BackgroundTrack, NATURE_SOUNDS, NatureSound } from '../../constants';
import { getCurrentUser, getUserVoiceProfiles, VoiceProfile as DBVoiceProfile, getMeditationHistoryPaginated, MeditationHistory, getAudioTagPreferences } from '../../lib/supabase';
import {
  getCachedVoiceProfiles,
  setCachedVoiceProfiles,
  clearVoiceProfileCache,
  addToCachedVoiceProfiles,
  updateCachedVoiceProfile,
  removeFromCachedVoiceProfiles,
} from '../lib/voiceProfileCache';
import { useAuth } from './AuthContext';
import { AudioPlaybackProvider } from './AudioPlaybackContext';

// Only log in development mode
const DEBUG = import.meta.env.DEV;

/**
 * AppContext - Core application state (voices, scripts, generation)
 *
 * PERFORMANCE NOTE: Audio playback state (isPlaying, currentTime, duration, etc.)
 * has been moved to AudioPlaybackContext to prevent high-frequency re-renders
 * during audio playback from affecting the entire app.
 *
 * Use useAudioPlayback() for playback-related state.
 */
interface AppContextType {
  // Auth (from AuthContext - kept for backward compatibility)
  user: ReturnType<typeof useAuth>['user'];

  // Voices
  availableVoices: VoiceProfile[];
  setAvailableVoices: (voices: VoiceProfile[]) => void;
  selectedVoice: VoiceProfile | null;
  setSelectedVoice: (voice: VoiceProfile | null) => void;
  savedVoices: DBVoiceProfile[];
  setSavedVoices: (voices: DBVoiceProfile[]) => void;

  // Cloning
  cloningStatus: CloningStatus;
  setCloningStatus: (status: CloningStatus) => void;
  creditInfo: CreditInfo;
  setCreditInfo: (info: CreditInfo) => void;

  // Audio track selection (not playback - that's in AudioPlaybackContext)
  selectedBackgroundTrack: BackgroundTrack;
  setSelectedBackgroundTrack: (track: BackgroundTrack) => void;
  selectedNatureSound: NatureSound;
  setSelectedNatureSound: (sound: NatureSound) => void;

  // Script
  script: string;
  setScript: (script: string) => void;
  enhancedScript: string;
  setEnhancedScript: (script: string) => void;
  editableScript: string;
  setEditableScript: (script: string) => void;

  // Audio tags
  selectedAudioTags: string[];
  setSelectedAudioTags: (tags: string[]) => void;
  audioTagsEnabled: boolean;
  setAudioTagsEnabled: (enabled: boolean) => void;
  favoriteAudioTags: string[];
  setFavoriteAudioTags: (tags: string[]) => void;

  // Library
  meditationHistory: MeditationHistory[];
  setMeditationHistory: (history: MeditationHistory[]) => void;
  isLoadingHistory: boolean;
  hasMoreHistory: boolean;
  loadMoreHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;

  // Generation state
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  generationStage: 'idle' | 'script' | 'voice' | 'ready';
  setGenerationStage: (stage: 'idle' | 'script' | 'voice' | 'ready') => void;

  // Chat state
  chatStarted: boolean;
  setChatStarted: (started: boolean) => void;
  restoredScript: string | null;
  setRestoredScript: (script: string | null) => void;

  // Error state
  micError: string | null;
  setMicError: (error: string | null) => void;

  // Helper functions
  loadUserVoices: (forceRefresh?: boolean) => Promise<void>;
  // Voice cache management
  invalidateVoiceCache: () => void;
  addVoiceToCache: (voice: DBVoiceProfile) => void;
  updateVoiceInCache: (id: string, updates: Partial<DBVoiceProfile>) => void;
  removeVoiceFromCache: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Get user and session state from AuthContext (single source of truth)
  const { user, isSessionReady } = useAuth();

  // Voice state
  const [availableVoices, setAvailableVoices] = useState<VoiceProfile[]>(VOICE_PROFILES);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile | null>(null);
  const [savedVoices, setSavedVoices] = useState<DBVoiceProfile[]>([]);

  // Cloning state
  const [cloningStatus, setCloningStatus] = useState<CloningStatus>({ state: 'idle' });
  // Credits are disabled - default to unlimited access for all users
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({
    canClone: true,
    creditsRemaining: 999999999,
    clonesRemaining: 999999,
    cloneCost: 0,
  });

  // Audio track selection (playback state moved to AudioPlaybackContext)
  const [selectedBackgroundTrack, setSelectedBackgroundTrack] = useState<BackgroundTrack>(BACKGROUND_TRACKS[0]);
  const [selectedNatureSound, setSelectedNatureSound] = useState<NatureSound>(NATURE_SOUNDS[0]);

  // Script state
  const [script, setScript] = useState('');
  const [enhancedScript, setEnhancedScript] = useState('');
  const [editableScript, setEditableScript] = useState('');

  // Audio tags state
  const [selectedAudioTags, setSelectedAudioTags] = useState<string[]>([]);
  const [audioTagsEnabled, setAudioTagsEnabled] = useState(false);
  const [favoriteAudioTags, setFavoriteAudioTags] = useState<string[]>([]);

  // Library state
  const [meditationHistory, setMeditationHistory] = useState<MeditationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // NOTE: Playback state (isPlaying, currentTime, duration, etc.) and audio refs
  // have been moved to AudioPlaybackContext for performance optimization.
  // This prevents high-frequency updates during playback from re-rendering the entire app.

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<'idle' | 'script' | 'voice' | 'ready'>('idle');

  // Chat state
  const [chatStarted, setChatStarted] = useState(false);
  const [restoredScript, setRestoredScript] = useState<string | null>(null);

  // Error state
  const [micError, setMicError] = useState<string | null>(null);

  // Load audio tag preferences
  const loadAudioTagPrefs = async () => {
    try {
      const prefs = await getAudioTagPreferences();
      setAudioTagsEnabled(prefs.enabled);
      setFavoriteAudioTags(prefs.favorite_tags || []);
    } catch (err) {
      console.warn('Failed to load audio tag preferences:', err);
    }
  };

  // Helper to transform DB voice profiles to UI voice profiles
  const transformVoicesToUI = useCallback((voices: DBVoiceProfile[]) => {
    const clonedVoiceProfiles = voices
      .filter(v => v.fish_audio_model_id || v.voice_sample_url || v.provider_voice_id || v.elevenlabs_voice_id)
      .map(v => {
        // Detect provider: ElevenLabs takes priority, then Fish Audio, then Chatterbox
        const provider = v.elevenlabs_voice_id ? 'elevenlabs' as const
          : v.fish_audio_model_id ? 'fish-audio' as const
          : 'chatterbox' as const;
        return {
          id: v.id,
          name: v.name,
          provider,
          voiceName: v.name,
          description: v.description || 'Your personalized voice clone',
          isCloned: true,
          providerVoiceId: v.provider_voice_id,
          fishAudioModelId: v.fish_audio_model_id,
          voiceSampleUrl: v.voice_sample_url,
          elevenLabsVoiceId: v.elevenlabs_voice_id,
        };
      });
    return [...VOICE_PROFILES, ...clonedVoiceProfiles];
  }, []);

  // Load user voices (with cache support)
  const loadUserVoices = useCallback(async (forceRefresh = false) => {
    try {
      const currentUser = await getCurrentUser();
      const userId = currentUser?.id;

      // Try cache first (unless force refresh)
      if (!forceRefresh && userId) {
        const cached = getCachedVoiceProfiles(userId);
        if (cached) {
          setSavedVoices(cached as DBVoiceProfile[]);
          setAvailableVoices(transformVoicesToUI(cached as DBVoiceProfile[]));
          return; // Cache hit - skip DB query
        }
      }

      // Cache miss or force refresh - fetch from DB
      const voices = await getUserVoiceProfiles();
      setSavedVoices(voices);
      setAvailableVoices(transformVoicesToUI(voices));

      // Update cache
      if (userId) {
        setCachedVoiceProfiles(userId, voices);
      }
    } catch (err) {
      console.error('Failed to load user voices:', err);
    }
  }, [transformVoicesToUI]);

  // Voice cache management functions
  const invalidateVoiceCache = useCallback(() => {
    clearVoiceProfileCache();
  }, []);

  const addVoiceToCache = useCallback(async (voice: DBVoiceProfile) => {
    const currentUser = await getCurrentUser();
    if (currentUser?.id) {
      addToCachedVoiceProfiles(currentUser.id, voice);
      // Also update local state immediately
      setSavedVoices(prev => {
        const newVoices = [voice, ...prev];
        // Update availableVoices with the new list
        setAvailableVoices(transformVoicesToUI(newVoices));
        return newVoices;
      });
    }
  }, [transformVoicesToUI]);

  const updateVoiceInCache = useCallback(async (id: string, updates: Partial<DBVoiceProfile>) => {
    const currentUser = await getCurrentUser();
    if (currentUser?.id) {
      updateCachedVoiceProfile(currentUser.id, id, updates);
      // Also update local state immediately
      setSavedVoices(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    }
  }, []);

  const removeVoiceFromCache = useCallback(async (id: string) => {
    const currentUser = await getCurrentUser();
    if (currentUser?.id) {
      removeFromCachedVoiceProfiles(currentUser.id, id);
      // Also update local state immediately
      setSavedVoices(prev => {
        const newVoices = prev.filter(v => v.id !== id);
        // Update availableVoices with the new list
        setAvailableVoices(transformVoicesToUI(newVoices));
        return newVoices;
      });
    }
  }, [transformVoicesToUI]);

  // Load meditation history
  const refreshHistory = useCallback(async () => {
    if (!user) return;

    setIsLoadingHistory(true);
    setHistoryPage(0);
    try {
      const result = await getMeditationHistoryPaginated(0, 20);
      setMeditationHistory(result.data);
      setHasMoreHistory(result.hasMore);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  // Load more history
  const loadMoreHistory = useCallback(async () => {
    if (isLoadingMore || !hasMoreHistory) return;

    setIsLoadingMore(true);
    try {
      const nextPage = historyPage + 1;
      const result = await getMeditationHistoryPaginated(nextPage, 20);
      setMeditationHistory(prev => [...prev, ...result.data]);
      setHistoryPage(nextPage);
      setHasMoreHistory(result.hasMore);
    } catch (err) {
      console.error('Failed to load more history:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [historyPage, hasMoreHistory, isLoadingMore]);

  // Load voices and preferences when session is ready (not just when user changes)
  // This ensures we have a valid access token before making DB requests
  useEffect(() => {
    if (user && isSessionReady) {
      DEBUG && console.log('[AppContext] Session ready, loading voices and prefs for:', user.id);
      Promise.all([loadUserVoices(), loadAudioTagPrefs()]).catch(console.error);
    }
  }, [user, isSessionReady, loadUserVoices]);

  // Memoize context value to prevent unnecessary re-renders
  // Only re-creates object when dependencies actually change
  // NOTE: Playback state removed - use useAudioPlayback() instead
  const value = useMemo<AppContextType>(() => ({
    user,
    availableVoices,
    setAvailableVoices,
    selectedVoice,
    setSelectedVoice,
    savedVoices,
    setSavedVoices,
    cloningStatus,
    setCloningStatus,
    creditInfo,
    setCreditInfo,
    selectedBackgroundTrack,
    setSelectedBackgroundTrack,
    selectedNatureSound,
    setSelectedNatureSound,
    script,
    setScript,
    enhancedScript,
    setEnhancedScript,
    editableScript,
    setEditableScript,
    selectedAudioTags,
    setSelectedAudioTags,
    audioTagsEnabled,
    setAudioTagsEnabled,
    favoriteAudioTags,
    setFavoriteAudioTags,
    meditationHistory,
    setMeditationHistory,
    isLoadingHistory,
    hasMoreHistory,
    loadMoreHistory,
    refreshHistory,
    isGenerating,
    setIsGenerating,
    generationStage,
    setGenerationStage,
    chatStarted,
    setChatStarted,
    restoredScript,
    setRestoredScript,
    micError,
    setMicError,
    loadUserVoices,
    invalidateVoiceCache,
    addVoiceToCache,
    updateVoiceInCache,
    removeVoiceFromCache,
  }), [
    user, availableVoices, selectedVoice, savedVoices,
    cloningStatus, creditInfo, selectedBackgroundTrack, selectedNatureSound,
    script, enhancedScript, editableScript,
    selectedAudioTags, audioTagsEnabled, favoriteAudioTags, meditationHistory,
    isLoadingHistory, hasMoreHistory, loadMoreHistory, refreshHistory,
    isGenerating, generationStage, chatStarted, restoredScript, micError, loadUserVoices,
    invalidateVoiceCache, addVoiceToCache, updateVoiceInCache, removeVoiceFromCache,
  ]);

  // Wrap with AudioPlaybackProvider to provide audio state
  return (
    <AppContext.Provider value={value}>
      <AudioPlaybackProvider>
        {children}
      </AudioPlaybackProvider>
    </AppContext.Provider>
  );
};

export default AppProvider;
