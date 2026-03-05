import WebSocket from 'ws';
import { config } from '../config';
import { RealtimeSessionConfig, RealtimeTool } from '../types';

/**
 * Creates and manages a WebSocket connection to the OpenAI Realtime API.
 */
export class OpenAIRealtimeService {
  private ws: WebSocket | null = null;
  private sessionConfig: RealtimeSessionConfig;
  private messageHandlers: Map<string, (event: Record<string, unknown>) => void> = new Map();

  constructor(sessionConfig: RealtimeSessionConfig) {
    this.sessionConfig = sessionConfig;
  }

  /**
   * Connect to the OpenAI Realtime API.
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `wss://api.openai.com/v1/realtime?model=${this.sessionConfig.model}`;
      this.ws = new WebSocket(url, {
        headers: {
          Authorization: `Bearer ${config.openai.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      this.ws.on('open', () => {
        this.sendSessionUpdate();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          const event = JSON.parse(data.toString()) as Record<string, unknown>;
          const eventType = event.type as string;
          const handler = this.messageHandlers.get(eventType);
          if (handler) {
            handler(event);
          }
          // Always fire wildcard handlers
          const wildcardHandler = this.messageHandlers.get('*');
          if (wildcardHandler) {
            wildcardHandler(event);
          }
        } catch (err) {
          console.error('Failed to parse OpenAI message:', err);
        }
      });

      this.ws.on('error', (err) => {
        console.error('OpenAI WebSocket error:', err);
        reject(err);
      });

      this.ws.on('close', () => {
        console.log('OpenAI WebSocket connection closed');
      });
    });
  }

  /**
   * Send the session configuration to OpenAI.
   */
  private sendSessionUpdate(): void {
    this.send({
      type: 'session.update',
      session: {
        modalities: ['audio', 'text'],
        instructions: this.sessionConfig.instructions,
        voice: this.sessionConfig.voice,
        input_audio_format: this.sessionConfig.input_audio_format,
        output_audio_format: this.sessionConfig.output_audio_format,
        tools: this.sessionConfig.tools,
        turn_detection: this.sessionConfig.turn_detection,
      },
    });
  }

  /**
   * Send audio data (base64 encoded) to OpenAI.
   */
  sendAudio(base64Audio: string): void {
    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    });
  }

  /**
   * Commit the current audio buffer for processing.
   */
  commitAudio(): void {
    this.send({ type: 'input_audio_buffer.commit' });
  }

  /**
   * Send a function call result back to OpenAI.
   */
  sendFunctionCallResult(callId: string, result: unknown): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result),
      },
    });
    this.send({ type: 'response.create' });
  }

  /**
   * Register a handler for a specific event type.
   * Use '*' to receive all events.
   */
  on(eventType: string, handler: (event: Record<string, unknown>) => void): void {
    this.messageHandlers.set(eventType, handler);
  }

  /**
   * Send a raw message to the OpenAI WebSocket.
   */
  send(message: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('OpenAI WebSocket not open, dropping message');
      return;
    }
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Close the WebSocket connection.
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Build a RealtimeSessionConfig for the booking agent.
 */
export function buildBookingSessionConfig(
  instructions: string,
  tools: RealtimeTool[]
): RealtimeSessionConfig {
  return {
    model: config.openai.realtimeModel,
    voice: 'alloy',
    instructions,
    tools,
    input_audio_format: 'g711_ulaw',
    output_audio_format: 'g711_ulaw',
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500,
    },
  };
}
