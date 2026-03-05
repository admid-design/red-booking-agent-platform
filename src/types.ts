// ─── Core Entity Types ────────────────────────────────────────────────────────

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Hostess {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  bio?: string;
  photoUrl?: string;
  isActive: boolean;
  hourlyRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Availability {
  id: string;
  hostessId: string;
  date: Date;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  isBooked: boolean;
  createdAt: Date;
}

export interface Booking {
  id: string;
  userId: string;
  hostessId?: string;
  availabilityId?: string;
  date: Date;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: BookingStatus;
  totalAmount: number;
  depositAmount: number;
  notes?: string;
  conversationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'deposit_paid'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Payment {
  id: string;
  bookingId: string;
  stripePaymentIntentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  type: PaymentType;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type PaymentType = 'deposit' | 'final' | 'refund';

export interface Conversation {
  id: string;
  callSid: string;
  userId?: string;
  bookingId?: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  status: ConversationStatus;
  transcript: ConversationMessage[];
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationStatus =
  | 'active'
  | 'completed'
  | 'failed'
  | 'transferred';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// ─── Request / Response DTOs ─────────────────────────────────────────────────

export interface CreateBookingRequest {
  userId?: string;
  hostessId?: string;
  availabilityId?: string;
  date: string;        // ISO date string
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  guestCount: number;
  notes?: string;
  phoneNumber: string;
}

export interface UpdateBookingRequest {
  date?: string;
  startTime?: string;
  endTime?: string;
  guestCount?: number;
  notes?: string;
  status?: BookingStatus;
}

export interface BookingAvailabilityQuery {
  date: string;
  hostessId?: string;
}

// ─── Agent Types ─────────────────────────────────────────────────────────────

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentSession {
  sessionId: string;
  callSid: string;
  phoneNumber: string;
  conversationId?: string;
  bookingContext?: Partial<CreateBookingRequest>;
  startedAt: Date;
}

// ─── Twilio Media Stream Types ────────────────────────────────────────────────

export interface TwilioMediaStreamMessage {
  event: 'connected' | 'start' | 'media' | 'stop' | 'mark';
  sequenceNumber?: string;
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // base64 encoded audio
  };
  start?: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  stop?: {
    accountSid: string;
    callSid: string;
  };
}

// ─── OpenAI Realtime Types ────────────────────────────────────────────────────

export interface RealtimeSessionConfig {
  model: string;
  voice: string;
  instructions: string;
  tools: RealtimeTool[];
  input_audio_format: string;
  output_audio_format: string;
  turn_detection: {
    type: string;
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  };
}

export interface RealtimeTool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
