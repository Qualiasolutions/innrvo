/**
 * Marketing Portal Supabase Service Layer
 * CRUD operations for all marketing tables
 */

import { supabase, withRetry } from '../../lib/supabase';
import {
  getCached,
  setCache,
  MARKETING_CACHE_KEYS,
  invalidateDeliverableCaches,
  invalidateCalendarCaches,
  invalidateInfluencerCaches,
  invalidatePartnershipCaches,
  invalidateCommunicationCaches,
} from './marketingDataCache';
import type {
  MarketingDeliverable,
  MarketingClientInput,
  MarketingContentCalendar,
  MarketingInfluencer,
  MarketingPartnership,
  MarketingReport,
  MarketingCommunication,
  MarketingDocument,
  MarketingDashboardStats,
  CategoryProgress,
  DeliverableCategory,
  DeliverableStatus,
  CalendarStatus,
  InfluencerStatus,
  PartnershipStatus,
} from '../types/marketing';

const DEBUG = import.meta.env?.DEV ?? false;

// ============================================================================
// Dashboard Analytics
// ============================================================================

export async function getMarketingDashboardStats(
  useCache: boolean = true
): Promise<MarketingDashboardStats> {
  if (useCache) {
    const cached = getCached<MarketingDashboardStats>(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
    if (cached) return cached;
  }

  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const [
      deliverablesRes,
      calendarRes,
      influencersRes,
      partnershipsRes,
      communicationsRes,
    ] = await Promise.all([
      supabase!.from('marketing_deliverables').select('status'),
      supabase!.from('marketing_content_calendar').select('id').gte('scheduled_date', new Date().toISOString().split('T')[0]),
      supabase!.from('marketing_influencers').select('id').in('status', ['contacted', 'negotiating', 'agreed', 'content_live']),
      supabase!.from('marketing_partnerships').select('id').in('status', ['outreach', 'discussing', 'agreed', 'active']),
      supabase!.from('marketing_communications').select('id').eq('is_resolved', false),
    ]);

    const deliverables = deliverablesRes.data || [];
    const completedCount = deliverables.filter(d => d.status === 'completed').length;
    const inProgressCount = deliverables.filter(d => d.status === 'in_progress').length;
    const pendingReviewCount = deliverables.filter(d => d.status === 'pending_review').length;

    const result: MarketingDashboardStats = {
      totalDeliverables: deliverables.length,
      completedDeliverables: completedCount,
      inProgressDeliverables: inProgressCount,
      pendingReviewDeliverables: pendingReviewCount,
      upcomingContent: calendarRes.data?.length || 0,
      activeInfluencers: influencersRes.data?.length || 0,
      activePartnerships: partnershipsRes.data?.length || 0,
      unreadMessages: communicationsRes.data?.length || 0,
    };

    setCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS, result);
    return result;
  });
}

export async function getCategoryProgress(): Promise<CategoryProgress[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase!
      .from('marketing_deliverables')
      .select('category, status, progress');

    if (error) throw error;

    const categories: DeliverableCategory[] = ['strategy', 'social', 'influencer', 'analytics'];

    return categories.map(category => {
      const items = data?.filter(d => d.category === category) || [];
      const total = items.length;
      const completed = items.filter(d => d.status === 'completed').length;
      const avgProgress = total > 0
        ? Math.round(items.reduce((sum, d) => sum + (d.progress || 0), 0) / total)
        : 0;

      return {
        category,
        total,
        completed,
        progress: avgProgress,
      };
    });
  });
}

// ============================================================================
// Deliverables CRUD
// ============================================================================

export async function getDeliverables(
  options?: {
    category?: DeliverableCategory;
    status?: DeliverableStatus;
  }
): Promise<MarketingDeliverable[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    let query = supabase!
      .from('marketing_deliverables')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false });

    if (options?.category) {
      query = query.eq('category', options.category);
    }
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (DEBUG) console.log('[marketingSupabase] Fetched deliverables:', data?.length);
    return data || [];
  });
}

export async function getDeliverablesByCategory(): Promise<Record<DeliverableCategory, MarketingDeliverable[]>> {
  const cached = getCached<Record<DeliverableCategory, MarketingDeliverable[]>>(
    MARKETING_CACHE_KEYS.DELIVERABLES_BY_CATEGORY
  );
  if (cached) return cached;

  const all = await getDeliverables();

  const result: Record<DeliverableCategory, MarketingDeliverable[]> = {
    strategy: [],
    social: [],
    influencer: [],
    analytics: [],
  };

  all.forEach(d => {
    if (d.category in result) {
      result[d.category].push(d);
    }
  });

  setCache(MARKETING_CACHE_KEYS.DELIVERABLES_BY_CATEGORY, result);
  return result;
}

export async function updateDeliverableStatus(
  id: string,
  status: DeliverableStatus,
  progress?: number
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const updates: Partial<MarketingDeliverable> = { status };
    if (progress !== undefined) {
      updates.progress = progress;
    }
    if (status === 'completed') {
      updates.progress = 100;
    }

    const { error } = await supabase!
      .from('marketing_deliverables')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    invalidateDeliverableCaches();
  });
}

export async function updateDeliverableFeedback(
  id: string,
  feedback: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_deliverables')
      .update({ client_feedback: feedback })
      .eq('id', id);

    if (error) throw error;
    invalidateDeliverableCaches();
  });
}

// ============================================================================
// Client Inputs CRUD
// ============================================================================

export async function getClientInputs(): Promise<MarketingClientInput[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase!
      .from('marketing_client_inputs')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  });
}

export async function updateClientInput(
  id: string,
  content: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_client_inputs')
      .update({ content })
      .eq('id', id);

    if (error) throw error;
  });
}

export async function createClientInput(
  input: Omit<MarketingClientInput, 'id' | 'submitted_at'>
): Promise<MarketingClientInput> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase!
      .from('marketing_client_inputs')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

// ============================================================================
// Content Calendar CRUD
// ============================================================================

export async function getContentCalendar(
  options?: {
    startDate?: string;
    endDate?: string;
    platform?: string;
    status?: CalendarStatus;
  }
): Promise<MarketingContentCalendar[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    let query = supabase!
      .from('marketing_content_calendar')
      .select('*')
      .order('scheduled_date', { ascending: true });

    if (options?.startDate) {
      query = query.gte('scheduled_date', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('scheduled_date', options.endDate);
    }
    if (options?.platform) {
      query = query.eq('platform', options.platform);
    }
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  });
}

export async function approveContent(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_content_calendar')
      .update({ client_approved: true, status: 'approved' })
      .eq('id', id);

    if (error) throw error;
    invalidateCalendarCaches();
  });
}

export async function requestContentChanges(
  id: string,
  feedback: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    // Create a communication for the feedback
    await supabase!
      .from('marketing_communications')
      .insert({
        communication_type: 'feedback',
        title: 'Content Change Request',
        content: feedback,
        from_agency: false,
      });

    // Update content status back to created
    const { error } = await supabase!
      .from('marketing_content_calendar')
      .update({ status: 'created', client_approved: false })
      .eq('id', id);

    if (error) throw error;
    invalidateCalendarCaches();
    invalidateCommunicationCaches();
  });
}

// ============================================================================
// Influencers CRUD
// ============================================================================

export async function getInfluencers(
  options?: { status?: InfluencerStatus }
): Promise<MarketingInfluencer[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    let query = supabase!
      .from('marketing_influencers')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  });
}

export async function getInfluencersByStatus(): Promise<Record<InfluencerStatus, MarketingInfluencer[]>> {
  const all = await getInfluencers();

  const result: Record<InfluencerStatus, MarketingInfluencer[]> = {
    researching: [],
    contacted: [],
    negotiating: [],
    agreed: [],
    content_live: [],
    completed: [],
    declined: [],
  };

  all.forEach(inf => {
    if (inf.status in result) {
      result[inf.status].push(inf);
    }
  });

  return result;
}

export async function updateInfluencerStatus(
  id: string,
  status: InfluencerStatus
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_influencers')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    invalidateInfluencerCaches();
  });
}

export async function suggestInfluencer(
  suggestion: {
    name: string;
    handle?: string;
    platform: string;
    notes?: string;
  }
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  // Create a communication for the suggestion
  await supabase!
    .from('marketing_communications')
    .insert({
      communication_type: 'feedback',
      title: 'Influencer Suggestion',
      content: `Suggested influencer: ${suggestion.name} (@${suggestion.handle || 'N/A'}) on ${suggestion.platform}. Notes: ${suggestion.notes || 'None'}`,
      from_agency: false,
    });

  invalidateCommunicationCaches();
}

// ============================================================================
// Partnerships CRUD
// ============================================================================

export async function getPartnerships(
  options?: { status?: PartnershipStatus }
): Promise<MarketingPartnership[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    let query = supabase!
      .from('marketing_partnerships')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  });
}

export async function suggestPartnership(
  suggestion: {
    organization_name: string;
    partnership_type?: string;
    notes?: string;
  }
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  // Create a communication for the suggestion
  await supabase!
    .from('marketing_communications')
    .insert({
      communication_type: 'feedback',
      title: 'Partnership Suggestion',
      content: `Suggested partner: ${suggestion.organization_name} (${suggestion.partnership_type || 'TBD'}). Notes: ${suggestion.notes || 'None'}`,
      from_agency: false,
    });

  invalidateCommunicationCaches();
}

// ============================================================================
// Reports CRUD
// ============================================================================

export async function getReports(
  options?: { limit?: number }
): Promise<MarketingReport[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    let query = supabase!
      .from('marketing_reports')
      .select('*')
      .order('report_date', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  });
}

export async function acknowledgeReport(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_reports')
      .update({ client_acknowledged: true })
      .eq('id', id);

    if (error) throw error;
  });
}

// ============================================================================
// Communications CRUD
// ============================================================================

export async function getCommunications(
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<MarketingCommunication[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    let query = supabase!
      .from('marketing_communications')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq('is_resolved', false);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  });
}

export async function createCommunication(
  communication: Omit<MarketingCommunication, 'id' | 'created_at'>
): Promise<MarketingCommunication> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase!
      .from('marketing_communications')
      .insert(communication)
      .select()
      .single();

    if (error) throw error;
    invalidateCommunicationCaches();
    return data;
  });
}

export async function markCommunicationResolved(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_communications')
      .update({ is_resolved: true })
      .eq('id', id);

    if (error) throw error;
    invalidateCommunicationCaches();
  });
}

// ============================================================================
// Documents CRUD
// ============================================================================

export async function getDocuments(
  options?: { type?: string; clientVisible?: boolean }
): Promise<MarketingDocument[]> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    let query = supabase!
      .from('marketing_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.type) {
      query = query.eq('document_type', options.type);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  });
}

export async function approveDocument(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_documents')
      .update({ client_approved: true, status: 'approved' })
      .eq('id', id);

    if (error) throw error;
  });
}
