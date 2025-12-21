import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface LegalModalContextValue {
  showPricing: boolean;
  showAboutUs: boolean;
  showTerms: boolean;
  showPrivacy: boolean;
  openPricing: () => void;
  closePricing: () => void;
  openAboutUs: () => void;
  closeAboutUs: () => void;
  openTerms: () => void;
  closeTerms: () => void;
  openPrivacy: () => void;
  closePrivacy: () => void;
  setShowPricing: (show: boolean) => void;
  setShowAboutUs: (show: boolean) => void;
  setShowTerms: (show: boolean) => void;
  setShowPrivacy: (show: boolean) => void;
}

const LegalModalContext = createContext<LegalModalContextValue | null>(null);

interface LegalModalProviderProps {
  children: ReactNode;
}

export function LegalModalProvider({ children }: LegalModalProviderProps) {
  const [showPricing, setShowPricing] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const openPricing = useCallback(() => setShowPricing(true), []);
  const closePricing = useCallback(() => setShowPricing(false), []);
  const openAboutUs = useCallback(() => setShowAboutUs(true), []);
  const closeAboutUs = useCallback(() => setShowAboutUs(false), []);
  const openTerms = useCallback(() => setShowTerms(true), []);
  const closeTerms = useCallback(() => setShowTerms(false), []);
  const openPrivacy = useCallback(() => setShowPrivacy(true), []);
  const closePrivacy = useCallback(() => setShowPrivacy(false), []);

  const value = useMemo<LegalModalContextValue>(() => ({
    showPricing,
    showAboutUs,
    showTerms,
    showPrivacy,
    openPricing,
    closePricing,
    openAboutUs,
    closeAboutUs,
    openTerms,
    closeTerms,
    openPrivacy,
    closePrivacy,
    setShowPricing,
    setShowAboutUs,
    setShowTerms,
    setShowPrivacy,
  }), [
    showPricing,
    showAboutUs,
    showTerms,
    showPrivacy,
    openPricing,
    closePricing,
    openAboutUs,
    closeAboutUs,
    openTerms,
    closeTerms,
    openPrivacy,
    closePrivacy,
  ]);

  return (
    <LegalModalContext.Provider value={value}>
      {children}
    </LegalModalContext.Provider>
  );
}

export function useLegalModals() {
  const context = useContext(LegalModalContext);
  if (!context) {
    throw new Error('useLegalModals must be used within LegalModalProvider');
  }
  return context;
}
