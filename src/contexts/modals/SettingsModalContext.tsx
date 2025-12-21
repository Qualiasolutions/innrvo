import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface SettingsModalContextValue {
  showMusicModal: boolean;
  showAudioTagsModal: boolean;
  showTemplatesModal: boolean;
  openMusicModal: () => void;
  closeMusicModal: () => void;
  openAudioTagsModal: () => void;
  closeAudioTagsModal: () => void;
  openTemplatesModal: () => void;
  closeTemplatesModal: () => void;
  setShowMusicModal: (show: boolean) => void;
  setShowAudioTagsModal: (show: boolean) => void;
  setShowTemplatesModal: (show: boolean) => void;
}

const SettingsModalContext = createContext<SettingsModalContextValue | null>(null);

interface SettingsModalProviderProps {
  children: ReactNode;
}

export function SettingsModalProvider({ children }: SettingsModalProviderProps) {
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showAudioTagsModal, setShowAudioTagsModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  const openMusicModal = useCallback(() => setShowMusicModal(true), []);
  const closeMusicModal = useCallback(() => setShowMusicModal(false), []);
  const openAudioTagsModal = useCallback(() => setShowAudioTagsModal(true), []);
  const closeAudioTagsModal = useCallback(() => setShowAudioTagsModal(false), []);
  const openTemplatesModal = useCallback(() => setShowTemplatesModal(true), []);
  const closeTemplatesModal = useCallback(() => setShowTemplatesModal(false), []);

  const value = useMemo<SettingsModalContextValue>(() => ({
    showMusicModal,
    showAudioTagsModal,
    showTemplatesModal,
    openMusicModal,
    closeMusicModal,
    openAudioTagsModal,
    closeAudioTagsModal,
    openTemplatesModal,
    closeTemplatesModal,
    setShowMusicModal,
    setShowAudioTagsModal,
    setShowTemplatesModal,
  }), [
    showMusicModal,
    showAudioTagsModal,
    showTemplatesModal,
    openMusicModal,
    closeMusicModal,
    openAudioTagsModal,
    closeAudioTagsModal,
    openTemplatesModal,
    closeTemplatesModal,
  ]);

  return (
    <SettingsModalContext.Provider value={value}>
      {children}
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModals() {
  const context = useContext(SettingsModalContext);
  if (!context) {
    throw new Error('useSettingsModals must be used within SettingsModalProvider');
  }
  return context;
}
