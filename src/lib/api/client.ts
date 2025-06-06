import { SupabaseClient } from '@supabase/supabase-js';
import { ApiConfig, ApiResponse, PaginatedResponse, PaginationParams, SortParams, FilterParams } from './types';

export class ApiClient {
  protected client: SupabaseClient;
  protected table: string;

  constructor(config: ApiConfig, table: string) {
    this.client = config.client;
    this.table = table;
  }

  protected async get<T>(id: string): Promise<ApiResponse<T>> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    return {
      data: data as T,
      error: error as Error | null,
    };
  }

  protected async list<T>(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: FilterParams
  ): Promise<PaginatedResponse<T>> {
    const { page = 1, per_page = 10 } = pagination || {};
    let query = this.client.from(this.table).select('*', { count: 'exact' });

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    }

    // Apply pagination
    const start = (page - 1) * per_page;
    query = query.range(start, start + per_page - 1);

    const { data, error, count } = await query;

    return {
      data: {
        items: (data || []) as T[],
        total: count || 0,
        page,
        per_page,
      },
      error: error as Error | null,
    };
  }

  protected async create<T>(data: Partial<T>): Promise<ApiResponse<T>> {
    const { data: created, error } = await this.client
      .from(this.table)
      .insert(data)
      .select()
      .single();

    return {
      data: created as T,
      error: error as Error | null,
    };
  }

  protected async update<T>(id: string, data: Partial<T>): Promise<ApiResponse<T>> {
    const { data: updated, error } = await this.client
      .from(this.table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    return {
      data: updated as T,
      error: error as Error | null,
    };
  }

  protected async delete(id: string): Promise<ApiResponse<null>> {
    const { error } = await this.client
      .from(this.table)
      .delete()
      .eq('id', id);

    return {
      data: null,
      error: error as Error | null,
    };
  }
}
