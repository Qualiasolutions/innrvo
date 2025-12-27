import { useState, useEffect, useCallback, useRef } from 'react';
import { MarketingHubData } from '../types';
import { initialMarketingData, generateId } from '../data/initialData';

const STORAGE_KEY = 'inrvo-marketing-hub';
const DEBOUNCE_MS = 500;

export interface UseMarketingDataReturn {
  data: MarketingHubData;
  updateData: (path: string, value: unknown) => void;
  setData: (data: MarketingHubData) => void;
  resetData: () => void;
  isSaving: boolean;
  lastSaved: Date | null;
  progress: {
    overall: number;
    phase1: number;
    phase2: number;
    phase3: number;
  };
}

// Helper to set a nested value by path
function setNestedValue<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const result = JSON.parse(JSON.stringify(obj)) as T;
  let current: unknown = result;

  for (let i = 0; i < keys.length - 1; i++) {
    current = (current as Record<string, unknown>)[keys[i]];
  }

  (current as Record<string, unknown>)[keys[keys.length - 1]] = value;
  return result;
}

// Calculate progress percentages
function calculateProgress(data: MarketingHubData) {
  // Phase 1 progress
  const phase1Items = [
    data.phase1.positioning.primaryValuePropDefined,
    data.phase1.positioning.competitorDifferentiationClear,
    data.phase1.positioning.personaMessagingComplete,
    data.phase1.conversion.landingPageComplete,
    data.phase1.conversion.emailCaptureComplete,
    data.phase1.conversion.welcomeSequenceComplete,
    data.phase1.conversion.analyticsComplete,
    data.phase1.content.seoContentPlanComplete,
    data.phase1.content.heroSocialContentComplete,
  ];
  const phase1 = Math.round((phase1Items.filter(Boolean).length / phase1Items.length) * 100);

  // Phase 2 progress (based on having content)
  const phase2Items = [
    data.phase2.paidAcquisition.campaigns.length > 0,
    data.phase2.paidAcquisition.campaigns.some(c => c.status === 'complete'),
    data.phase2.organicContent.calendar.length > 0,
    data.phase2.organicContent.backlog.some(b => b.status === 'posted'),
    data.phase2.influencers.length > 0,
    data.phase2.influencers.some(i => i.status === 'content_live' || i.status === 'complete'),
  ];
  const phase2 = Math.round((phase2Items.filter(Boolean).length / phase2Items.length) * 100);

  // Phase 3 progress
  const phase3Items = [
    data.phase3.winningPlaybook.bestMessage !== '',
    data.phase3.winningPlaybook.bestAudience !== '',
    data.phase3.winningPlaybook.bestChannel !== '',
    data.phase3.winningPlaybook.currentCAC > 0,
    data.phase3.scalePlan.monthlyBudget > 0,
    data.phase3.recurringTasks.some(t => t.completed),
  ];
  const phase3 = Math.round((phase3Items.filter(Boolean).length / phase3Items.length) * 100);

  // Overall progress (weighted: Phase 1 is most important initially)
  const overall = Math.round((phase1 * 0.5) + (phase2 * 0.3) + (phase3 * 0.2));

  return { overall, phase1, phase2, phase3 };
}

export function useMarketingData(): UseMarketingDataReturn {
  const [data, setDataState] = useState<MarketingHubData>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored) as MarketingHubData;
        } catch (e) {
          console.error('Failed to parse stored marketing data:', e);
        }
      }
    }
    return initialMarketingData;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save to localStorage
  const saveToStorage = useCallback((dataToSave: MarketingHubData) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const dataWithTimestamp = {
          ...dataToSave,
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp));
        setLastSaved(new Date());
      } catch (e) {
        console.error('Failed to save marketing data:', e);
      } finally {
        setIsSaving(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  // Update function that accepts a path and value
  const updateData = useCallback((path: string, value: unknown) => {
    setDataState(prev => {
      const next = setNestedValue(prev, path, value);
      saveToStorage(next);
      return next;
    });
  }, [saveToStorage]);

  // Direct set function
  const setData = useCallback((newData: MarketingHubData) => {
    setDataState(newData);
    saveToStorage(newData);
  }, [saveToStorage]);

  // Reset to initial data
  const resetData = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all marketing data? This cannot be undone.')) {
      setDataState(initialMarketingData);
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const progress = calculateProgress(data);

  return {
    data,
    updateData,
    setData,
    resetData,
    isSaving,
    lastSaved,
    progress,
  };
}

// Re-export generateId for convenience
export { generateId };
