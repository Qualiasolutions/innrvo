import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { supabase, getCurrentUser, getUserVoiceProfiles, VoiceProfile, getAudioTagPreferences } from '../../lib/supabase';

/**
 * Authentication context - manages user authentication state and voice profiles
 * Separated from AppContext to reduce re-renders for components
 * that only need auth state.
 */
interface AuthContextValue {
  // Auth state
  user: any;
  setUser: (user: any) => void;
  checkUser: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Voice profiles
  savedVoices: VoiceProfile[];
  setSavedVoices: (voices: VoiceProfile[]) => void;
  currentClonedVoice: VoiceProfile | null;
  setCurrentClonedVoice: (voice: VoiceProfile | null) => void;
  loadUserVoices: () => Promise<void>;
  isLoadingVoices: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Voice profile state
  const [savedVoices, setSavedVoices] = useState<VoiceProfile[]>([]);
  const [currentClonedVoice, setCurrentClonedVoice] = useState<VoiceProfile | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  // Check user auth status
  const checkUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to check user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load user's voice profiles
  const loadUserVoices = useCallback(async () => {
    if (!user) {
      setSavedVoices([]);
      return;
    }

    setIsLoadingVoices(true);
    try {
      const voices = await getUserVoiceProfiles();
      setSavedVoices(voices);
    } catch (error) {
      console.error('Failed to load voice profiles:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  }, [user]);

  // Set up auth listener
  useEffect(() => {
    checkUser();

    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Clear voice profiles on logout
      if (!session?.user) {
        setSavedVoices([]);
        setCurrentClonedVoice(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [checkUser]);

  // Load voice profiles when user changes
  useEffect(() => {
    if (user) {
      loadUserVoices();
    }
  }, [user, loadUserVoices]);

  // Memoize to prevent unnecessary re-renders
  const value = useMemo<AuthContextValue>(() => ({
    user,
    setUser,
    checkUser,
    isLoading,
    isAuthenticated: !!user,
    savedVoices,
    setSavedVoices,
    currentClonedVoice,
    setCurrentClonedVoice,
    loadUserVoices,
    isLoadingVoices,
  }), [user, checkUser, isLoading, savedVoices, currentClonedVoice, loadUserVoices, isLoadingVoices]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access authentication context
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
