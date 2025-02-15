import { frontendConfig } from '@config/frontend.config';
import { useState, useCallback, useEffect, useRef } from 'react';

import { NavigationDirection } from '@/components/slideshow/types';
import { useServerStatus } from '@/contexts/ServerStatusContext';

interface MediaItem {
  id: string;
  path: string;
  type: string;
}

interface MediaManagerResult {
  media: MediaItem | null;
  loading: boolean;
  serverReady: boolean;
  webSocketStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  navigateMedia: (direction: NavigationDirection) => void;
  totalMedia: number;
}

export const useLocalMediaManager = (isScheduleActive = true): MediaManagerResult => {
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [webSocketStatus, setWebSocketStatus] = useState<MediaManagerResult['webSocketStatus']>('disconnected');
  const [serverReady, setServerReady] = useState(false);

  const isServerConnected = useServerStatus();

  // Use refs for WebSocket and reconnection timer
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);

  const MAX_RECONNECT_ATTEMPTS = frontendConfig.websocket.maxReconnectAttempts;
  const RECONNECT_INTERVAL = frontendConfig.websocket.reconnectInterval;

  const connect = useCallback(() => {
    if (!isScheduleActive || !isServerConnected || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsPath = frontendConfig.websocket.path || '/ws';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}${wsPath}`);
    wsRef.current = ws;

    console.log('Attempting WebSocket connection...');
    setWebSocketStatus('connecting');

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWebSocketStatus('connected');
      setServerReady(true);
      reconnectAttemptsRef.current = 0;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = undefined;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data.type);

        switch (data.type) {
          case 'mediaList':
          case 'mediaUpdate':
            setAllMedia(data.media);
            setCurrentIndex(prev => prev >= data.media.length ? 0 : prev);
            setLoading(false);
            break;
        }
      } catch (err) {
        console.warn('Error processing WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.warn('WebSocket error:', error);
      setWebSocketStatus('error');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setWebSocketStatus('disconnected');
      wsRef.current = null;

      if (isScheduleActive && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        console.log(`Will attempt to reconnect... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_INTERVAL);
      }
    };

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    ws.addEventListener('close', () => clearInterval(pingInterval));
  }, [isScheduleActive, isServerConnected]);

  const navigateMedia = useCallback((direction: NavigationDirection) => {
    if (allMedia.length === 0) return null;

    setCurrentIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % allMedia.length;
      } else if (direction === 'previous') {
        return (prev - 1 + allMedia.length) % allMedia.length;
      }
      return prev;
    });
  }, [allMedia.length]);

  const getCurrentMedia = useCallback(() => {
    return allMedia[currentIndex] || null;
  }, [allMedia, currentIndex]);

  useEffect(() => {
    if (isScheduleActive && isServerConnected) {
      connect();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isScheduleActive, isServerConnected, connect]);

  return {
    media: getCurrentMedia(),
    loading,
    serverReady: serverReady || allMedia.length > 0,
    webSocketStatus,
    navigateMedia,
    totalMedia: allMedia.length
  };
};