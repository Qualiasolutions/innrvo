/**
 * Marketing Portal Data Cache
 * Client-side caching for marketing data
 */

const CACHE_PREFIX = 'inrvo_marketing_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export const MARKETING_CACHE_KEYS = {
  DASHBOARD_STATS: 'dashboard_stats',
  DELIVERABLES: 'deliverables',
  DELIVERABLES_BY_CATEGORY: 'deliverables_by_category',
  CLIENT_INPUTS: 'client_inputs',
  CONTENT_CALENDAR: 'content_calendar',
  INFLUENCERS: 'influencers',
  PARTNERSHIPS: 'partnerships',
  REPORTS: 'reports',
  COMMUNICATIONS: 'communications',
  DOCUMENTS: 'documents',
} as const;

/**
 * Get cached data if still valid
 */
export function getCached<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (!stored) return null;

    const entry: CacheEntry<T> = JSON.parse(stored);
    const now = Date.now();

    if (now - entry.timestamp > entry.ttl) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Set cache with TTL
 */
export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (error) {
    console.warn('[marketingDataCache] Failed to set cache:', error);
  }
}

/**
 * Invalidate specific cache key
 */
export function invalidateCache(key: string): void {
  localStorage.removeItem(CACHE_PREFIX + key);
}

/**
 * Invalidate all deliverable-related caches
 */
export function invalidateDeliverableCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.DELIVERABLES);
  invalidateCache(MARKETING_CACHE_KEYS.DELIVERABLES_BY_CATEGORY);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

/**
 * Invalidate all calendar-related caches
 */
export function invalidateCalendarCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.CONTENT_CALENDAR);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

/**
 * Invalidate all influencer-related caches
 */
export function invalidateInfluencerCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.INFLUENCERS);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

/**
 * Invalidate all partnership-related caches
 */
export function invalidatePartnershipCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.PARTNERSHIPS);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

/**
 * Invalidate all communication-related caches
 */
export function invalidateCommunicationCaches(): void {
  invalidateCache(MARKETING_CACHE_KEYS.COMMUNICATIONS);
  invalidateCache(MARKETING_CACHE_KEYS.DASHBOARD_STATS);
}

/**
 * Clear all marketing caches
 */
export function clearAllMarketingCache(): void {
  Object.values(MARKETING_CACHE_KEYS).forEach(key => {
    invalidateCache(key);
  });
}
