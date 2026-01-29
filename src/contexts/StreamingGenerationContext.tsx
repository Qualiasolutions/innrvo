import React, { createContext, useContext, useState, useRef, useCallback, useMemo, ReactNode, RefObject } from 'react';
import { VoiceProfile } from '../../types';
import { BackgroundTrack } from '../../constants';

/**
 * StreamingGenerationContext - Manages audio generation state across page navigation
 *
 * Enables "early redirect" pattern where user is navigated to player page immediately
 * while audio continues generating in background. Provides seamless handoff between
 * the editor page (starts generation) and player page (receives audio).
 */

export type GenerationPhase = 'idle' | 'preparing' | 'generating' | 'buffering' | 'decoding' | 'ready' | 'error';

interface GenerationMetadata {
  script: string;
  voice: VoiceProfile;
  backgroundTrack: BackgroundTrack | null;
  audioTags: string[];
  startTime: number;
}

interface GenerationResult {
  audioBuffer: AudioBuffer;
  base64: string;
  duration: number;
}

/**
 * Partial result for progressive playback
 * Used when enough audio is buffered but generation is still in progress
 */
interface PartialGenerationResult {
  audioBuffer: AudioBuffer;
  estimatedTotalDuration: number;
  bufferedSeconds: number;
}

interface StreamingGenerationContextType {
  // Generation state
  phase: GenerationPhase;
  setPhase: (phase: GenerationPhase) => void;

  // Metadata about current generation
  metadata: GenerationMetadata | null;
  setMetadata: (metadata: GenerationMetadata | null) => void;

  // Error handling
  error: string | null;
  setError: (error: string | null) => void;

  // Generation result (populated when ready)
  result: GenerationResult | null;
  setResult: (result: GenerationResult | null) => void;

  // Partial result for progressive playback (populated during buffering phase)
  partialResult: PartialGenerationResult | null;
  setPartialResult: (result: PartialGenerationResult | null) => void;

  // Promise ref for async coordination
  generationPromiseRef: RefObject<Promise<GenerationResult> | null>;

  // Actions
  startGeneration: (metadata: GenerationMetadata, generateFn: () => Promise<GenerationResult>) => void;
  cancelGeneration: () => void;
  resetGeneration: () => void;

  // Status checks
  isGenerating: boolean;
  isReady: boolean;
  hasError: boolean;
  isBufferingForPlayback: boolean;
}

const StreamingGenerationContext = createContext<StreamingGenerationContextType | undefined>(undefined);

export const useStreamingGeneration = () => {
  const context = useContext(StreamingGenerationContext);
  if (!context) {
    throw new Error('useStreamingGeneration must be used within a StreamingGenerationProvider');
  }
  return context;
};

interface StreamingGenerationProviderProps {
  children: ReactNode;
}

export const StreamingGenerationProvider: React.FC<StreamingGenerationProviderProps> = ({ children }) => {
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [partialResult, setPartialResult] = useState<PartialGenerationResult | null>(null);

  const generationPromiseRef = useRef<Promise<GenerationResult> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startGeneration = useCallback((
    newMetadata: GenerationMetadata,
    generateFn: () => Promise<GenerationResult>
  ) => {
    // Cancel any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state
    setError(null);
    setResult(null);
    setMetadata(newMetadata);
    setPhase('preparing');

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Start generation
    const promise = generateFn();
    generationPromiseRef.current = promise;

    // Handle promise completion
    promise
      .then((generationResult) => {
        // Check if this generation wasn't cancelled
        if (generationPromiseRef.current === promise) {
          setResult(generationResult);
          setPhase('ready');
        }
      })
      .catch((err) => {
        // Check if this was a cancellation
        if (err?.name === 'AbortError') {
          return;
        }
        // Check if this generation wasn't cancelled
        if (generationPromiseRef.current === promise) {
          setError(err instanceof Error ? err.message : 'Generation failed');
          setPhase('error');
        }
      });
  }, []);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    generationPromiseRef.current = null;
    setPhase('idle');
  }, []);

  const resetGeneration = useCallback(() => {
    cancelGeneration();
    setMetadata(null);
    setError(null);
    setResult(null);
    setPartialResult(null);
  }, [cancelGeneration]);

  // Derived state
  const isGenerating = phase === 'preparing' || phase === 'generating' || phase === 'buffering' || phase === 'decoding';
  const isReady = phase === 'ready' && result !== null;
  const hasError = phase === 'error' && error !== null;
  const isBufferingForPlayback = phase === 'buffering' && partialResult !== null;

  const value = useMemo<StreamingGenerationContextType>(() => ({
    phase,
    setPhase,
    metadata,
    setMetadata,
    error,
    setError,
    result,
    setResult,
    partialResult,
    setPartialResult,
    generationPromiseRef,
    startGeneration,
    cancelGeneration,
    resetGeneration,
    isGenerating,
    isReady,
    hasError,
    isBufferingForPlayback,
  }), [
    phase, metadata, error, result, partialResult,
    startGeneration, cancelGeneration, resetGeneration,
    isGenerating, isReady, hasError, isBufferingForPlayback,
  ]);

  return (
    <StreamingGenerationContext.Provider value={value}>
      {children}
    </StreamingGenerationContext.Provider>
  );
};

export default StreamingGenerationContext;
