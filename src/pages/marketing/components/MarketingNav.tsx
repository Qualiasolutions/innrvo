import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Target, TestTube, Rocket, FolderOpen, MessageSquare, Download, RotateCcw, Check, Loader2, ArrowLeft } from 'lucide-react';
import { MarketingTab } from '../types';
import { CircularProgress } from './ProgressIndicator';

interface MarketingNavProps {
  activeTab: MarketingTab;
  onTabChange: (tab: MarketingTab) => void;
  progress: {
    overall: number;
    phase1: number;
    phase2: number;
    phase3: number;
  };
  isSaving: boolean;
  lastSaved: Date | null;
  onExport: (format: 'markdown' | 'pdf') => void;
  onReset: () => void;
}

const tabs: { id: MarketingTab; label: string; icon: React.ReactNode; phaseKey?: 'phase1' | 'phase2' | 'phase3' }[] = [
  { id: 'overview', label: 'Overview', icon: <Home size={18} /> },
  { id: 'phase1', label: 'Phase 1: Foundation', icon: <Target size={18} />, phaseKey: 'phase1' },
  { id: 'phase2', label: 'Phase 2: Validation', icon: <TestTube size={18} />, phaseKey: 'phase2' },
  { id: 'phase3', label: 'Phase 3: Scale', icon: <Rocket size={18} />, phaseKey: 'phase3' },
  { id: 'resources', label: 'Resources', icon: <FolderOpen size={18} /> },
  { id: 'notes', label: 'Notes', icon: <MessageSquare size={18} /> },
];

export function MarketingNav({
  activeTab,
  onTabChange,
  progress,
  isSaving,
  lastSaved,
  onExport,
  onReset,
}: MarketingNavProps) {
  return (
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back to App</span>
            </Link>
            <div className="h-6 w-px bg-slate-700" />
            <h1 className="text-xl font-bold text-white">INrVO Marketing Hub</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Save status */}
            <div className="flex items-center gap-2 text-sm">
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin text-cyan-400" />
                  <span className="text-slate-400">Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check size={14} className="text-teal-400" />
                  <span className="text-slate-400">
                    Saved {lastSaved.toLocaleTimeString()}
                  </span>
                </>
              ) : null}
            </div>

            {/* Overall progress */}
            <CircularProgress value={progress.overall} size={44} strokeWidth={3} />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onExport('markdown')}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
              >
                <Download size={14} />
                Export
              </button>
              <button
                onClick={onReset}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Reset all data"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const phaseProgress = tab.phaseKey ? progress[tab.phaseKey] : null;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-500/20 text-teal-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {phaseProgress !== null && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                      phaseProgress === 100
                        ? 'bg-teal-500/20 text-teal-400'
                        : phaseProgress > 0
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700 text-slate-500'
                    }`}
                  >
                    {phaseProgress}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
