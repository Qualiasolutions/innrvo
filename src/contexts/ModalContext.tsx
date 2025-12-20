import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

/**
 * All modal types in the application.
 * Using a union type for type-safe modal management.
 */
export type ModalType =
  | 'clone'
  | 'templates'
  | 'music'
  | 'audioTags'
  | 'burgerMenu'
  | 'howItWorks'
  | 'library'
  | 'pricing'
  | 'aboutUs'
  | 'terms'
  | 'privacy'
  | 'promptMenu'
  | 'auth'
  | 'voiceManager';

/**
 * Modal state interface - tracks which modals are open
 */
interface ModalState {
  clone: boolean;
  templates: boolean;
  music: boolean;
  audioTags: boolean;
  burgerMenu: boolean;
  howItWorks: boolean;
  library: boolean;
  pricing: boolean;
  aboutUs: boolean;
  terms: boolean;
  privacy: boolean;
  promptMenu: boolean;
  auth: boolean;
  voiceManager: boolean;
}

/**
 * Context value interface
 */
interface ModalContextValue {
  // State
  modals: ModalState;

  // Actions
  openModal: (modal: ModalType) => void;
  closeModal: (modal: ModalType) => void;
  toggleModal: (modal: ModalType) => void;
  closeAllModals: () => void;

  // Convenience getters (for backwards compatibility)
  showCloneModal: boolean;
  showTemplatesModal: boolean;
  showMusicModal: boolean;
  showAudioTagsModal: boolean;
  showBurgerMenu: boolean;
  showHowItWorks: boolean;
  showLibrary: boolean;
  showPricing: boolean;
  showAboutUs: boolean;
  showTerms: boolean;
  showPrivacy: boolean;
  showPromptMenu: boolean;
  showAuthModal: boolean;
  showVoiceManager: boolean;

  // Convenience setters (for backwards compatibility)
  setShowCloneModal: (show: boolean) => void;
  setShowTemplatesModal: (show: boolean) => void;
  setShowMusicModal: (show: boolean) => void;
  setShowAudioTagsModal: (show: boolean) => void;
  setShowBurgerMenu: (show: boolean) => void;
  setShowHowItWorks: (show: boolean) => void;
  setShowLibrary: (show: boolean) => void;
  setShowPricing: (show: boolean) => void;
  setShowAboutUs: (show: boolean) => void;
  setShowTerms: (show: boolean) => void;
  setShowPrivacy: (show: boolean) => void;
  setShowPromptMenu: (show: boolean) => void;
  setShowAuthModal: (show: boolean) => void;
  setShowVoiceManager: (show: boolean) => void;
}

// Initial state - all modals closed
const initialState: ModalState = {
  clone: false,
  templates: false,
  music: false,
  audioTags: false,
  burgerMenu: false,
  howItWorks: false,
  library: false,
  pricing: false,
  aboutUs: false,
  terms: false,
  privacy: false,
  promptMenu: false,
  auth: false,
  voiceManager: false,
};

// Create context with undefined default (will throw if used outside provider)
const ModalContext = createContext<ModalContextValue | undefined>(undefined);

/**
 * Modal Provider component - wraps the app to provide modal state
 */
export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modals, setModals] = useState<ModalState>(initialState);

  // Open a specific modal
  const openModal = useCallback((modal: ModalType) => {
    setModals(prev => ({ ...prev, [modal]: true }));
  }, []);

  // Close a specific modal
  const closeModal = useCallback((modal: ModalType) => {
    setModals(prev => ({ ...prev, [modal]: false }));
  }, []);

  // Toggle a specific modal
  const toggleModal = useCallback((modal: ModalType) => {
    setModals(prev => ({ ...prev, [modal]: !prev[modal] }));
  }, []);

  // Close all modals at once
  const closeAllModals = useCallback(() => {
    setModals(initialState);
  }, []);

  // Create setter functions for backwards compatibility
  const createSetter = useCallback((modal: ModalType) => {
    return (show: boolean) => {
      setModals(prev => ({ ...prev, [modal]: show }));
    };
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<ModalContextValue>(() => ({
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,

    // Convenience getters
    showCloneModal: modals.clone,
    showTemplatesModal: modals.templates,
    showMusicModal: modals.music,
    showAudioTagsModal: modals.audioTags,
    showBurgerMenu: modals.burgerMenu,
    showHowItWorks: modals.howItWorks,
    showLibrary: modals.library,
    showPricing: modals.pricing,
    showAboutUs: modals.aboutUs,
    showTerms: modals.terms,
    showPrivacy: modals.privacy,
    showPromptMenu: modals.promptMenu,
    showAuthModal: modals.auth,
    showVoiceManager: modals.voiceManager,

    // Convenience setters
    setShowCloneModal: createSetter('clone'),
    setShowTemplatesModal: createSetter('templates'),
    setShowMusicModal: createSetter('music'),
    setShowAudioTagsModal: createSetter('audioTags'),
    setShowBurgerMenu: createSetter('burgerMenu'),
    setShowHowItWorks: createSetter('howItWorks'),
    setShowLibrary: createSetter('library'),
    setShowPricing: createSetter('pricing'),
    setShowAboutUs: createSetter('aboutUs'),
    setShowTerms: createSetter('terms'),
    setShowPrivacy: createSetter('privacy'),
    setShowPromptMenu: createSetter('promptMenu'),
    setShowAuthModal: createSetter('auth'),
    setShowVoiceManager: createSetter('voiceManager'),
  }), [modals, openModal, closeModal, toggleModal, closeAllModals, createSetter]);

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

/**
 * Custom hook to access modal context
 * @throws Error if used outside of ModalProvider
 */
export const useModals = (): ModalContextValue => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
};

/**
 * Hook for checking if any modal is open
 * Useful for preventing background interactions
 */
export const useIsAnyModalOpen = (): boolean => {
  const { modals } = useModals();
  return Object.values(modals).some(Boolean);
};

export default ModalContext;
