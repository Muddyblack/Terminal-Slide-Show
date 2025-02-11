import { WebSocketServer } from 'ws';
import { Logger } from '../utils/logger.js';
import config from '../../config/config.js';

/**
 * Manages WebSocket connections and communication with clients
 * @class WebSocketManager
 */
class WebSocketManager {
  constructor() {
    /** @private @type {Logger} Logger instance for WebSocketManager */
    this.logger = new Logger('WebSocketManager');
    /** @private @type {WebSocketServer|null} WebSocket server instance */
    this.server = null;
    /** @private @type {Map<WebSocket, Object>} Map of connected clients and their metadata */
    this.clients = new Map();
    /** @private @type {number} Interval for checking client heartbeats in ms */
    this.heartbeatInterval = config.websocket.heartbeatInterval;
    /** @private @type {NodeJS.Timeout|null} Timer for checking client heartbeats */
    this.heartbeatTimer = null;
    /** @private @type {boolean} Flag indicating whether WebSocket server is initialized */
    this.initialized = false;
  }
  
  /**
   * Initializes the WebSocket server
   * @param {import('http').Server} server - HTTP/HTTPS server to attach WebSocket to
   * @throws {Error} When WebSocket server initialization fails
   */
  initialize(server) {
    try {
      this.server = new WebSocketServer({
        noServer: true,
        clientTracking: true
      });

      // Set initialized flag after WSS creation
      this.initialized = true;

      server.on('upgrade', (request, socket, head) => {
        const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

        this.logger.debug(`WebSocket upgrade request for path: ${pathname}`);

        if (pathname === '/ws') {
          this.server.handleUpgrade(request, socket, head, (ws) => {
            this.handleConnection(ws, request);
          });
        } else {
          this.logger.warn(`Invalid WebSocket path: ${pathname}`);
          socket.destroy();
        }
      });

      this.startHeartbeat();
      this.logger.info('WebSocket server initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  /**
   * Starts the heartbeat check interval
   * @private
   */
  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = setInterval(() => this.checkHeartbeats(), this.heartbeatInterval);
  }

  /**
   * Handles new WebSocket connections
   * @private
   * @param {import('ws').WebSocket} ws - WebSocket connection
   * @param {import('http').IncomingMessage} req - HTTP request that initiated the connection
   */
  handleConnection(ws, req) {
    const clientId = Math.random().toString(36).substring(7);
    const clientInfo = {
      id: clientId,
      lastPing: Date.now(),
      address: req.socket.remoteAddress
    };

    this.clients.set(ws, clientInfo);
    this.logger.info(`New WebSocket connection: Client ${clientId} from ${clientInfo.address}`);

    // Send initial media list
    this.sendInitialData(ws);

    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) {
        client.lastPing = Date.now();
      }
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(ws, message);
      } catch (error) {
        this.logger.error(`Failed to parse message from client ${clientId}:`, error);
      }
    });

    ws.on('close', () => {
      this.logger.info(`Client ${clientId} disconnected`);
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      this.logger.error(`WebSocket error for client ${clientId}:`, error);
      this.clients.delete(ws);
    });
  }

  /**
   * Handles incoming WebSocket messages
   * @private
   * @param {import('ws').WebSocket} ws - WebSocket connection
   * @param {Object} message - Parsed message object
   */
  handleMessage(ws, message) {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'ping':
        ws.pong();
        client.lastPing = Date.now();
        break;
      default:
        this.logger.debug(`Unknown message type from client ${client.id}: ${message.type}`);
    }
  }

  /**
   * Sends initial media data to a client
   * @private
   * @param {import('ws').WebSocket} ws - WebSocket connection
   * @returns {Promise<void>}
   */
  async sendInitialData(ws) {
    if (!global.slideshowManager) {
      this.logger.warn('SlideshowManager not available for initial data');
      return;
    }

    try {
      const mediaList = global.slideshowManager.getAllMedia();
      const message = JSON.stringify({
        type: 'mediaList',
        media: mediaList
      });

      if (ws.readyState === ws.OPEN) {
        ws.send(message);
        this.logger.debug('Sent initial media list to client');
      }
    } catch (error) {
      this.logger.error('Failed to send initial data:', error);
    }
  }

  /**
   * Broadcasts media updates to all connected clients
   * @param {Array<Object>} mediaList - List of media items to broadcast
   */
  broadcastUpdate(mediaList) {
    if (!this.initialized) {
      this.logger.debug('WebSocket server not yet initialized, skipping broadcast');
      return;
    }

    if (!this.server || this.clients.size === 0) {
      this.logger.debug('No clients connected, skipping broadcast, clients: ', this.clients.size);
      return;
    }

    const message = JSON.stringify({
      type: 'mediaUpdate',
      media: mediaList
    });

    let successCount = 0;
    let failCount = 0;

    this.clients.forEach((client, ws) => {
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(message);
          successCount++;
          this.logger.debug(`Successfully sent update to client ${client.id}`);
        }
      } catch (err) {
        this.logger.error(`Failed to send to client ${client.id}:`, err);
        failCount++;
        ws.terminate();
        this.clients.delete(ws);
      }
    });

    this.logger.info(`Broadcast complete: ${successCount} succeeded, ${failCount} failed`);
  }

  /**
   * Checks client heartbeats and removes stale connections
   * @private 
   */
  checkHeartbeats() {
    const now = Date.now();
    for (const [ws, client] of this.clients) {
      if (now - client.lastPing > this.heartbeatInterval * 2) {
        this.logger.warn(`Client ${client.id} timed out, closing connection`);
        ws.terminate();
        this.clients.delete(ws);
      } else {
        try {
          ws.ping();
        } catch (error) {
          this.logger.error(`Failed to ping client ${client.id}:`, error);
          ws.terminate();
          this.clients.delete(ws);
        }
      }
    }
  }

  /**
   * Stops the WebSocket server and cleans up connections
   */
  stop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.clients.forEach((client, ws) => {
      try {
        ws.close();
      } catch (error) {
        this.logger.error(`Error closing connection for client ${client.id}:`, error);
      }
    });

    this.clients.clear();

    if (this.server) {
      this.server.close();
      this.server = null;
    }

    this.logger.info('WebSocket manager stopped');
  }
}

export const webSocketManager = new WebSocketManager();