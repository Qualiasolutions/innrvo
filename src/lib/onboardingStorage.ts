/**
 * Onboarding state persistence using localStorage
 */

const STORAGE_KEY = 'inrvo_onboarding';

interface OnboardingStorage {
  completed: boolean;
  skippedAt?: string;
  completedAt?: string;
  lastStepSeen?: number;
}

const DEFAULT_STATE: OnboardingStorage = {
  completed: false,
};

function getStorageState(): OnboardingStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    return JSON.parse(stored) as OnboardingStorage;
  } catch {
    return DEFAULT_STATE;
  }
}

function setStorageState(state: Partial<OnboardingStorage>): void {
  try {
    const current = getStorageState();
    const updated = { ...current, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable, silently fail
  }
}

/**
 * Check if onboarding should be shown to the user
 */
export function shouldShowOnboarding(): boolean {
  const state = getStorageState();
  return !state.completed;
}

/**
 * Mark onboarding as completed
 */
export function markOnboardingComplete(): void {
  setStorageState({
    completed: true,
    completedAt: new Date().toISOString(),
  });
}

/**
 * Mark onboarding as skipped
 */
export function markOnboardingSkipped(): void {
  setStorageState({
    completed: true,
    skippedAt: new Date().toISOString(),
  });
}

/**
 * Reset onboarding state (for restart tour)
 */
export function resetOnboarding(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

/**
 * Save the last step seen (for potential resume)
 */
export function saveLastStep(stepIndex: number): void {
  setStorageState({ lastStepSeen: stepIndex });
}

/**
 * Get the last step seen
 */
export function getLastStep(): number {
  return getStorageState().lastStepSeen ?? 0;
}
