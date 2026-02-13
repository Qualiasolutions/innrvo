/**
 * Marketing Portal TypeScript Types
 * Mirrors Supabase schema for marketing tables
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

export type DeliverableCategory = 'strategy' | 'social' | 'influencer' | 'analytics';

export type DeliverableStatus = 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'completed';

export type ClientInputType = 'brand_values' | 'audience_notes' | 'competitor_insights' | 'content_preferences' | 'partnership_ideas';

export type ClientInputStatus = 'submitted' | 'reviewed' | 'incorporated';

export type Platform = 'instagram' | 'facebook' | 'tiktok' | 'twitter' | 'linkedin' | 'youtube' | 'multiple';

export type ContentType = 'reel' | 'post' | 'story' | 'carousel' | 'live';

export type CalendarStatus = 'planned' | 'created' | 'pending_approval' | 'approved' | 'published';

export type InfluencerStatus = 'researching' | 'contacted' | 'negotiating' | 'agreed' | 'content_live' | 'completed' | 'declined';

export type PartnershipType = 'community' | 'affiliate' | 'cross_promotion' | 'integration' | 'media' | 'event';

export type PartnershipStatus = 'identified' | 'outreach' | 'discussing' | 'agreed' | 'active' | 'completed' | 'declined';

export type CommunicationType = 'meeting' | 'question' | 'feedback' | 'update' | 'decision';

export type DocumentType = 'positioning' | 'messaging' | 'audience' | 'competitor_analysis' | 'content_strategy' | 'brand_guide' | 'campaign_brief';

export type DocumentStatus = 'draft' | 'pending_review' | 'approved' | 'final';

// ============================================================================
// Database Row Interfaces
// ============================================================================

export interface MarketingDeliverable {
  id: string;
  category: DeliverableCategory;
  title: string;
  description: string | null;
  status: DeliverableStatus;
  progress: number;
  due_date: string | null;
  agency_notes: string | null;
  client_feedback: string | null;
  attachments: unknown[];
  created_at: string;
  updated_at: string;
}

export interface MarketingClientInput {
  id: string;
  input_type: ClientInputType;
  title: string;
  content: string;
  status: ClientInputStatus;
  submitted_at: string;
}

export interface MarketingContentCalendar {
  id: string;
  platform: Platform;
  scheduled_date: string;
  content_type: ContentType;
  hook: string | null;
  caption: string | null;
  visual_concept: string | null;
  status: CalendarStatus;
  client_approved: boolean;
  performance_metrics: Record<string, unknown>;
  media_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingInfluencer {
  id: string;
  name: string;
  handle: string | null;
  platform: Platform;
  follower_count: number | null;
  niche: string | null;
  status: InfluencerStatus;
  contact_info: string | null;
  collaboration_type: string | null;
  budget: number | null;
  notes: string | null;
  content_url: string | null;
  performance: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MarketingPartnership {
  id: string;
  organization_name: string;
  partnership_type: PartnershipType | null;
  contact_name: string | null;
  contact_email: string | null;
  status: PartnershipStatus;
  value_proposition: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingReport {
  id: string;
  report_period: string;
  report_date: string;
  summary: string | null;
  metrics: Record<string, unknown>;
  insights: string[] | null;
  recommendations: string[] | null;
  client_acknowledged: boolean;
  report_url: string | null;
  created_at: string;
}

export interface MarketingCommunication {
  id: string;
  communication_type: CommunicationType;
  title: string | null;
  content: string;
  from_agency: boolean;
  is_resolved: boolean;
  created_at: string;
}

export interface MarketingDocument {
  id: string;
  document_type: DocumentType;
  title: string;
  description: string | null;
  document_url: string | null;
  version: string;
  status: DocumentStatus;
  client_approved: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Dashboard / Analytics Types
// ============================================================================

export interface MarketingDashboardStats {
  totalDeliverables: number;
  completedDeliverables: number;
  inProgressDeliverables: number;
  pendingReviewDeliverables: number;
  upcomingContent: number;
  activeInfluencers: number;
  activePartnerships: number;
  unreadMessages: number;
}

export interface CategoryProgress {
  category: DeliverableCategory;
  total: number;
  completed: number;
  progress: number;
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface DeliverableCardProps {
  deliverable: MarketingDeliverable;
  onStatusChange?: (id: string, status: DeliverableStatus) => void;
  onFeedbackSubmit?: (id: string, feedback: string) => void;
  onApprove?: (id: string) => void;
}

export interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md';
}

// ============================================================================
// Tab Types
// ============================================================================

export type MarketingTab = 'overview' | 'strategy' | 'social' | 'influencers' | 'analytics' | 'communication';

