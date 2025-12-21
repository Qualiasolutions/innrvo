import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface NavigationModalContextValue {
  showBurgerMenu: boolean;
  showHowItWorks: boolean;
  showLibrary: boolean;
  showPromptMenu: boolean;
  openBurgerMenu: () => void;
  closeBurgerMenu: () => void;
  openHowItWorks: () => void;
  closeHowItWorks: () => void;
  openLibrary: () => void;
  closeLibrary: () => void;
  openPromptMenu: () => void;
  closePromptMenu: () => void;
  setShowBurgerMenu: (show: boolean) => void;
  setShowHowItWorks: (show: boolean) => void;
  setShowLibrary: (show: boolean) => void;
  setShowPromptMenu: (show: boolean) => void;
}

const NavigationModalContext = createContext<NavigationModalContextValue | null>(null);

interface NavigationModalProviderProps {
  children: ReactNode;
}

export function NavigationModalProvider({ children }: NavigationModalProviderProps) {
  const [showBurgerMenu, setShowBurgerMenu] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPromptMenu, setShowPromptMenu] = useState(false);

  const openBurgerMenu = useCallback(() => setShowBurgerMenu(true), []);
  const closeBurgerMenu = useCallback(() => setShowBurgerMenu(false), []);
  const openHowItWorks = useCallback(() => setShowHowItWorks(true), []);
  const closeHowItWorks = useCallback(() => setShowHowItWorks(false), []);
  const openLibrary = useCallback(() => setShowLibrary(true), []);
  const closeLibrary = useCallback(() => setShowLibrary(false), []);
  const openPromptMenu = useCallback(() => setShowPromptMenu(true), []);
  const closePromptMenu = useCallback(() => setShowPromptMenu(false), []);

  const value = useMemo<NavigationModalContextValue>(() => ({
    showBurgerMenu,
    showHowItWorks,
    showLibrary,
    showPromptMenu,
    openBurgerMenu,
    closeBurgerMenu,
    openHowItWorks,
    closeHowItWorks,
    openLibrary,
    closeLibrary,
    openPromptMenu,
    closePromptMenu,
    setShowBurgerMenu,
    setShowHowItWorks,
    setShowLibrary,
    setShowPromptMenu,
  }), [
    showBurgerMenu,
    showHowItWorks,
    showLibrary,
    showPromptMenu,
    openBurgerMenu,
    closeBurgerMenu,
    openHowItWorks,
    closeHowItWorks,
    openLibrary,
    closeLibrary,
    openPromptMenu,
    closePromptMenu,
  ]);

  return (
    <NavigationModalContext.Provider value={value}>
      {children}
    </NavigationModalContext.Provider>
  );
}

export function useNavigationModals() {
  const context = useContext(NavigationModalContext);
  if (!context) {
    throw new Error('useNavigationModals must be used within NavigationModalProvider');
  }
  return context;
}
