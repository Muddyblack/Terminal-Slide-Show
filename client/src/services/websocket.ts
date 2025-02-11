import { io, Socket } from 'socket.io-client';

import useStore from '@/store';


class WebSocketService {
  private socket: Socket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private activeConnections = 0;
  private maxReconnectDelay = 30000; // Max 30 seconds between retries
  private currentReconnectDelay = 1000; // Start with 1 second
  private isReconnecting = false;

  connect() {
    this.activeConnections++;
    
    if (this.socket?.connected) return;

    // Simplified URL resolution
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '3000'; // Always connect to backend port
    const url = `${protocol}//${host}:${port}`;

    console.warn('Connecting to WebSocket server at:', url);

    this.socket = io(url, {
      withCredentials: false,
      transports: ['websocket'],
      reconnection: true,
      timeout: 10000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.warn('WebSocket connected');
      useStore.getState().setWebsocketConnected(true);
      // Reset reconnection delay on successful connection
      this.currentReconnectDelay = 1000;
      this.isReconnecting = false;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      useStore.getState().setWebsocketConnected(false);
      this.tryReconnect();
    });
  }

  private tryReconnect() {
    if (this.isReconnecting || this.reconnectTimer) return;
    
    this.isReconnecting = true;
    console.warn(`Attempting to reconnect in ${this.currentReconnectDelay/1000} seconds...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      console.warn('Attempting to reconnect...');
      this.connect();

      // Exponential backoff with max delay
      this.currentReconnectDelay = Math.min(
        this.currentReconnectDelay * 1.5,
        this.maxReconnectDelay
      );
    }, this.currentReconnectDelay);
  }

  disconnect() {
    this.activeConnections--;
    
    // Only disconnect if there are no more active connections
    if (this.activeConnections === 0) {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      
      this.isReconnecting = false;
      this.currentReconnectDelay = 1000;
      useStore.getState().setWebsocketConnected(false);
    }
  }

  // Force a reconnection attempt
  reconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isReconnecting = false;
    this.currentReconnectDelay = 1000;
    this.connect();
  }
}

export const wsService = new WebSocketService();
