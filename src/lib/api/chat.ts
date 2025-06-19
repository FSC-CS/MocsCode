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

  // List messages by room, with pagination and sorting, only non-deleted
  async listByRoom(
    room_id: string,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<ChatMessage>> {
    return this.list<ChatMessage>(
      pagination,
      sort,
      { room_id, is_deleted: false } as FilterParams
    );
  }

  // Soft delete a message
  async softDelete(id: string): Promise<ApiResponse<ChatMessage>> {
    return this.update<ChatMessage>(id, { is_deleted: true , updated_at: new Date().toISOString() });
  }

  // List messages by room name and project id
  async listByRoomNameAndProject(
    roomName: string,
    projectId: string,
    chatRoomApi: ChatRoomApi,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<ChatMessage> | null> {
    const { data: roomId, error } = await chatRoomApi.getRoomIdByNameAndProject(roomName, projectId);
    if (error || !roomId) {
      // Optionally, handle or log error
      return null;
    }
    return this.listByRoom(roomId, pagination, sort);
  }
}
