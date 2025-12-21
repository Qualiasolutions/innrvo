import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface CloneModalContextValue {
  showCloneModal: boolean;
  showVoiceManager: boolean;
  openCloneModal: () => void;
  closeCloneModal: () => void;
  openVoiceManager: () => void;
  closeVoiceManager: () => void;
  setShowCloneModal: (show: boolean) => void;
  setShowVoiceManager: (show: boolean) => void;
}

const CloneModalContext = createContext<CloneModalContextValue | null>(null);

interface CloneModalProviderProps {
  children: ReactNode;
}

export function CloneModalProvider({ children }: CloneModalProviderProps) {
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showVoiceManager, setShowVoiceManager] = useState(false);

  const openCloneModal = useCallback(() => setShowCloneModal(true), []);
  const closeCloneModal = useCallback(() => setShowCloneModal(false), []);
  const openVoiceManager = useCallback(() => setShowVoiceManager(true), []);
  const closeVoiceManager = useCallback(() => setShowVoiceManager(false), []);

  const value = useMemo<CloneModalContextValue>(() => ({
    showCloneModal,
    showVoiceManager,
    openCloneModal,
    closeCloneModal,
    openVoiceManager,
    closeVoiceManager,
    setShowCloneModal,
    setShowVoiceManager,
  }), [showCloneModal, showVoiceManager, openCloneModal, closeCloneModal, openVoiceManager, closeVoiceManager]);

  return (
    <CloneModalContext.Provider value={value}>
      {children}
    </CloneModalContext.Provider>
  );
}

export function useCloneModals() {
  const context = useContext(CloneModalContext);
  if (!context) {
    throw new Error('useCloneModals must be used within CloneModalProvider');
  }
  return context;
}
