import { Status, ContentStatus, SocialContentStatus, EmailStatus, CampaignStatus, InfluencerStatus, PersonaStatus, BacklogStatus } from '../types';

type AllStatuses = Status | ContentStatus | SocialContentStatus | EmailStatus | CampaignStatus | InfluencerStatus | PersonaStatus | BacklogStatus;

interface StatusBadgeProps {
  status: AllStatuses;
  className?: string;
}

const statusConfig: Record<AllStatuses, { label: string; color: string }> = {
  // General Status
  not_started: { label: 'Not Started', color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  complete: { label: 'Complete', color: 'bg-teal-100 text-teal-700' },
  live: { label: 'Live', color: 'bg-green-100 text-green-700' },

  // Content Status
  idea: { label: 'Idea', color: 'bg-slate-100 text-slate-600' },
  outlined: { label: 'Outlined', color: 'bg-blue-100 text-blue-700' },
  draft: { label: 'Draft', color: 'bg-amber-100 text-amber-700' },
  published: { label: 'Published', color: 'bg-teal-100 text-teal-700' },
  ranking: { label: 'Ranking', color: 'bg-green-100 text-green-700' },

  // Social Content Status
  scripted: { label: 'Scripted', color: 'bg-blue-100 text-blue-700' },
  filmed: { label: 'Filmed', color: 'bg-purple-100 text-purple-700' },
  edited: { label: 'Edited', color: 'bg-cyan-100 text-cyan-700' },
  posted: { label: 'Posted', color: 'bg-teal-100 text-teal-700' },

  // Email Status
  written: { label: 'Written', color: 'bg-blue-100 text-blue-700' },

  // Campaign Status
  planning: { label: 'Planning', color: 'bg-slate-100 text-slate-600' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  paused: { label: 'Paused', color: 'bg-amber-100 text-amber-700' },

  // Influencer Status
  researching: { label: 'Researching', color: 'bg-slate-100 text-slate-600' },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  negotiating: { label: 'Negotiating', color: 'bg-amber-100 text-amber-700' },
  agreed: { label: 'Agreed', color: 'bg-cyan-100 text-cyan-700' },
  content_live: { label: 'Content Live', color: 'bg-teal-100 text-teal-700' },

  // Persona Status
  in_review: { label: 'In Review', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-teal-100 text-teal-700' },

  // Backlog Status
  ideas: { label: 'Ideas', color: 'bg-slate-100 text-slate-600' },
  in_production: { label: 'In Production', color: 'bg-purple-100 text-purple-700' },
  scheduled: { label: 'Scheduled', color: 'bg-cyan-100 text-cyan-700' },
  analyzed: { label: 'Analyzed', color: 'bg-green-100 text-green-700' },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: 'bg-slate-100 text-slate-600' };

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
      className={`bg-white border border-slate-200 rounded px-2 py-1 text-sm ${currentConfig?.color || ''} ${className}`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {statusConfig[option]?.label || option}
        </option>
      ))}
    </select>
  );
}
