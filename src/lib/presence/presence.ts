import React from 'react';
import { v4 as uuidv4 } from 'uuid';

type PresenceCallback = (userId: string, isOnline: boolean) => void;

class PresenceService {
  private static instance: PresenceService;
  private socket: WebSocket | null = null;
  private callbacks: Set<PresenceCallback> = new Set();
  private userId: string | null = null;
  private projectId: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private presenceMap: Map<string, boolean> = new Map();
  private lastHeartbeat = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly RECONNECT_DELAY = 1000; // 1 second

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService();
    }
    return PresenceService.instance;
  }

  public initialize(userId: string, projectId: string): void {
    // Clean up previous instance if any
    if (this.userId && this.userId !== userId) {
      this.cleanup();
    }
    
    this.userId = userId;
    this.projectId = projectId;
    this.connect();
    
    // Immediately mark current user as online
    this.updatePresence(userId, true);
  }

  private connect(): void {
    if (this.socket) {
      this.socket.close();
    }

    // In a real app, you would connect to your WebSocket server
    // For now, we'll simulate the connection
    console.log(`[Presence] Connecting to presence service for project ${this.projectId}`);
    
    // Simulate connection
    setTimeout(() => {
      this.handleConnect();
    }, 300);
  }

  private handleConnect(): void {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    console.log('[Presence] Connected to presence service');
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Notify that we're online
    this.notifyPresence(true);
  }

  private startHeartbeat(): void {
    this.lastHeartbeat = Date.now();
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.notifyPresence(true);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private notifyPresence(isOnline: boolean): void {
    if (!this.userId || !this.projectId) return;
    
    const message = {
      type: 'presence',
      userId: this.userId,
      projectId: this.projectId,
      isOnline,
      timestamp: Date.now()
    };
    
    // Update presence map for the current user
    this.updatePresence(this.userId, isOnline);
    
    // In a real app, send via WebSocket
    console.log('[Presence] Sending presence:', message);
  }

  public subscribe(callback: PresenceCallback): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  public updatePresence(userId: string, isOnline: boolean): void {
    this.presenceMap.set(userId, isOnline);
    
    // Notify all subscribers
    this.callbacks.forEach(cb => {
      try {
        cb(userId, isOnline);
      } catch (error) {
        console.error('Error in presence callback:', error);
      }
    });
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.presenceMap.entries())
      .filter(([_, isOnline]) => isOnline)
      .map(([userId]) => userId);
  }

  public isUserOnline(userId: string): boolean {
    return this.presenceMap.get(userId) || false;
  }

  public cleanup(): void {
    // Notify that we're going offline before cleaning up
    if (this.userId) {
      this.updatePresence(this.userId, false);
    }
    
    // Clear intervals and timeouts
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Close socket if it exists
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Reset connection state
    this.isConnected = false;
    
    // Don't clear the entire presence map here as other users might still be online
    // Only remove the current user from the map
    if (this.userId) {
      this.presenceMap.delete(this.userId);
    }
  }
}

export const presenceService = PresenceService.getInstance();

// Helper hook for React components
export function usePresence(userId: string, projectId: string) {
  const [isOnline, setIsOnline] = React.useState(false);
  const [onlineUsers, setOnlineUsers] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Initialize presence service
    presenceService.initialize(userId, projectId);

    // Subscribe to presence updates
    const unsubscribe = presenceService.subscribe((updatedUserId, userIsOnline) => {
      if (updatedUserId === userId) {
        setIsOnline(userIsOnline);
      }
      
      // Update online users list
      setOnlineUsers(presenceService.getOnlineUsers());
    });

    // Initial state
    setIsOnline(presenceService.isUserOnline(userId));
    setOnlineUsers(presenceService.getOnlineUsers());

    // Cleanup on unmount
    return () => {
      unsubscribe();
      // Only clean up if this is the last component using the service
      // In a real app, you'd have more sophisticated cleanup logic
      presenceService.cleanup();
    };
  }, [userId, projectId]);

  return { isOnline, onlineUsers };
}
