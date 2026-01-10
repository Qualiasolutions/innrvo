import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import AppLayout from '../layouts/AppLayout';

const VoiceManager = lazy(() => import('../../components/VoiceManager'));

const VoicePage: React.FC = () => {
  console.log('[VoicePage] Rendering VoicePage component');
  const navigate = useNavigate();
  const {
    selectedVoice,
    setSelectedVoice,
    setAvailableVoices,
    availableVoices,
    setMicError,
  } = useApp();

  return (
    <AppLayout className="flex flex-col">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-cyan-500/30 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-500 text-sm animate-pulse">Loading voices...</p>
        </div>
      }>
        <VoiceManager
          isOpen={true}
          onClose={() => navigate('/')}
          onSelectVoice={(voice) => {
            // Determine provider: ElevenLabs (new), browser, or legacy (needs re-clone)
            const provider = voice.elevenlabs_voice_id
              ? 'elevenlabs' as const
              : (voice.provider === 'fish-audio' || voice.provider === 'chatterbox')
                ? voice.provider  // Legacy provider - will prompt re-clone
                : 'browser' as const;

            setSelectedVoice({
              id: voice.id,
              name: voice.name,
              provider,
              voiceName: voice.name,
              description: voice.description || 'Your personalized voice clone',
              isCloned: true,
              elevenLabsVoiceId: voice.elevenlabs_voice_id,
              voiceSampleUrl: voice.voice_sample_url,
              cloningStatus: voice.cloning_status,
            });
            navigate('/');
          }}
          onCloneVoice={() => {
            navigate('/clone');
            setMicError(null);
          }}
          onVoiceDeleted={(deletedVoiceId) => {
            if (selectedVoice?.id === deletedVoiceId) {
              setSelectedVoice(null);
            }
            setAvailableVoices(availableVoices.filter(v => v.id !== deletedVoiceId));
          }}
          currentVoiceId={selectedVoice?.id}
        />
      </Suspense>
    </AppLayout>
  );
};

export default VoicePage;
