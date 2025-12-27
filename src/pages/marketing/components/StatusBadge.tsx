import { Status, ContentStatus, SocialContentStatus, EmailStatus, CampaignStatus, InfluencerStatus, PersonaStatus, BacklogStatus } from '../types';

type AllStatuses = Status | ContentStatus | SocialContentStatus | EmailStatus | CampaignStatus | InfluencerStatus | PersonaStatus | BacklogStatus;

interface StatusBadgeProps {
  status: AllStatuses;
  className?: string;
}

const statusConfig: Record<AllStatuses, { label: string; color: string }> = {
  // General Status
  not_started: { label: 'Not Started', color: 'bg-slate-500/20 text-slate-400' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-400' },
  complete: { label: 'Complete', color: 'bg-teal-500/20 text-teal-400' },
  live: { label: 'Live', color: 'bg-green-500/20 text-green-400' },

  // Content Status
  idea: { label: 'Idea', color: 'bg-slate-500/20 text-slate-400' },
  outlined: { label: 'Outlined', color: 'bg-blue-500/20 text-blue-400' },
  draft: { label: 'Draft', color: 'bg-amber-500/20 text-amber-400' },
  published: { label: 'Published', color: 'bg-teal-500/20 text-teal-400' },
  ranking: { label: 'Ranking', color: 'bg-green-500/20 text-green-400' },

  // Social Content Status
  scripted: { label: 'Scripted', color: 'bg-blue-500/20 text-blue-400' },
  filmed: { label: 'Filmed', color: 'bg-purple-500/20 text-purple-400' },
  edited: { label: 'Edited', color: 'bg-cyan-500/20 text-cyan-400' },
  posted: { label: 'Posted', color: 'bg-teal-500/20 text-teal-400' },

  // Email Status
  written: { label: 'Written', color: 'bg-blue-500/20 text-blue-400' },

  // Campaign Status
  planning: { label: 'Planning', color: 'bg-slate-500/20 text-slate-400' },
  active: { label: 'Active', color: 'bg-green-500/20 text-green-400' },
  paused: { label: 'Paused', color: 'bg-amber-500/20 text-amber-400' },

  // Influencer Status
  researching: { label: 'Researching', color: 'bg-slate-500/20 text-slate-400' },
  contacted: { label: 'Contacted', color: 'bg-blue-500/20 text-blue-400' },
  negotiating: { label: 'Negotiating', color: 'bg-amber-500/20 text-amber-400' },
  agreed: { label: 'Agreed', color: 'bg-cyan-500/20 text-cyan-400' },
  content_live: { label: 'Content Live', color: 'bg-teal-500/20 text-teal-400' },

  // Persona Status
  in_review: { label: 'In Review', color: 'bg-amber-500/20 text-amber-400' },
  approved: { label: 'Approved', color: 'bg-teal-500/20 text-teal-400' },

  // Backlog Status
  ideas: { label: 'Ideas', color: 'bg-slate-500/20 text-slate-400' },
  in_production: { label: 'In Production', color: 'bg-purple-500/20 text-purple-400' },
  scheduled: { label: 'Scheduled', color: 'bg-cyan-500/20 text-cyan-400' },
  analyzed: { label: 'Analyzed', color: 'bg-green-500/20 text-green-400' },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: 'bg-slate-500/20 text-slate-400' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${className}`}>
      {config.label}
    </span>
  );
}

interface StatusSelectProps {
  value: AllStatuses;
  onChange: (value: AllStatuses) => void;
  options: AllStatuses[];
  className?: string;
}

export function StatusSelect({ value, onChange, options, className = '' }: StatusSelectProps) {
  const currentConfig = statusConfig[value];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AllStatuses)}
      className={`bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm ${currentConfig?.color || ''} ${className}`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {statusConfig[option]?.label || option}
        </option>
      ))}
    </select>
  );
}
