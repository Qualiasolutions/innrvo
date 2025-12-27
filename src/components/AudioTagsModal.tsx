import React from 'react';
import { ICONS, AUDIO_TAG_CATEGORIES } from '../../constants';
import { updateAudioTagPreferences } from '../../lib/supabase';

interface AudioTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: string[];
  onSelectTags: React.Dispatch<React.SetStateAction<string[]>>;
  audioTagsEnabled: boolean;
  onSetEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  suggestedTags: string[];
  favoriteTags: string[];
}

export const AudioTagsModal: React.FC<AudioTagsModalProps> = ({
  isOpen,
  onClose,
  selectedTags,
  onSelectTags,
  audioTagsEnabled,
  onSetEnabled,
  suggestedTags,
  favoriteTags,
}) => {
  if (!isOpen) return null;

  const handleToggleEnabled = async () => {
    const newValue = !audioTagsEnabled;
    onSetEnabled(newValue);
    try {
      await updateAudioTagPreferences({ enabled: newValue });
    } catch (err) {
      console.warn('Failed to save audio tag preference:', err);
    }
  };

  const handleAddTag = (tagId: string) => {
    if (!selectedTags.includes(tagId)) {
      onSelectTags(prev => [...prev, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onSelectTags(prev => prev.filter(id => id !== tagId));
  };

  const handleToggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      handleRemoveTag(tagId);
    } else {
      handleAddTag(tagId);
    }
  };

  const handleClearAll = () => {
    onSelectTags([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-lg glass rounded-3xl border border-white/10 shadow-2xl shadow-black/50 max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Audio Tags</h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Add special markers to enhance your meditation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <ICONS.Close className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="text-sm font-medium text-white">Enable Audio Tags</p>
              <p className="text-xs text-slate-400">Include tags in generated scripts</p>
            </div>
            <button
              onClick={handleToggleEnabled}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                audioTagsEnabled ? 'bg-violet-500' : 'bg-slate-600'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                audioTagsEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Smart Suggestions */}
          {suggestedTags.length > 0 && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <p className="text-xs font-medium text-amber-300 mb-2">✨ Suggested for your prompt</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map(tagId => {
                  const tag = AUDIO_TAG_CATEGORIES.flatMap(c => c.tags).find(t => t.id === tagId);
                  const isAlreadySelected = selectedTags.includes(tagId);
                  return tag ? (
                    <button
                      key={tagId}
                      onClick={() => handleAddTag(tagId)}
                      disabled={isAlreadySelected}
                      className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                        isAlreadySelected
                          ? 'bg-amber-500/10 text-amber-500/50 cursor-not-allowed'
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                      }`}
                    >
                      {tag.label} {isAlreadySelected ? '✓' : '+'}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Selected Tags Preview */}
          {selectedTags.length > 0 && (
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <p className="text-xs font-medium text-violet-300 mb-2">Selected Tags ({selectedTags.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map(tagId => {
                  const tag = AUDIO_TAG_CATEGORIES.flatMap(c => c.tags).find(t => t.id === tagId);
                  return tag ? (
                    <button
                      key={tagId}
                      onClick={() => handleRemoveTag(tagId)}
                      className="px-2 py-1 rounded-lg bg-violet-500/20 text-violet-300 text-xs hover:bg-red-500/20 hover:text-red-300 transition-colors"
                    >
                      {tag.label} ×
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Tag Categories */}
          {AUDIO_TAG_CATEGORIES.map(category => (
            <div key={category.id}>
              <h3 className={`text-sm font-semibold mb-3 ${category.color}`}>
                {category.name}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {category.tags.map(tag => {
                  const isSelected = selectedTags.includes(tag.id);
                  const isFavorite = favoriteTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className={`p-3 rounded-xl text-left transition-all btn-press ${
                        isSelected
                          ? `${category.bgColor} ${category.color} border border-current/30`
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{tag.label}</span>
                        {isFavorite && <span className="text-yellow-400 text-xs">★</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{tag.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={handleClearAll}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium transition-all"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium transition-all hover:shadow-lg hover:shadow-violet-500/25"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioTagsModal;
