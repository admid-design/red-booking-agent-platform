import WebSocket from 'ws';
import { OpenAIRealtimeService, buildBookingSessionConfig } from '../services/openai-service';
import { buildSystemPrompt } from './prompts';
import { getRealtimeTools, executeTool } from './tools';
import {
  createConversation,
  appendConversationMessage,
  findConversationByCallSid,
} from '../database/models';
import { TwilioMediaStreamMessage } from '../types';

/**
 * ConversationAgent bridges a Twilio Media Stream WebSocket
 * with the OpenAI Realtime API to enable voice AI conversations.
 */
export class ConversationAgent {
  private callSid: string;
  private twilioWs: WebSocket;
  private openai: OpenAIRealtimeService;
  private streamSid: string | null = null;
  private conversationId: string | null = null;
  private startTime: Date = new Date();

  constructor(callSid: string, twilioWs: WebSocket) {
    this.callSid = callSid;
    this.twilioWs = twilioWs;

    const sessionConfig = buildBookingSessionConfig(
      buildSystemPrompt(),
      getRealtimeTools()
    );
    this.openai = new OpenAIRealtimeService(sessionConfig);
  }

  /**
   * Start the agent: connect to OpenAI and set up message handlers.
   */
  async start(): Promise<void> {
    // Connect to OpenAI Realtime API
    await this.openai.connect();

    // Handle messages from Twilio Media Streams
    this.twilioWs.on('message', (data: WebSocket.RawData) => {
      this.handleTwilioMessage(data.toString());
    });

    // Handle audio from OpenAI → send to Twilio
    this.openai.on('response.audio.delta', (event) => {
      const delta = event.delta as string;
      if (delta && this.streamSid) {
        this.sendAudioToTwilio(delta);
      }
    });

    // Handle function calls from OpenAI
    this.openai.on('response.function_call_arguments.done', (event) => {
      this.handleFunctionCall(event);
    });

    // Log transcripts
    this.openai.on('conversation.item.input_audio_transcription.completed', (event) => {
      const transcript = event.transcript as string;
      if (transcript && this.conversationId) {
        appendConversationMessage(this.conversationId, {
          role: 'user',
          content: transcript,
          timestamp: new Date(),
        }).catch(console.error);
      }
    });

    this.openai.on('response.audio_transcript.done', (event) => {
      const transcript = event.transcript as string;
      if (transcript && this.conversationId) {
        appendConversationMessage(this.conversationId, {
          role: 'assistant',
          content: transcript,
          timestamp: new Date(),
        }).catch(console.error);
      }
    });

    console.log(`ConversationAgent started for call: ${this.callSid}`);
  }

  /**
   * Handle incoming messages from Twilio Media Streams.
   */
  private handleTwilioMessage(raw: string): void {
    let msg: TwilioMediaStreamMessage;
    try {
      msg = JSON.parse(raw) as TwilioMediaStreamMessage;
    } catch {
      return;
    }

    switch (msg.event) {
      case 'start':
        this.streamSid = msg.start?.streamSid ?? null;
        const callSid = msg.start?.callSid ?? this.callSid;

        // Look up or create conversation record
        findConversationByCallSid(callSid)
          .then((conv) => {
            if (conv) {
              this.conversationId = conv.id;
            }
          })
          .catch(console.error);

        console.log(`Media stream started: ${this.streamSid}`);
        break;

      case 'media':
        if (msg.media?.payload) {
          this.openai.sendAudio(msg.media.payload);
        }
        break;

      case 'stop':
        console.log(`Media stream stopped for call: ${this.callSid}`);
        this.disconnect();
        break;
    }
  }

  /**
   * Handle a function call response from OpenAI.
   */
  private async handleFunctionCall(event: Record<string, unknown>): Promise<void> {
    const name = event.name as string;
    const callId = event.call_id as string;
    let args: Record<string, unknown> = {};

    try {
      args = JSON.parse(event.arguments as string) as Record<string, unknown>;
    } catch {
      // ignore parse errors
    }

    console.log(`Tool call: ${name}`, args);

    try {
      const result = await executeTool(name, args);
      this.openai.sendFunctionCallResult(callId, result);
    } catch (err) {
      console.error(`Tool execution error for ${name}:`, err);
      this.openai.sendFunctionCallResult(callId, {
        error: (err as Error).message,
      });
    }
  }

  /**
   * Send audio data back to Twilio.
   */
  private sendAudioToTwilio(base64Audio: string): void {
    if (
      this.twilioWs.readyState !== WebSocket.OPEN ||
      !this.streamSid
    ) {
      return;
    }

    const message = {
      event: 'media',
      streamSid: this.streamSid,
      media: { payload: base64Audio },
    };

    this.twilioWs.send(JSON.stringify(message));
  }

  /**
   * Disconnect from OpenAI and clean up.
   */
  disconnect(): void {
    this.openai.disconnect();
  }
}
