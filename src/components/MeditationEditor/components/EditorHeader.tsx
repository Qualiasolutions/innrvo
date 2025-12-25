/**
 * EditorHeader Component
 *
 * Header section with close button and script statistics.
 * Mobile-first design with proper safe areas and polished styling.
 */

import React, { memo } from 'react';
import type { ScriptStats } from '../types';
import type { MeditationType } from '../../../lib/agent/knowledgeBase';

// ============================================================================
// ICONS
// ============================================================================

const CloseIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const SparkleIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
  </svg>
);

// ============================================================================
// TYPES
// ============================================================================

interface EditorHeaderProps {
  onClose: () => void;
  stats: ScriptStats;
  meditationType?: MeditationType;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatMeditationType(type?: MeditationType): string {
  if (!type) return 'Meditation';
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EditorHeader = memo<EditorHeaderProps>(
  ({ onClose, stats, meditationType }) => {
    return (
      <header
        role="banner"
        aria-label="Meditation editor header"
        className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-4 md:px-6 md:py-5 border-b border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        {/* Left: Close Button - Visible on all screens with proper spacing */}
        <button
          onClick={onClose}
          aria-label="Close editor"
          className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                     text-white/60 hover:text-white transition-all duration-200 flex items-center justify-center
                     active:scale-95 cursor-pointer touch-manipulation flex-shrink-0 shadow-lg shadow-black/10"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        {/* Center: Title & Type with icon */}
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0 px-2">
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 items-center justify-center border border-cyan-500/20">
            <SparkleIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-base md:text-lg font-semibold text-white truncate">
              Edit Script
            </h1>
            <p className="text-xs text-cyan-400/70 truncate font-medium">
              {formatMeditationType(meditationType)}
            </p>
          </div>
        </div>

        {/* Right: Stats - Compact on mobile, detailed on desktop */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Mobile: Compact duration only */}
          <div className="md:hidden flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-cyan-400 font-bold text-sm">{stats.estimatedMinutes}</span>
            <span className="text-white/50 text-xs">min</span>
          </div>

          {/* Desktop: Full stats */}
          <div
            id="editor-stats"
            className="hidden md:flex items-center gap-2 text-sm"
            aria-label={`${stats.wordCount} words, approximately ${stats.estimatedMinutes} minutes, ${stats.tagCount} audio tags`}
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 transition-colors">
              <span className="text-white/50 text-xs">Words</span>
              <span className="text-white font-semibold text-xs">{stats.wordCount}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-cyan-400 font-bold text-xs">
                {stats.estimatedMinutes}
              </span>
              <span className="text-cyan-400/70 text-xs">min</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <span className="text-violet-400 font-bold text-xs">{stats.tagCount}</span>
              <span className="text-violet-400/70 text-xs">tags</span>
            </div>
          </div>
        </div>
      </header>
    );
  }
);

EditorHeader.displayName = 'EditorHeader';
