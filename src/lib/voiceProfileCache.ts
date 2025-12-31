/**
 * Client-side cache for voice profiles
 * Reduces database queries by saving 50-150ms per TTS request
 *
 * Performance Impact:
 * - Without cache: 50-150ms (database query + network)
 * - With cache: 1-5ms (localStorage read)
 * - Cache TTL: 15 minutes (voice profiles rarely change)
 *
 * Usage:
 * - Cache is automatically populated on getUserVoiceProfiles() call
 * - Cache is invalidated on create/update/delete operations
 * - Uses localStorage for persistence across sessions
 */

const CACHE_KEY = 'inrvo_voice_profiles';
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

export interface CachedVoiceProfiles {
  data: any[];
  timestamp: number;
  userId: string;
}

/**
 * Get cached voice profiles from localStorage
 * @returns Cached profiles or null if cache miss/expired/wrong user
 */
export function getCachedVoiceProfiles(userId: string): any[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedVoiceProfiles = JSON.parse(cached);

    // Check if cache is for the same user
    if (parsed.userId !== userId) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    const age = Date.now() - parsed.timestamp;

    // Check if cache is expired
    if (age > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed.data;
  } catch (err) {
    console.warn('[voiceProfileCache] Failed to read cache:', err);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Store voice profiles in localStorage cache
 */
export function setCachedVoiceProfiles(userId: string, data: any[]): void {
  try {
    const cached: CachedVoiceProfiles = {
      data,
      timestamp: Date.now(),
      userId,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (err) {
    // localStorage quota exceeded or disabled - fail silently
    console.warn('[voiceProfileCache] Failed to write cache:', err);
  }
}

/**
 * Clear voice profile cache
 * Called on create/update/delete operations
 */
export function clearVoiceProfileCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (err) {
    console.warn('[voiceProfileCache] Failed to clear cache:', err);
  }
}

/**
 * Get a single voice profile from cache by ID
 */
export function getCachedVoiceProfileById(userId: string, profileId: string): any | null {
  const profiles = getCachedVoiceProfiles(userId);
  if (!profiles) return null;
  return profiles.find(p => p.id === profileId) || null;
}

/**
 * Update a voice profile in the cache
 */
export function updateCachedVoiceProfile(userId: string, profileId: string, updates: any): void {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;

    const parsed: CachedVoiceProfiles = JSON.parse(cached);
    if (parsed.userId !== userId) return;

    const index = parsed.data.findIndex((p: any) => p.id === profileId);
    if (index !== -1) {
      parsed.data[index] = { ...parsed.data[index], ...updates };
      localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
    }
  } catch (err) {
    console.warn('[voiceProfileCache] Failed to update cache:', err);
  }
}

/**
 * Add a new voice profile to the cache
 */
export function addToCachedVoiceProfiles(userId: string, profile: any): void {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;

    const parsed: CachedVoiceProfiles = JSON.parse(cached);
    if (parsed.userId !== userId) return;

    // Add new profile at the beginning (most recent first)
    parsed.data = [profile, ...parsed.data];
    parsed.timestamp = Date.now();
    localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
  } catch (err) {
    console.warn('[voiceProfileCache] Failed to add to cache:', err);
  }
}

/**
 * Remove a voice profile from the cache
 */
export function removeFromCachedVoiceProfiles(userId: string, profileId: string): void {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;

    const parsed: CachedVoiceProfiles = JSON.parse(cached);
    if (parsed.userId !== userId) return;

    parsed.data = parsed.data.filter((p: any) => p.id !== profileId);
    localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
  } catch (err) {
    console.warn('[voiceProfileCache] Failed to remove from cache:', err);
  }
}

/**
 * Check if cache is valid
 */
export function isVoiceProfileCacheValid(userId: string): boolean {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return false;

    const parsed: CachedVoiceProfiles = JSON.parse(cached);
    if (parsed.userId !== userId) return false;

    const age = Date.now() - parsed.timestamp;
    return age < CACHE_TTL;
  } catch {
    return false;
  }
}
