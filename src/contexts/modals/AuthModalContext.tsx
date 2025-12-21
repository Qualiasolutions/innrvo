import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface AuthModalContextValue {
  showAuthModal: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  setShowAuthModal: (show: boolean) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

interface AuthModalProviderProps {
  children: ReactNode;
}

export function AuthModalProvider({ children }: AuthModalProviderProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const openAuthModal = useCallback(() => setShowAuthModal(true), []);
  const closeAuthModal = useCallback(() => setShowAuthModal(false), []);

  const value = useMemo<AuthModalContextValue>(() => ({
    showAuthModal,
    openAuthModal,
    closeAuthModal,
    setShowAuthModal,
  }), [showAuthModal, openAuthModal, closeAuthModal]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return context;
}
