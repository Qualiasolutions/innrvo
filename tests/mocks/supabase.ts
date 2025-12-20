import { vi } from 'vitest';

// Mock user data
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
};

// Default mock data
export const mockCreditsData = {
  user_id: mockUser.id,
  total_credits: 10000,
  credits_used: 0,
  credits_remaining: 10000,
  last_updated: new Date().toISOString(),
};

export const mockUsageLimits = {
  user_id: mockUser.id,
  month_start: new Date().toISOString().slice(0, 7),
  credits_used: 0,
  credits_limit: 10000,
  clones_created: 0,
  clones_limit: 2,
};

// Create mock query builder
const createMockQueryBuilder = (mockData: any = null, mockError: any = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  then: vi.fn((resolve) => resolve({ data: mockData, error: mockError })),
});

// Mock Supabase client
export const createMockSupabase = (overrides: Partial<typeof mockCreditsData> = {}) => {
  const creditsData = { ...mockCreditsData, ...overrides };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: mockUser } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signUp: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'user_credits') {
        return createMockQueryBuilder(creditsData);
      }
      if (table === 'voice_usage_limits') {
        return createMockQueryBuilder(mockUsageLimits);
      }
      if (table === 'voice_cloning_usage') {
        return createMockQueryBuilder(null);
      }
      return createMockQueryBuilder(null);
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
};

// Default mock instance
export const mockSupabase = createMockSupabase();
