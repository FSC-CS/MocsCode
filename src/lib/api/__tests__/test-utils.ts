import { beforeEach, vi } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { ApiConfig } from '../types';

export const createMockQuery = (defaultResponses: Record<string, any>) => {
  const createMockChainable = (response: any) => ({
    select: vi.fn().mockImplementation(() => createMockChainable(response)),
    eq: vi.fn().mockImplementation(() => createMockChainable(response)),
    or: vi.fn().mockImplementation(() => createMockChainable(response)),
    ilike: vi.fn().mockImplementation(() => createMockChainable(response)),
    range: vi.fn().mockImplementation(() => createMockChainable(response)),
    order: vi.fn().mockImplementation(() => createMockChainable(response)),
    single: vi.fn().mockResolvedValue(response),
    execute: vi.fn().mockResolvedValue(response),
    then: vi.fn().mockImplementation((callback) => 
      Promise.resolve(callback ? callback(response) : response)
    ),
    catch: vi.fn().mockImplementation((callback) => 
      response.error ? Promise.resolve(callback(response.error)) : Promise.resolve(response)
    ),
  });

  const mockQuery = {
    select: vi.fn().mockImplementation((columns?: string, { count } = {}) => {
      const response = {
        ...defaultResponses.select,
        count: count === 'exact' ? defaultResponses.select?.count || 0 : undefined,
      };
      return createMockChainable(response);
    }),
    insert: vi.fn().mockImplementation((data) => ({
      ...createMockChainable(defaultResponses.insert),
      select: vi.fn().mockImplementation(() => 
        createMockChainable(defaultResponses.insert)
      ),
    })),
    update: vi.fn().mockImplementation((data) => ({
      ...createMockChainable(defaultResponses.update),
      eq: vi.fn().mockImplementation(() => ({
        ...createMockChainable(defaultResponses.update),
        select: vi.fn().mockImplementation(() => 
          createMockChainable(defaultResponses.update)
        ),
      })),
    })),
    delete: vi.fn().mockImplementation(() => 
      createMockChainable(defaultResponses.delete)
    ),
  };

  return mockQuery;
};

export const createMockSupabaseClient = (
  customResponses: Record<string, any> = {}
): SupabaseClient => {
  const defaultResponses = {
    select: { data: [], error: null, count: 0 },
    insert: { data: null, error: null },
    update: { data: null, error: null },
    delete: { data: null, error: null },
    ...customResponses,
  };

  const mockQuery = createMockQuery(defaultResponses);
  return {
    from: vi.fn().mockReturnValue(mockQuery),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id' },
          },
        },
      }),
    },
  } as unknown as SupabaseClient;
};

export const createTestApiConfig = (
  customResponses?: Record<string, any>
): ApiConfig => ({
  client: createMockSupabaseClient(customResponses),
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
