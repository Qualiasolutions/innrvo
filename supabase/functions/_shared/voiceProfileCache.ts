/**
 * Shared Voice Profile Cache Module with LRU Eviction
 *
 * This module provides a centralized voice profile cache for all edge functions.
 * Prevents memory leaks through LRU (Least Recently Used) eviction policy.
 *
 * Performance Impact:
 * - Cache hit: 0ms (vs 50-150ms database query)
 * - Cache TTL: 1 hour (voice profiles rarely change)
 * - Max entries: 1000 (prevents unbounded memory growth)
 *
 * Usage:
 * import { getCachedVoiceProfile, cleanupVoiceCache } from '../_shared/voiceProfileCache.ts';
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ============================================================================
// Types
// ============================================================================

export interface VoiceProfileData {
  fish_audio_model_id: string | null;
  voice_sample_url: string | null;
  provider: string | null;
}

interface CachedVoiceProfile {
  data: VoiceProfileData;
  expiry: number;
  lastAccessed: number; // For LRU tracking
}

// ============================================================================
// Configuration
// ============================================================================

const VOICE_CACHE_TTL = 3600000; // 1 hour
const MAX_CACHE_SIZE = 1000; // Maximum entries before LRU eviction
const CLEANUP_INTERVAL = 300000; // 5 minutes (fixed from previous bug)
const LRU_EVICT_COUNT = 100; // Number of entries to evict when max reached

// ============================================================================
// Cache Store
// ============================================================================

const voiceProfileCache = new Map<string, CachedVoiceProfile>();

// ============================================================================
// LRU Eviction
// ============================================================================

/**
 * Evict least recently used entries when cache exceeds max size
 */
function evictLRU(): void {
  if (voiceProfileCache.size <= MAX_CACHE_SIZE) return;

  // Convert to array and sort by lastAccessed (oldest first)
  const entries = Array.from(voiceProfileCache.entries())
    .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

  // Remove oldest entries
  const toRemove = entries.slice(0, LRU_EVICT_COUNT);
  for (const [key] of toRemove) {
    voiceProfileCache.delete(key);
  }

  console.log(`[voiceProfileCache] LRU evicted ${toRemove.length} entries, size now: ${voiceProfileCache.size}`);
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Get voice profile from cache or fetch from database
 */
export async function getCachedVoiceProfile(
  supabase: ReturnType<typeof createClient>,
  voiceId: string,
  userId: string,
  logger?: { info: (msg: string, data?: any) => void; warn: (msg: string, data?: any) => void }
): Promise<VoiceProfileData | null> {
  const cacheKey = `${userId}:${voiceId}`;
  const cached = voiceProfileCache.get(cacheKey);
  const now = Date.now();

  // Check cache hit and not expired
  if (cached && now < cached.expiry) {
    // Update last accessed time for LRU
    cached.lastAccessed = now;
    logger?.info('Voice profile cache hit', { voiceId });
    return cached.data;
  }

  // Cache miss - fetch from database
  logger?.info('Voice profile cache miss, fetching from database', { voiceId });

  const { data, error } = await supabase
    .from('voice_profiles')
    .select('fish_audio_model_id, voice_sample_url, provider')
    .eq('id', voiceId)
    .eq('user_id', userId)
    .single();

  if (error) {
    logger?.warn('Failed to fetch voice profile', { error: error.message });
    return null;
  }

  if (!data) {
    return null;
  }

  // Check if we need LRU eviction before adding
  if (voiceProfileCache.size >= MAX_CACHE_SIZE) {
    evictLRU();
  }

  // Store in cache
  const profileData: VoiceProfileData = {
    fish_audio_model_id: data.fish_audio_model_id,
    voice_sample_url: data.voice_sample_url,
    provider: data.provider,
  };

  voiceProfileCache.set(cacheKey, {
    data: profileData,
    expiry: now + VOICE_CACHE_TTL,
    lastAccessed: now,
  });

  logger?.info('Voice profile cached', { voiceId, cacheSize: voiceProfileCache.size });

  return profileData;
}

/**
 * Invalidate cache for a specific voice profile
 */
export function invalidateVoiceProfile(userId: string, voiceId: string): void {
  const cacheKey = `${userId}:${voiceId}`;
  voiceProfileCache.delete(cacheKey);
}

/**
 * Invalidate all cache entries for a user
 */
export function invalidateUserVoiceProfiles(userId: string): void {
  for (const key of voiceProfileCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      voiceProfileCache.delete(key);
    }
  }
}

/**
 * Clean up expired entries from cache
 * Called periodically by cleanup interval
 */
export function cleanupVoiceCache(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, value] of voiceProfileCache.entries()) {
    if (now > value.expiry) {
      voiceProfileCache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[voiceProfileCache] Cleaned ${cleaned} expired entries, size now: ${voiceProfileCache.size}`);
  }
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return {
    size: voiceProfileCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: VOICE_CACHE_TTL,
  };
}

// ============================================================================
// Periodic Cleanup (every 5 minutes)
// ============================================================================

// Start cleanup interval (runs every 5 minutes, NOT every hour like the bug)
setInterval(cleanupVoiceCache, CLEANUP_INTERVAL);
