import React, { useState, useRef, useCallback } from 'react';
import GlassCard from './GlassCard';
import { CloningStatus, CreditInfo } from '../types';
import { AIVoiceInput } from './ui/ai-voice-input';
import { blobToBase64 } from '../geminiService';

interface SimpleVoiceCloneProps {
  onClose: () => void;
  onRecordingComplete: (blob: Blob, name: string) => Promise<void>;
  cloningStatus: CloningStatus;
  creditInfo: CreditInfo;
}

export const SimpleVoiceClone: React.FC<SimpleVoiceCloneProps> = ({
  onClose,
  onRecordingComplete,
  cloningStatus,
  creditInfo
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [profileName, setProfileName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Derive state from cloningStatus
  const isProcessing = cloningStatus.state === 'validating' ||
                       cloningStatus.state === 'uploading_to_elevenlabs' ||
                       cloningStatus.state === 'saving_to_database';

  const error = cloningStatus.state === 'error' ? cloningStatus.message : localError;
  const isSuccess = cloningStatus.state === 'success';

  const startRecording = useCallback(async () => {
    try {
      setLocalError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 30000);
    } catch (e: any) {
      setLocalError(e.message || 'Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const handleToggleRecording = useCallback((recording: boolean) => {
    if (recording) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [startRecording, stopRecording]);

  const handleCloneVoice = async () => {
    if (!recordedBlob) {
      setLocalError('Please record your voice first');
      return;
    }

    if (!creditInfo.canClone) {
      setLocalError(creditInfo.reason || 'Cannot clone voice at this time');
      return;
    }

    const voiceName = profileName.trim() || `My Voice ${Date.now()}`;
    await onRecordingComplete(recordedBlob, voiceName);
  };

  const resetRecording = () => {
    setRecordedBlob(null);
    setIsRecording(false);
    setLocalError(null);
  };

  // Get status message for upload progress
  const getStatusMessage = () => {
    switch (cloningStatus.state) {
      case 'validating':
        return 'Validating...';
      case 'uploading_to_elevenlabs':
        return cloningStatus.progress
          ? `Creating voice clone... ${cloningStatus.progress}%`
          : 'Creating voice clone...';
      case 'saving_to_database':
        return 'Saving profile...';
      case 'success':
        return `Voice "${cloningStatus.voiceName}" created!`;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#020617]/95 backdrop-blur-3xl flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-lg p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Clone Your Voice</h2>
            <p className="text-slate-400 text-sm">Record your voice to create a personalized meditation voice</p>
          </div>

          {/* Credit info */}
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-slate-500">Credits: </span>
              <span className="text-white font-medium">{creditInfo.creditsRemaining.toLocaleString()}</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-slate-500">Clones left: </span>
              <span className="text-white font-medium">{creditInfo.clonesRemaining}</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-indigo-400">Cost: {creditInfo.cloneCost.toLocaleString()}</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-rose-400 text-sm font-medium bg-rose-500/10 p-3 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
              {cloningStatus.state === 'error' && cloningStatus.canRetry && (
                <button
                  onClick={handleCloneVoice}
                  className="ml-auto px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium transition-all"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Success message */}
          {isSuccess && (
            <div className="text-emerald-400 text-sm font-medium bg-emerald-500/10 p-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Voice "{cloningStatus.voiceName}" created successfully!</span>
            </div>
          )}

          {/* Profile name input */}
          {!isSuccess && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Voice Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="My Voice (optional)"
                disabled={isProcessing}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
              />
            </div>
          )}

          {/* Voice recording or playback */}
          {!isSuccess && (
            <div className="space-y-4">
              {!recordedBlob ? (
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-center text-slate-400 text-sm mb-4">
                    Click to record your voice (max 30 seconds)
                  </p>
                  <div className="flex justify-center">
                    <AIVoiceInput
                      isRecording={isRecording}
                      onToggle={handleToggleRecording}
                      visualizerBars={24}
                      className="[&_button]:!bg-white/10 [&_button]:!hover:bg-white/20"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-emerald-400">Recording complete</p>
                        <p className="text-xs text-slate-500">
                          {(recordedBlob.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetRecording}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      Re-record
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status message */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-400/30 border-t-indigo-400"></div>
              <span className="text-indigo-400 text-sm font-medium">{getStatusMessage()}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 font-medium transition-all disabled:opacity-50"
            >
              {isSuccess ? 'Close' : 'Cancel'}
            </button>
            {!isSuccess && (
              <button
                onClick={handleCloneVoice}
                disabled={!recordedBlob || isProcessing || !creditInfo.canClone}
                className="flex-1 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    Processing...
                  </>
                ) : (
                  'Clone Voice'
                )}
              </button>
            )}
          </div>

          {/* Cannot clone warning */}
          {!creditInfo.canClone && !isSuccess && (
            <p className="text-xs text-rose-400 text-center">
              {creditInfo.reason || 'Cannot clone voice at this time'}
            </p>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
