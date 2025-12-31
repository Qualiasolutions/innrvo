import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, ReactNode } from 'react';
import {
  shouldShowOnboarding,
  markOnboardingComplete,
  markOnboardingSkipped,
  resetOnboarding,
  saveLastStep,
} from '../lib/onboardingStorage';
import { ONBOARDING_STEPS, type OnboardingStep } from '../components/Onboarding/steps';

/**
 * Onboarding state management context
 * Manages the onboarding flow, step navigation, and persistence
 */

interface OnboardingContextValue {
  // State
  isActive: boolean;
  currentStepIndex: number;
  currentStep: OnboardingStep | null;
  totalSteps: number;
  targetRoute: string | null;

  // Actions
  startOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  restartOnboarding: () => void;
  clearTargetRoute: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRoute, setTargetRoute] = useState<string | null>(null);

  // Use ref to track timer for cleanup
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-start onboarding after delay for first-time users
  useEffect(() => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Check if user should see onboarding (only on first visit)
    if (shouldShowOnboarding()) {
      // Delay 2s before showing welcome
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setIsActive(true);
      }, 2000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const currentStep = useMemo(() => {
    return ONBOARDING_STEPS[currentStepIndex] ?? null;
  }, [currentStepIndex]);

  const startOnboarding = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);

    // Navigate to first step's route if specified
    const firstStep = ONBOARDING_STEPS[0];
    if (firstStep?.route) {
      setTargetRoute(firstStep.route);
    }
  }, []);

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;

    if (nextIndex >= ONBOARDING_STEPS.length) {
      // Completed all steps
      markOnboardingComplete();
      setIsActive(false);
      setCurrentStepIndex(0);
      return;
    }

    setCurrentStepIndex(nextIndex);
    saveLastStep(nextIndex);

    // Navigate to next step's route if different from current
    const nextStepData = ONBOARDING_STEPS[nextIndex];
    const currentStepData = ONBOARDING_STEPS[currentStepIndex];

    if (nextStepData?.route && nextStepData.route !== currentStepData?.route) {
      setTargetRoute(nextStepData.route);
    }
  }, [currentStepIndex]);

  const prevStep = useCallback(() => {
    if (currentStepIndex <= 0) return;

    const prevIndex = currentStepIndex - 1;
    setCurrentStepIndex(prevIndex);
    saveLastStep(prevIndex);

    // Navigate to previous step's route if different
    const prevStepData = ONBOARDING_STEPS[prevIndex];
    const currentStepData = ONBOARDING_STEPS[currentStepIndex];

    if (prevStepData?.route && prevStepData.route !== currentStepData?.route) {
      setTargetRoute(prevStepData.route);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback((index: number) => {
    if (index < 0 || index >= ONBOARDING_STEPS.length) return;

    setCurrentStepIndex(index);
    saveLastStep(index);

    // Navigate to step's route
    const stepData = ONBOARDING_STEPS[index];
    if (stepData?.route) {
      setTargetRoute(stepData.route);
    }
  }, []);

  const skipOnboarding = useCallback(() => {
    markOnboardingSkipped();
    setIsActive(false);
    setCurrentStepIndex(0);
    setTargetRoute('/'); // Return to home
  }, []);

  const completeOnboarding = useCallback(() => {
    markOnboardingComplete();
    setIsActive(false);
    setCurrentStepIndex(0);
  }, []);

  const restartOnboarding = useCallback(() => {
    resetOnboarding();
    setCurrentStepIndex(0);
    setIsActive(true);

    // Navigate to first step's route
    const firstStep = ONBOARDING_STEPS[0];
    if (firstStep?.route) {
      setTargetRoute(firstStep.route);
    }
  }, []);

  const clearTargetRoute = useCallback(() => {
    setTargetRoute(null);
  }, []);

  const value = useMemo<OnboardingContextValue>(() => ({
    isActive,
    currentStepIndex,
    currentStep,
    totalSteps: ONBOARDING_STEPS.length,
    targetRoute,
    startOnboarding,
    nextStep,
    prevStep,
    goToStep,
    skipOnboarding,
    completeOnboarding,
    restartOnboarding,
    clearTargetRoute,
  }), [
    isActive,
    currentStepIndex,
    currentStep,
    targetRoute,
    startOnboarding,
    nextStep,
    prevStep,
    goToStep,
    skipOnboarding,
    completeOnboarding,
    restartOnboarding,
    clearTargetRoute,
  ]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

/**
 * Hook to access onboarding context
 */
export const useOnboarding = (): OnboardingContextValue => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export default OnboardingContext;
