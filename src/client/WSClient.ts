import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { ModelDefinition } from '@/models/NeuralNetwork';

// Message types
export interface WSMessage {
  messageType: 'command' | 'response';
  commandType: string;
  data?: any;
  requestId?: string;
  timestamp: number;
}

export interface WSCommandMessage extends WSMessage {
  messageType: 'command';
}

export interface WSResponseMessage extends WSMessage {
  messageType: 'response';
}

// Command data interfaces
export interface InitCommandData {
  model: ModelDefinition;
}

export interface TrainCommandData {
  modelId: string;
  epochs: number;
  datasetId: string;
  validationSplit: number;
}

export interface QueryCommandData {
  modelId: string;
  layerId: string;
  queryType: string;
}

// Response data interfaces
export interface InitResponseData {
  status: 'success' | 'error';
  modelId?: string;
  message?: string;
  errorCode?: string;
}

export interface TrainResponseData {
  status: 'in_progress' | 'completed' | 'error';
  progress?: number;
  currentEpoch?: number;
  metrics?: {
    loss: number;
    accuracy: number;
    [key: string]: number;
  };
  trainingTime?: number;
  finalMetrics?: {
    loss: number;
    accuracy: number;
    val_loss: number;
    val_accuracy: number;
    [key: string]: number;
  };
  errorCode?: string;
  message?: string;
}

export interface QueryResponseData {
  status: 'success' | 'error';
  layerId?: string;
  queryType?: string;
  result?: any;
  errorCode?: string;
  message?: string;
}

// Event types
export enum WSClientEventType {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  MESSAGE = 'message',
  TRAIN_PROGRESS = 'train_progress',
  TRAIN_COMPLETED = 'train_completed'
}

// WebSocket client class
export class WSClient {
  private socket: WebSocket | null = null;
  private url: string;
  private eventEmitter: EventEmitter;
  private pendingRequests: Map<string, { resolve: Function, reject: Function }>;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: number = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<void> | null = null;
  private isConnecting: boolean = false;

  constructor(apiServerHost: string, port: number = 8080) {
    this.url = `ws://${apiServerHost}:${port}/neuroscope/ws`;
    this.eventEmitter = new EventEmitter();
    this.pendingRequests = new Map();
  }

  // Connect to the WebSocket server
  public async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return this.connectionPromise!;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.reconnectAttempts = 0;
          this.setupPing();
          this.isConnecting = false;
          this.eventEmitter.emit(WSClientEventType.CONNECTED);
          resolve();
        };

        this.socket.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} - ${event.reason}`);
          this.cleanup();
          this.eventEmitter.emit(WSClientEventType.DISCONNECTED, event);
          this.attemptReconnect();
          if (this.isConnecting) {
            reject(new Error(`WebSocket connection closed: ${event.code} - ${event.reason}`));
            this.isConnecting = false;
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.eventEmitter.emit(WSClientEventType.ERROR, error);
          if (this.isConnecting) {
            reject(error);
            this.isConnecting = false;
          }
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // Clean up resources
  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Attempt to reconnect to the server
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectTimeout * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  // Set up ping interval to keep the connection alive
  private setupPing(): void {
    this.pingInterval = setInterval(() => {
      this.ping().catch(error => {
        console.error('Ping failed:', error);
      });
    }, 30000); // Ping every 30 seconds
  }

  // Handle incoming WebSocket messages
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WSResponseMessage;
      this.eventEmitter.emit(WSClientEventType.MESSAGE, message);

      // Handle specific response types
      if (message.commandType === 'train') {
        const trainResponse = message.data as TrainResponseData;
        if (trainResponse.status === 'in_progress') {
          this.eventEmitter.emit(WSClientEventType.TRAIN_PROGRESS, trainResponse);
        } else if (trainResponse.status === 'completed') {
          this.eventEmitter.emit(WSClientEventType.TRAIN_COMPLETED, trainResponse);
        }
      }

      // Resolve pending request if there's a matching requestId
      if (message.requestId && this.pendingRequests.has(message.requestId)) {
        const { resolve, reject } = this.pendingRequests.get(message.requestId)!;
        
        if (message.data?.status === 'error') {
          reject(new Error(message.data.message || 'Unknown error'));
        } else {
          resolve(message.data);
        }
        
        this.pendingRequests.delete(message.requestId);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.eventEmitter.emit(WSClientEventType.ERROR, error);
    }
  }

  // Send a WebSocket message
  private async sendMessage(commandType: string, data: any = {}): Promise<any> {
    await this.connect();

    return new Promise((resolve, reject) => {
      try {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
          throw new Error('WebSocket is not connected');
        }

        const requestId = uuidv4();
        const message: WSCommandMessage = {
          messageType: 'command',
          commandType,
          data,
          requestId,
          timestamp: Date.now()
        };

        this.pendingRequests.set(requestId, { resolve, reject });
        this.socket.send(JSON.stringify(message));

        // Request timeout
        setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            reject(new Error(`Request timeout for command: ${commandType}`));
          }
        }, 30000); // 30 seconds timeout
      } catch (error) {
        reject(error);
      }
    });
  }

  // Initialize a new model
  public async initModel(model: ModelDefinition): Promise<InitResponseData> {
    const data: InitCommandData = { model };
    return this.sendMessage('init', data);
  }

  // Start training a model
  public async trainModel(modelId: string, epochs: number, datasetId: string, validationSplit: number = 0.2): Promise<TrainResponseData> {
    const data: TrainCommandData = { modelId, epochs, datasetId, validationSplit };
    return this.sendMessage('train', data);
  }

  // Query model layer information
  public async queryLayer(modelId: string, layerId: string, queryType: string): Promise<QueryResponseData> {
    const data: QueryCommandData = { modelId, layerId, queryType };
    return this.sendMessage('query', data);
  }

  // Send a ping to keep the connection alive
  public async ping(): Promise<any> {
    return this.sendMessage('ping');
  }

  // Close the WebSocket connection
  public async close(reason: string = 'user_terminated'): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      await this.sendMessage('close', { reason });
      this.socket.close();
    }

    this.cleanup();
  }

  // Subscribe to events
  public on(event: WSClientEventType, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  // Unsubscribe from events
  public off(event: WSClientEventType, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  // Get the current connection status
  public isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

// Export a singleton instance
const wsClient = new WSClient(
  process.env.NEUROSCOPE_API_SERVER_HOST || 'localhost',
  parseInt(process.env.NEUROSCOPE_APP_API_SERVER_PORT || '8080')
);

export default wsClient;