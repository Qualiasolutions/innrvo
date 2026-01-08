/**
 * VoiceAgent Component
 *
 * Real-time voice conversation interface for Innrvo Meditation.
 * Clean, minimal design with clear visual feedback.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  getVoiceSession,
  isVoiceSessionSupported,
  type VoiceSessionState,
  type TranscriptEntry,
} from '../src/lib/voiceSession';

// ============================================================================
// ICONS
// ============================================================================

const PhoneIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const EndCallIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
  </svg>
);

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

const XIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ============================================================================
// AUDIO VISUALIZER - Elegant waveform
// ============================================================================

interface AudioVisualizerProps {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  volume: number;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
  isListening,
  isSpeaking,
  volume,
}) => {
  const bars = 7;

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {[...Array(bars)].map((_, i) => {
        // Create wave pattern - center bars taller
        const centerDistance = Math.abs(i - (bars - 1) / 2);
        const baseHeight = 24 - centerDistance * 4;

        // Calculate dynamic height based on state
        let height = 4; // idle height
        if (isActive) {
          if (isListening) {
            height = baseHeight * (0.3 + volume * 0.7);
          } else if (isSpeaking) {
            // Smooth wave animation when speaking
            const phase = (Date.now() / 200 + i * 0.5) % (Math.PI * 2);
            height = baseHeight * (0.4 + Math.sin(phase) * 0.3);
          } else {
            height = baseHeight * 0.3; // connected but idle
          }
        }

        return (
          <m.div
            key={i}
            className="w-1.5 rounded-full"
            style={{
              background: isActive
                ? 'linear-gradient(to top, rgba(34,211,238,0.6), rgba(34,211,238,1))'
                : 'rgba(255,255,255,0.2)',
            }}
            animate={{
              height: `${Math.max(4, height)}px`,
              opacity: isActive ? 1 : 0.5,
            }}
            transition={{
              height: { duration: 0.1, ease: 'easeOut' },
              opacity: { duration: 0.3 },
            }}
          />
        );
      })}
    </div>
  );
};

// ============================================================================
// PULSING ORB - Visual feedback for connection state
// ============================================================================

interface PulsingOrbProps {
  state: VoiceSessionState;
  volume: number;
}

const PulsingOrb: React.FC<PulsingOrbProps> = ({ state, volume }) => {
  const isConnected = state === 'connected' || state === 'listening' || state === 'agent-speaking';
  const isListening = state === 'listening';
  const isSpeaking = state === 'agent-speaking';
  const isConnecting = state === 'connecting' || state === 'requesting-mic';

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow rings */}
      <m.div
        className="absolute w-48 h-48 rounded-full"
        style={{
          background: isConnected
            ? 'radial-gradient(circle, rgba(34,211,238,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
        }}
        animate={{
          scale: isListening ? [1, 1.1 + volume * 0.2, 1] : isSpeaking ? [1, 1.15, 1] : 1,
          opacity: isConnected ? [0.5, 1, 0.5] : 0.3,
        }}
        transition={{
          duration: isSpeaking ? 1.5 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Middle ring */}
      <m.div
        className="absolute w-32 h-32 rounded-full border"
        style={{
          borderColor: isConnected ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.1)',
        }}
        animate={{
          scale: isConnecting ? [1, 1.1, 1] : 1,
          opacity: isConnecting ? [0.3, 0.6, 0.3] : 0.5,
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Inner orb */}
      <m.div
        className="relative w-24 h-24 rounded-full flex items-center justify-center"
        style={{
          background: isConnected
            ? 'radial-gradient(circle at 30% 30%, rgba(34,211,238,0.4), rgba(34,211,238,0.1))'
            : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
          boxShadow: isConnected
            ? '0 0 40px rgba(34,211,238,0.3), inset 0 0 30px rgba(34,211,238,0.1)'
            : 'inset 0 0 20px rgba(255,255,255,0.05)',
        }}
        animate={{
          scale: isListening ? 1 + volume * 0.15 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
        }}
      >
        <AudioVisualizer
          isActive={isConnected}
          isListening={isListening}
          isSpeaking={isSpeaking}
          volume={volume}
        />
      </m.div>
    </div>
  );
};

// ============================================================================
// TRANSCRIPT DISPLAY
// ============================================================================

interface TranscriptDisplayProps {
  transcripts: TranscriptEntry[];
  transcriptsEndRef: React.RefObject<HTMLDivElement>;
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcripts,
  transcriptsEndRef,
}) => {
  if (transcripts.length === 0) return null;

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <AnimatePresence mode="popLayout">
        {transcripts.slice(-5).map((entry) => (
          <m.div
            key={entry.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: entry.isFinal ? 1 : 0.7, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`mb-3 flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                ${entry.role === 'user'
                  ? 'bg-cyan-500/20 text-white border border-cyan-500/30 rounded-br-sm'
                  : 'bg-white/10 text-white/90 border border-white/10 rounded-bl-sm'
                }
              `}
            >
              {entry.text}
            </div>
          </m.div>
        ))}
      </AnimatePresence>
      <div ref={transcriptsEndRef} />
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
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const voiceSession = useRef(getVoiceSession());

  // Check browser support
  useEffect(() => {
    setIsSupported(isVoiceSessionSupported());
  }, []);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Handlers
  const handleStateChange = useCallback((state: VoiceSessionState) => {
    console.log('[VoiceAgent] State changed:', state);
    setSessionState(state);
  }, []);

  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscripts(prev => {
      const existingIndex = prev.findIndex(t => t.role === entry.role && !t.isFinal);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = entry;
        return updated;
      }
      return [...prev, entry];
    });
  }, []);

  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
  }, []);

  const handleError = useCallback((err: Error) => {
    console.error('[VoiceAgent] Error:', err);
    setError(err.message);
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setTranscripts([]);
    console.log('[VoiceAgent] Starting session...');
    try {
      await voiceSession.current.start({
        onStateChange: handleStateChange,
        onTranscript: handleTranscript,
        onVolumeChange: handleVolumeChange,
        onError: handleError,
      });
    } catch (err) {
      console.error('[VoiceAgent] Start failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to start voice session');
    }
  }, [handleStateChange, handleTranscript, handleVolumeChange, handleError]);

  const stopSession = useCallback(() => {
    voiceSession.current.stop();
    setVolume(0);
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = voiceSession.current.toggleMute();
    setIsMuted(newMuted);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      voiceSession.current.stop();
    };
  }, []);

  // State helpers
  const isConnected = sessionState === 'connected' || sessionState === 'listening' || sessionState === 'agent-speaking';
  const isConnecting = sessionState === 'connecting' || sessionState === 'requesting-mic';
  const isListening = sessionState === 'listening';
  const isSpeaking = sessionState === 'agent-speaking';

  // Status text
  const getStatusText = () => {
    switch (sessionState) {
      case 'idle': return 'Tap to start';
      case 'requesting-mic': return 'Requesting microphone...';
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected';
      case 'listening': return 'Listening...';
      case 'agent-speaking': return 'Speaking...';
      case 'error': return 'Connection failed';
      case 'disconnected': return 'Call ended';
      default: return '';
    }
  };

  // Not supported view
  if (!isSupported) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[70] bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-8 ${className}`}
      >
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <MicOffIcon className="w-8 h-8 text-white/40" />
          </div>
          <h2 className="text-xl font-medium text-white mb-3">Voice Not Available</h2>
          <p className="text-sm text-white/50 mb-8 leading-relaxed">
            Your browser doesn't support voice features. Please try Chrome, Firefox, or Safari on desktop.
          </p>
          <button
            onClick={onClose}
            className="px-8 py-3 text-sm font-medium text-white bg-white/10 hover:bg-white/15 rounded-full transition-all duration-300 border border-white/10"
          >
            Go Back
          </button>
        </div>
      </m.div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[70] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <m.div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400' :
              isConnecting ? 'bg-amber-400' :
              error ? 'bg-rose-400' : 'bg-white/30'
            }`}
            animate={isConnecting ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-sm text-white/60">{getStatusText()}</span>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Transcripts area */}
        {transcripts.length > 0 && (
          <div className="absolute top-20 left-0 right-0 bottom-72 overflow-y-auto">
            <TranscriptDisplay
              transcripts={transcripts}
              transcriptsEndRef={transcriptsEndRef as React.RefObject<HTMLDivElement>}
            />
          </div>
        )}

        {/* Pulsing orb visualization */}
        <m.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className={transcripts.length > 0 ? 'mt-auto mb-4' : ''}
        >
          <PulsingOrb state={sessionState} volume={volume} />
        </m.div>

        {/* Status message */}
        <AnimatePresence>
          {!isConnected && !isConnecting && !error && transcripts.length === 0 && (
            <m.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 text-white/40 text-sm text-center"
            >
              Talk with your meditation guide
            </m.p>
          )}
        </AnimatePresence>

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 px-5 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl max-w-sm"
            >
              <p className="text-rose-300 text-sm text-center">{error}</p>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="flex-shrink-0 pb-10 pt-6">
        <div className="flex items-center justify-center gap-8">
          {/* Mute button */}
          <AnimatePresence>
            {isConnected && (
              <m.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={toggleMute}
                className={`
                  w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300
                  ${isMuted
                    ? 'bg-rose-500/20 text-rose-400 border-2 border-rose-500/40'
                    : 'bg-white/5 text-white/60 hover:text-white border-2 border-white/10 hover:border-white/20'
                  }
                `}
              >
                {isMuted ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
              </m.button>
            )}
          </AnimatePresence>

          {/* Main call button */}
          <m.button
            onClick={isConnected ? stopSession : startSession}
            disabled={isConnecting}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            {/* Animated ring when connecting */}
            {isConnecting && (
              <m.div
                className="absolute inset-0 rounded-full border-2 border-cyan-400/50"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}

            <div
              className={`
                relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
                ${isConnecting
                  ? 'bg-cyan-500/20 border-2 border-cyan-500/50'
                  : isConnected
                    ? 'bg-rose-500 border-2 border-rose-400 shadow-lg shadow-rose-500/30'
                    : 'bg-cyan-500 border-2 border-cyan-400 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50'
                }
              `}
            >
              {isConnecting ? (
                <m.div
                  className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              ) : isConnected ? (
                <EndCallIcon className="w-7 h-7 text-white" />
              ) : (
                <PhoneIcon className="w-7 h-7 text-white" />
              )}
            </div>
          </m.button>

          {/* Spacer for symmetry */}
          {isConnected && <div className="w-14" />}
        </div>

        {/* Helper text */}
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-white/30 text-xs mt-6"
        >
          {isConnected
            ? isMuted
              ? 'Microphone muted'
              : isListening
                ? 'Listening to you...'
                : isSpeaking
                  ? 'Guide is speaking'
                  : 'Say something'
            : isConnecting
              ? 'Setting up voice connection...'
              : 'Start a voice conversation'}
        </m.p>
      </div>
    </m.div>
  );
};

export default VoiceAgent;
