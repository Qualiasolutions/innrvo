import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import AppLayout from '../layouts/AppLayout';

const VoiceManager = lazy(() => import('../../components/VoiceManager'));

const VoicePage: React.FC = () => {
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
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
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
