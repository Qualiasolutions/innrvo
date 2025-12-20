import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockUser, mockCreditsData, mockUsageLimits, createMockSupabase } from '../mocks/supabase';

// Mock the supabase import before importing creditService
vi.mock('../../lib/supabase', () => ({
  supabase: createMockSupabase(),
}));

import { creditService } from '../../src/lib/credits';
import { supabase } from '../../lib/supabase';

describe('creditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateTTSCost', () => {
    it('should calculate cost for empty string as 0', () => {
      expect(creditService.calculateTTSCost('')).toBe(0);
    });

    it('should calculate cost for 1000 characters as 280 credits', () => {
      const text = 'a'.repeat(1000);
      expect(creditService.calculateTTSCost(text)).toBe(280);
    });

    it('should round up for partial thousands', () => {
      // 1 character = 0.001 * 280 = 0.28, rounds up to 1
      expect(creditService.calculateTTSCost('a')).toBe(1);
    });

    it('should calculate cost for 1001 characters as 281 credits', () => {
      const text = 'a'.repeat(1001);
      // 1001 / 1000 * 280 = 280.28, ceil = 281
      expect(creditService.calculateTTSCost(text)).toBe(281);
    });

    it('should calculate cost for 2000 characters as 560 credits', () => {
      const text = 'a'.repeat(2000);
      expect(creditService.calculateTTSCost(text)).toBe(560);
    });

    it('should calculate cost for very large text (10K chars)', () => {
      const text = 'a'.repeat(10000);
      // 10000 / 1000 * 280 = 2800
      expect(creditService.calculateTTSCost(text)).toBe(2800);
    });

    it('should estimate cost based on word count', () => {
      // 100 words * 5 chars/word = 500 chars
      // 500 / 1000 * 280 = 140
      expect(creditService.calculateTTSCost('', 100)).toBe(140);
    });

    it('should estimate cost for 150 words (typical meditation)', () => {
      // 150 words * 5 chars/word = 750 chars
      // 750 / 1000 * 280 = 210
      expect(creditService.calculateTTSCost('', 150)).toBe(210);
    });

    it('should prefer estimated words over actual text if provided', () => {
      // Text has 5 chars, but we estimate for 100 words
      expect(creditService.calculateTTSCost('hello', 100)).toBe(140);
    });

    it('should handle unicode characters correctly', () => {
      // Unicode chars count as 1 char in JavaScript strings
      const text = '你好世界'.repeat(250); // 1000 chars
      expect(creditService.calculateTTSCost(text)).toBe(280);
    });

    it('should handle emoji correctly', () => {
      // Emoji are typically 2 chars in JavaScript (surrogate pairs)
      const text = '😀'.repeat(500); // Actually 1000 chars due to surrogate pairs
      expect(creditService.calculateTTSCost(text)).toBe(280);
    });
  });

  describe('getCostConfig', () => {
    it('should return immutable copy of cost config', () => {
      const config1 = creditService.getCostConfig();
      const config2 = creditService.getCostConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });

    it('should have correct VOICE_CLONE cost', () => {
      const config = creditService.getCostConfig();
      expect(config.VOICE_CLONE).toBe(5000);
    });

    it('should have correct TTS_1K_CHARS cost', () => {
      const config = creditService.getCostConfig();
      expect(config.TTS_1K_CHARS).toBe(280);
    });

    it('should have correct FREE_MONTHLY_CREDITS', () => {
      const config = creditService.getCostConfig();
      expect(config.FREE_MONTHLY_CREDITS).toBe(10000);
    });

    it('should have correct FREE_MONTHLY_CLONES', () => {
      const config = creditService.getCostConfig();
      expect(config.FREE_MONTHLY_CLONES).toBe(2);
    });
  });

  describe('getCredits', () => {
    it('should return credits for authenticated user', async () => {
      const credits = await creditService.getCredits(mockUser.id);
      expect(credits).toBe(10000);
    });

    it('should fetch current user if no userId provided', async () => {
      const credits = await creditService.getCredits();
      expect(supabase.auth.getUser).toHaveBeenCalled();
    });

    it('should throw error for unauthenticated user with no userId', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await expect(creditService.getCredits()).rejects.toThrow('User not authenticated');
    });

    it('should initialize credits if user has no record (PGRST116)', async () => {
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      } as any);

      // Mock the upsert call for initialization
      mockFrom.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const credits = await creditService.getCredits(mockUser.id);
      expect(credits).toBe(10000); // Returns FREE_MONTHLY_CREDITS
    });

    it('should throw on database error', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'OTHER_ERROR', message: 'Database error' },
        }),
      } as any);

      await expect(creditService.getCredits(mockUser.id)).rejects.toThrow();
    });

    it('should return 0 if credits_remaining is null', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { credits_remaining: null },
          error: null,
        }),
      } as any);

      const credits = await creditService.getCredits(mockUser.id);
      expect(credits).toBe(0);
    });
  });

  describe('canClone', () => {
    it('should return can: true when user has sufficient credits and clones', async () => {
      const result = await creditService.canClone(mockUser.id);
      expect(result.can).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return can: false when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await creditService.canClone();
      expect(result.can).toBe(false);
      expect(result.reason).toBe('User not authenticated');
    });

    it('should return can: false when credits are insufficient', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { credits_remaining: 4999 }, // Just below 5000
          error: null,
        }),
      } as any);

      const result = await creditService.canClone(mockUser.id);
      expect(result.can).toBe(false);
      expect(result.reason).toContain('Insufficient credits');
      expect(result.reason).toContain('5000');
    });

    it('should return can: false when monthly clone limit reached', async () => {
      // First call for getCredits - sufficient credits
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { credits_remaining: 10000 },
          error: null,
        }),
      } as any);

      // Second call for getMonthlyUsageLimits - limit reached
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockUsageLimits, clones_created: 2, clones_limit: 2 },
          error: null,
        }),
      } as any);

      const result = await creditService.canClone(mockUser.id);
      expect(result.can).toBe(false);
      expect(result.reason).toContain('Monthly clone limit reached');
      expect(result.reason).toContain('2/2');
    });

    it('should allow clone when exactly at credit threshold', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { credits_remaining: 5000 }, // Exactly 5000
          error: null,
        }),
      } as any);

      // Mock for getMonthlyUsageLimits
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUsageLimits,
          error: null,
        }),
      } as any);

      const result = await creditService.canClone(mockUser.id);
      expect(result.can).toBe(true);
    });
  });

  describe('getClonesRemaining', () => {
    it('should return remaining clones', async () => {
      const remaining = await creditService.getClonesRemaining(mockUser.id);
      expect(remaining).toBe(2); // clones_limit (2) - clones_created (0)
    });

    it('should return 0 for unauthenticated user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const remaining = await creditService.getClonesRemaining();
      expect(remaining).toBe(0);
    });

    it('should return 0 when all clones used', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockUsageLimits, clones_created: 2, clones_limit: 2 },
          error: null,
        }),
      } as any);

      const remaining = await creditService.getClonesRemaining(mockUser.id);
      expect(remaining).toBe(0);
    });

    it('should never return negative (use Math.max)', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockUsageLimits, clones_created: 5, clones_limit: 2 }, // Over limit
          error: null,
        }),
      } as any);

      const remaining = await creditService.getClonesRemaining(mockUser.id);
      expect(remaining).toBe(0);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('deductCredits', () => {
    it('should deduct credits successfully', async () => {
      const result = await creditService.deductCredits(
        1000,
        'TTS_GENERATE',
        'voice-123',
        mockUser.id
      );
      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('deduct_credits', {
        p_user_id: mockUser.id,
        p_amount: 1000,
      });
    });

    it('should return false when insufficient credits', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { credits_remaining: 500 },
          error: null,
        }),
      } as any);

      const result = await creditService.deductCredits(
        1000,
        'TTS_GENERATE',
        undefined,
        mockUser.id
      );
      expect(result).toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should return false when RPC fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' },
      });

      const result = await creditService.deductCredits(
        100,
        'TTS_GENERATE',
        undefined,
        mockUser.id
      );
      expect(result).toBe(false);
    });

    it('should update monthly clones for CLONE_CREATE operation', async () => {
      const updateMonthlySpy = vi.spyOn(creditService, 'updateMonthlyClones');

      await creditService.deductCredits(
        5000,
        'CLONE_CREATE',
        'voice-123',
        mockUser.id
      );

      expect(updateMonthlySpy).toHaveBeenCalledWith(mockUser.id);
    });

    it('should not update monthly clones for TTS_GENERATE operation', async () => {
      const updateMonthlySpy = vi.spyOn(creditService, 'updateMonthlyClones');

      await creditService.deductCredits(
        1000,
        'TTS_GENERATE',
        undefined,
        mockUser.id
      );

      expect(updateMonthlySpy).not.toHaveBeenCalled();
    });

    it('should track usage after successful deduction', async () => {
      const trackUsageSpy = vi.spyOn(creditService, 'trackUsage');

      await creditService.deductCredits(
        1000,
        'TTS_GENERATE',
        'voice-123',
        mockUser.id
      );

      expect(trackUsageSpy).toHaveBeenCalledWith(
        mockUser.id,
        'voice-123',
        1000,
        'TTS_GENERATE'
      );
    });
  });

  describe('getMonthlyUsageLimits', () => {
    it('should return current month limits', async () => {
      const limits = await creditService.getMonthlyUsageLimits(mockUser.id);
      expect(limits.credits_limit).toBe(10000);
      expect(limits.clones_limit).toBe(2);
    });

    it('should initialize limits if not found (PGRST116)', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      } as any);

      // Mock upsert for initialization
      vi.mocked(supabase.from).mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const limits = await creditService.getMonthlyUsageLimits(mockUser.id);
      expect(limits.credits_used).toBe(0);
      expect(limits.clones_created).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent deduction attempts safely', async () => {
      // Reset mock counts before this test
      vi.mocked(supabase.rpc).mockClear();

      // Simulate two concurrent deductions
      const promise1 = creditService.deductCredits(5000, 'CLONE_CREATE', 'v1', mockUser.id);
      const promise2 = creditService.deductCredits(5000, 'CLONE_CREATE', 'v2', mockUser.id);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should call deduct_credits RPC (increment_clone_count is also called)
      // So we expect at least 2 calls to deduct_credits
      const deductCalls = vi.mocked(supabase.rpc).mock.calls.filter(
        call => call[0] === 'deduct_credits'
      );
      expect(deductCalls.length).toBe(2);
    });

    it('should handle credits exactly at cost threshold', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { credits_remaining: 5000 },
          error: null,
        }),
      } as any);

      const result = await creditService.deductCredits(5000, 'CLONE_CREATE', 'v1', mockUser.id);
      expect(result).toBe(true);
    });

    it('should reject deduction when credits are 1 below cost', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { credits_remaining: 4999 },
          error: null,
        }),
      } as any);

      const result = await creditService.deductCredits(5000, 'CLONE_CREATE', 'v1', mockUser.id);
      expect(result).toBe(false);
    });
  });
});
