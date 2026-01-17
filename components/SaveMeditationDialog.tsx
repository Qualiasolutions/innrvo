import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, Trash2 } from 'lucide-react';

interface SaveMeditationDialogProps {
  isOpen: boolean;
  defaultTitle: string;
  onSave: (title: string) => void;
  onDiscard: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const SaveMeditationDialog: React.FC<SaveMeditationDialogProps> = ({
  isOpen,
  defaultTitle,
  onSave,
  onDiscard,
  onCancel,
  isSaving = false,
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset title when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
      // Focus input after animation
      setTimeout(() => inputRef.current?.select(), 100);
    }
  }, [isOpen, defaultTitle]);

  const handleSave = () => {
    const trimmedTitle = title.trim() || defaultTitle;
    onSave(trimmedTitle);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-[201] -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md"
          >
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Save to My Audios?</h2>
                <button
                  onClick={onCancel}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <p className="text-slate-400 text-sm mb-4">
                Would you like to save this to My Audios?
              </p>

              {/* Title Input */}
              <div className="mb-6">
                <label htmlFor="meditation-title" className="block text-sm font-medium text-slate-300 mb-2">
                  Name your meditation
                </label>
                <input
                  ref={inputRef}
                  id="meditation-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter a title..."
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
                  disabled={isSaving}
                  autoFocus
                />
              </div>

              {/* Actions - Icon buttons */}
              <div className="flex items-center justify-center gap-4">
                {/* Don't Save Button (icon only) */}
                <button
                  onClick={onDiscard}
                  disabled={isSaving}
                  className="flex items-center justify-center w-12 h-12 bg-slate-800 hover:bg-rose-600/20 hover:border-rose-500/50 disabled:opacity-50 text-slate-400 hover:text-rose-400 rounded-full border border-white/10 transition-all"
                  aria-label="Don't save"
                  title="Don't Save"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                {/* Save Button (icon only) */}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center justify-center w-14 h-14 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-600/50 text-white rounded-full shadow-lg shadow-sky-500/25 transition-all"
                  aria-label="Save"
                  title="Save"
                >
                  {isSaving ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SaveMeditationDialog;
