import { ApiClient } from './client';
import {
  ApiConfig,
  ChatRoom,
  ChatMessage,
  PaginationParams,
  SortParams,
  FilterParams,
  ApiResponse,
  PaginatedResponse,
} from './types';

// Chat Rooms API
export class ChatRoomApi extends ApiClient {
  constructor(config: ApiConfig) {
    super(config, 'chat_rooms');
  }
  // Resolve a room id by name and project id
  async getRoomIdByNameAndProject(
    name: string,
    project_id: string
  ): Promise<ApiResponse<string>> {
    const { data, error } = await this.client
      .from('chat_rooms')
      .select('id')
      .eq('name', name)
      .eq('project_id', project_id)
      .single();

    return { data: data?.id ?? null, error };
  }
}


// Chat Messages API
export class ChatMessageApi extends ApiClient {

  constructor(config: ApiConfig) {
    super(config, 'chat_messages');
  }

  // List messages by room with joined user name
  async listByRoom(
    room_id: string,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<ChatMessage & { user: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    created_at: string;
    updated_at: string;
    last_active_at: string;
  }}>> {
    let query = this.client
      .from('chat_messages')
      .select(`*, user:user_id(id, email, name, avatar_url, created_at, updated_at, last_active_at)`)
      .eq('room_id', room_id)
      .eq('is_deleted', false);

    // Apply sorting if provided
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    }
    // Apply pagination if provided
    if (pagination) {
      const { page, per_page } = pagination;
      const from = (page - 1) * per_page;
      const to = from + per_page - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    return {
      data: {
        items: data || [],
        total: count ?? data?.length ?? 0,
        page: pagination?.page ?? 1,
        per_page: pagination?.per_page ?? (data?.length ?? 0)
      },
      error
    };
  }

  // Soft delete a message
  async softDelete(id: string): Promise<ApiResponse<ChatMessage>> {
    return this.update<ChatMessage>(id, { is_deleted: true , updated_at: new Date().toISOString() });
  }
}
