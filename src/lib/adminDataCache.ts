/**
 * Client-side cache for admin panel data
 * Reduces database queries by caching tab data with 5-minute TTL
 */

const DEBUG = import.meta.env?.DEV ?? false;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache - cleared on page refresh
const cache = new Map<string, CacheEntry<unknown>>();

// Cache TTL in milliseconds (5 minutes)
const DEFAULT_TTL = 5 * 60 * 1000;

// Cache keys
export const CACHE_KEYS = {
  USERS: 'admin_users',
  MEDITATIONS: 'admin_meditations',
  VOICE_PROFILES: 'admin_voice_profiles',
  TEMPLATES: 'admin_templates',
  TEMPLATE_CATEGORIES: 'admin_template_categories',
  TEMPLATE_SUBGROUPS: 'admin_template_subgroups',
  TEMPLATE_STATS: 'admin_template_stats',
  ACTIVITY_STATS: 'admin_activity_stats',
  ACTIVITY_SUMMARY: 'admin_activity_summary',
  ANALYTICS: 'admin_analytics',
  RECENT_SIGNUPS: 'admin_recent_signups',
  RECENT_MEDITATIONS: 'admin_recent_meditations',
} as const;

export type CacheKey = typeof CACHE_KEYS[keyof typeof CACHE_KEYS];

/**
 * Get cached data if not expired
 */
export function getCached<T>(key: CacheKey, ttl: number = DEFAULT_TTL): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (!entry) {
    if (DEBUG) console.log('[adminDataCache] Cache miss:', key);
    return null;
  }

  const age = Date.now() - entry.timestamp;
  if (age > ttl) {
    if (DEBUG) console.log('[adminDataCache] Cache expired:', key, `(${Math.round(age / 1000)}s old)`);
    cache.delete(key);
    return null;
  }

  if (DEBUG) console.log('[adminDataCache] Cache hit:', key, `(${Math.round(age / 1000)}s old)`);
  return entry.data;
}

/**
 * Store data in cache
 */
export function setCache<T>(key: CacheKey, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
  if (DEBUG) console.log('[adminDataCache] Cached:', key);
}

/**
 * Invalidate a specific cache entry
 */
export function invalidateCache(key: CacheKey): void {
  const deleted = cache.delete(key);
  if (DEBUG && deleted) console.log('[adminDataCache] Invalidated:', key);
}

/**
 * Invalidate multiple cache entries
 */
export function invalidateCacheKeys(keys: CacheKey[]): void {
  for (const key of keys) {
    invalidateCache(key);
  }
}

/**
 * Clear all admin data cache
 */
export function clearAllAdminCache(): void {
  const keys = Object.values(CACHE_KEYS);
  for (const key of keys) {
    cache.delete(key);
  }
  if (DEBUG) console.log('[adminDataCache] Cleared all cache');
}

/**
 * Invalidate user-related caches (after user delete/update)
 */
export function invalidateUserCaches(): void {
  invalidateCacheKeys([
    CACHE_KEYS.USERS,
    CACHE_KEYS.ANALYTICS,
    CACHE_KEYS.ACTIVITY_STATS,
    CACHE_KEYS.ACTIVITY_SUMMARY,
    CACHE_KEYS.RECENT_SIGNUPS,
  ]);
}

/**
 * Invalidate meditation-related caches
 */
export function invalidateMeditationCaches(): void {
  invalidateCacheKeys([
    CACHE_KEYS.MEDITATIONS,
    CACHE_KEYS.ANALYTICS,
    CACHE_KEYS.RECENT_MEDITATIONS,
    CACHE_KEYS.ACTIVITY_STATS,
  ]);
}

/**
 * Invalidate voice profile-related caches
 */
export function invalidateVoiceProfileCaches(): void {
  invalidateCacheKeys([
    CACHE_KEYS.VOICE_PROFILES,
    CACHE_KEYS.ANALYTICS,
    CACHE_KEYS.ACTIVITY_STATS,
  ]);
}

/**
 * Invalidate template-related caches
 */
export function invalidateTemplateCaches(): void {
  invalidateCacheKeys([
    CACHE_KEYS.TEMPLATES,
    CACHE_KEYS.TEMPLATE_CATEGORIES,
    CACHE_KEYS.TEMPLATE_SUBGROUPS,
    CACHE_KEYS.TEMPLATE_STATS,
  ]);
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats(): { entries: number; keys: string[] } {
  return {
    entries: cache.size,
    keys: Array.from(cache.keys()),
  };
}
