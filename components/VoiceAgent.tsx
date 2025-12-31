/**
 * VoiceAgent Component
 *
 * Real-time voice conversation interface for the INrVO Meditation Agent.
 * Uses Gemini Multimodal Live API for bidirectional voice streaming.
 *
 * Features:
 * - Push-to-talk or voice-activated mode
 * - Real-time transcription display
 * - Visual feedback for listening/speaking states
 * - Barge-in (interruption) support
 * - Volume control
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  getVoiceSession,
  isVoiceSessionSupported,
  type VoiceSessionState,
  type TranscriptEntry,
} from '../src/lib/voiceSession';
import { ChronosEngine, ChronosMiniLoader } from '@/components/ui/chronos-engine';

// ============================================================================
// ICONS
// ============================================================================

const MicIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const MicOffIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const PhoneIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const PhoneOffIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
    <line x1="22" y1="2" x2="2" y2="22" />
  </svg>
);

const VolumeIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const CloseIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TranscriptBubbleProps {
  entry: TranscriptEntry;
}

const TranscriptBubble: React.FC<TranscriptBubbleProps> = ({ entry }) => {
  const isUser = entry.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-2 text-sm
          ${isUser
            ? 'bg-gradient-to-br from-cyan-600 to-cyan-700 text-white'
            : 'bg-white/[0.08] text-white/90 border border-white/10'
          }
          ${!entry.isFinal ? 'opacity-60' : ''}
        `}
      >
        {entry.text}
      </div>
    </div>
  );
};

interface VoiceVisualizerProps {
  isActive: boolean;
  volume: number;
  bars?: number;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  isActive,
  volume,
  bars = 32,
}) => {
  return (
    <div className="h-8 flex items-center justify-center gap-0.5">
      {[...Array(bars)].map((_, i) => {
        const centerDistance = Math.abs(i - bars / 2) / (bars / 2);
        const baseHeight = isActive ? 0.2 + (1 - centerDistance) * 0.3 : 0.1;
        const heightMultiplier = isActive ? volume * 2 : 0;
        const height = Math.min(1, baseHeight + heightMultiplier * (1 - centerDistance * 0.5));

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-100 ${
              isActive ? 'bg-cyan-400/70' : 'bg-white/20'
            }`}
            style={{
              height: `${height * 100}%`,
              transition: 'height 0.1s ease-out',
            }}
          />
        );
      })}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface VoiceAgentProps {
  onClose?: () => void;
  className?: string;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({
  onClose,
  className = '',
}) => {
  const [sessionState, setSessionState] = useState<VoiceSessionState>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [playbackVolume, setPlaybackVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const voiceSession = useRef(getVoiceSession());

  // Check browser support on mount
  useEffect(() => {
    setIsSupported(isVoiceSessionSupported());
  }, []);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Handle session state changes
  const handleStateChange = useCallback((state: VoiceSessionState) => {
    setSessionState(state);
    if (state === 'error' || state === 'disconnected') {
      // Keep transcripts visible after disconnect
    }
  }, []);

  // Handle new transcripts
  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscripts(prev => {
      // Update existing non-final entry or add new
      const existingIndex = prev.findIndex(
        t => t.role === entry.role && !t.isFinal
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = entry;
        return updated;
      }

      return [...prev, entry];
    });
  }, []);

  // Handle volume changes (mic input level)
  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
  }, []);

  // Handle errors
  const handleError = useCallback((err: Error) => {
    console.error('[VoiceAgent] Error:', err);
    setError(err.message);
  }, []);

  // Start voice session
  const startSession = useCallback(async () => {
    setError(null);
    setTranscripts([]);

    try {
      await voiceSession.current.start({
        onStateChange: handleStateChange,
        onTranscript: handleTranscript,
        onVolumeChange: handleVolumeChange,
        onError: handleError,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voice session');
    }
  }, [handleStateChange, handleTranscript, handleVolumeChange, handleError]);

  // Stop voice session
  const stopSession = useCallback(() => {
    voiceSession.current.stop();
    setVolume(0);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = voiceSession.current.toggleMute();
    setIsMuted(newMuted);
  }, []);

  // Handle playback volume change
  const handlePlaybackVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setPlaybackVolume(newVolume);
    voiceSession.current.setVolume(newVolume);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceSession.current.stop();
    };
  }, []);

  // Determine UI state
  const isConnected = sessionState === 'connected' || sessionState === 'listening' || sessionState === 'agent-speaking';
  const isConnecting = sessionState === 'connecting' || sessionState === 'requesting-mic';
  const isListening = sessionState === 'listening';
  const isSpeaking = sessionState === 'agent-speaking';

  // Browser not supported
  if (!isSupported) {
    return (
      <div className={`fixed inset-0 z-[70] bg-[#020617] flex flex-col items-center justify-center p-4 ${className}`}>
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/20 flex items-center justify-center">
            <MicOffIcon className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Voice Not Supported</h2>
          <p className="text-white/60 mb-6">
            Your browser doesn't support real-time voice. Please use a modern browser like Chrome, Firefox, or Safari.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[70] bg-[#020617] flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-600/20 flex items-center justify-center overflow-hidden">
            <ChronosEngine variant="avatar" showSparks={isSpeaking} />
          </div>
          <div>
            <h2 className="text-white font-medium">Voice Chat</h2>
            <p className="text-xs text-white/50">
              {sessionState === 'idle' && 'Ready to connect'}
              {sessionState === 'requesting-mic' && 'Requesting microphone...'}
              {sessionState === 'connecting' && 'Connecting...'}
              {sessionState === 'connected' && 'Connected'}
              {sessionState === 'listening' && 'Listening...'}
              {sessionState === 'agent-speaking' && 'Speaking...'}
              {sessionState === 'error' && 'Connection error'}
              {sessionState === 'disconnected' && 'Disconnected'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <CloseIcon className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Transcripts Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {transcripts.length === 0 && !isConnected && !isConnecting && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-600/20 flex items-center justify-center">
              <PhoneIcon className="w-10 h-10 text-cyan-400" />
            </div>
            <h3 className="text-xl text-white mb-2">Start a Voice Chat</h3>
            <p className="text-white/50 max-w-xs mb-6">
              Have a real-time conversation with your meditation guide. Just tap the call button below.
            </p>
          </div>
        )}

        {transcripts.length === 0 && isConnecting && (
          <div className="h-full flex flex-col items-center justify-center">
            <ChronosMiniLoader />
            <p className="text-white/50 mt-4">
              {sessionState === 'requesting-mic' ? 'Requesting microphone access...' : 'Connecting to voice assistant...'}
            </p>
          </div>
        )}

        {transcripts.length > 0 && (
          <div className="max-w-lg mx-auto space-y-2">
            {transcripts.map((entry) => (
              <TranscriptBubble key={entry.id} entry={entry} />
            ))}
            <div ref={transcriptsEndRef} />
          </div>
        )}

        {error && (
          <div className="max-w-lg mx-auto mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Voice Visualizer */}
      {isConnected && (
        <div className="flex-shrink-0 px-4 py-2">
          <VoiceVisualizer
            isActive={isListening && !isMuted}
            volume={volume}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex-shrink-0 px-4 py-6 bg-gradient-to-t from-[#020617] to-transparent">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-4">
          {/* Volume Control */}
          {isConnected && (
            <div className="relative">
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <VolumeIcon className="w-5 h-5 text-white/60" />
              </button>

              {showVolumeSlider && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={playbackVolume}
                    onChange={handlePlaybackVolumeChange}
                    className="w-24 h-1 appearance-none bg-white/20 rounded-full
                              [&::-webkit-slider-thumb]:appearance-none
                              [&::-webkit-slider-thumb]:w-3
                              [&::-webkit-slider-thumb]:h-3
                              [&::-webkit-slider-thumb]:rounded-full
                              [&::-webkit-slider-thumb]:bg-cyan-400"
                  />
                </div>
              )}
            </div>
          )}

          {/* Mute Button */}
          {isConnected && (
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${
                isMuted
                  ? 'bg-rose-500/20 hover:bg-rose-500/30'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {isMuted ? (
                <MicOffIcon className="w-5 h-5 text-rose-400" />
              ) : (
                <MicIcon className="w-5 h-5 text-white/60" />
              )}
            </button>
          )}

          {/* Main Call Button */}
          <button
            onClick={isConnected ? stopSession : startSession}
            disabled={isConnecting}
            className={`
              relative w-16 h-16 rounded-full flex items-center justify-center transition-all
              ${isConnecting
                ? 'bg-cyan-500/50 cursor-wait'
                : isConnected
                  ? 'bg-rose-500 hover:bg-rose-400 active:scale-95'
                  : 'bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 active:scale-95'
              }
              shadow-lg ${isConnected ? 'shadow-rose-500/30' : 'shadow-cyan-500/30'}
            `}
          >
            {isConnecting ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white" />
            ) : isConnected ? (
              <PhoneOffIcon className="w-7 h-7 text-white" />
            ) : (
              <PhoneIcon className="w-7 h-7 text-white" />
            )}

            {/* Pulsing ring for active call */}
            {isConnected && (
              <div className="absolute inset-0 rounded-full border-2 border-rose-400/50 animate-ping" />
            )}
          </button>

          {/* Placeholder for symmetry */}
          {isConnected && <div className="w-11" />}
          {isConnected && <div className="w-11" />}
        </div>

        {/* Status text */}
        <p className="text-center text-white/40 text-xs mt-4">
          {isConnected
            ? isSpeaking
              ? 'Agent is speaking... Tap to interrupt'
              : isMuted
                ? 'Microphone muted'
                : 'Speak to your guide'
            : 'Tap to start voice chat'}
        </p>
      </div>
    </div>
  );
};

export default VoiceAgent;
