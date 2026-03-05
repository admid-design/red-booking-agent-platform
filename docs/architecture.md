# Architecture Overview

## System Architecture

The RED Booking Agent Platform is a Node.js/TypeScript application that integrates Twilio voice calls with OpenAI's Realtime API to provide an AI-powered phone booking experience.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Caller (Phone)                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │ PSTN Call
┌─────────────────────▼───────────────────────────────────────────┐
│                   Twilio Voice Platform                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Media Streams (WebSocket) + TwiML Webhooks              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ WebSocket (μ-law audio)
┌─────────────────────▼───────────────────────────────────────────┐
│              RED Booking Agent Platform (Express)               │
│                                                                  │
│  ┌────────────────┐   ┌─────────────────┐   ┌───────────────┐  │
│  │  Voice Routes  │   │  ConversationAgent│  │  Booking API  │  │
│  │  /voice/*      │──▶│  (per call)      │  │  /bookings/*  │  │
│  └────────────────┘   └────────┬────────┘  └───────────────┘  │
│                                │                                  │
│                   ┌────────────▼────────────┐                   │
│                   │   OpenAI Realtime       │                   │
│                   │   Service (WebSocket)   │                   │
│                   └────────────┬────────────┘                   │
│                                │ function calls                   │
│                   ┌────────────▼────────────┐                   │
│                   │     Agent Tools         │                   │
│                   │  - check_availability   │                   │
│                   │  - list_hostesses       │                   │
│                   │  - create_booking       │                   │
│                   │  - lookup_booking       │                   │
│                   └────────────┬────────────┘                   │
│                                │                                  │
│                   ┌────────────▼────────────┐                   │
│                   │     Services Layer      │                   │
│                   │  booking-service        │                   │
│                   │  hostess-service        │                   │
│                   │  payment-service        │                   │
│                   └────────────┬────────────┘                   │
│                                │                                  │
│                   ┌────────────▼────────────┐                   │
│                   │     PostgreSQL DB        │                   │
│                   └─────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   OpenAI Realtime API                           │
│                   wss://api.openai.com/v1/realtime              │
└─────────────────────────────────────────────────────────────────┘
```

## Call Flow

1. **Inbound Call**: Twilio receives a PSTN call to the configured phone number
2. **TwiML Webhook**: Twilio POSTs to `POST /voice/incoming`
3. **TwiML Response**: Server returns TwiML with `<Connect><Stream>` to establish a Media Stream WebSocket
4. **WebSocket Connection**: Twilio connects to `wss://<server>/voice/stream/<callSid>`
5. **Agent Start**: A `ConversationAgent` instance is created for this call
6. **OpenAI Connection**: Agent connects to OpenAI Realtime API via WebSocket
7. **Audio Bridge**: Twilio sends μ-law audio → Agent → OpenAI. OpenAI sends audio back → Agent → Twilio
8. **Function Calls**: OpenAI calls agent tools (check_availability, create_booking, etc.)
9. **Call End**: Twilio sends status callback to `POST /voice/status` → conversation record closed

## Component Descriptions

### ConversationAgent (`src/agents/conversation-agent.ts`)

The central orchestrator for each call. Bridges Twilio Media Streams with OpenAI Realtime API. One instance is created per active call and manages the lifecycle of that conversation.

### OpenAIRealtimeService (`src/services/openai-service.ts`)

Manages the WebSocket connection to OpenAI Realtime API. Handles session configuration, audio streaming, and function call responses.

### TwilioService (`src/services/twilio-service.ts`)

Handles Twilio API interactions: generating TwiML, validating webhooks, and making outbound calls.

### BookingService (`src/services/booking-service.ts`)

Core business logic for creating, confirming, and cancelling bookings. Calculates pricing.

### HostessService (`src/services/hostess-service.ts`)

Manages hostess profiles and availability scheduling.

### PaymentService (`src/services/payment-service.ts`)

Integrates with Stripe for deposit collection and payment tracking.

## Database Schema

See `src/database/migrations.ts` for the full schema. Key tables:

| Table | Purpose |
|-------|---------|
| `users` | Customer records (identified by phone number) |
| `hostesses` | Hostess profiles |
| `availability` | Time slots when hostesses are available |
| `bookings` | Reservation records |
| `payments` | Payment records linked to bookings |
| `conversations` | Call transcripts and metadata |

## Security Considerations

- Twilio request signatures validated on webhook endpoints
- Stripe webhook signatures validated with `stripe.webhooks.constructEvent`
- All secrets stored in environment variables, never in code
- PostgreSQL parameterized queries prevent SQL injection
- Helmet middleware sets security headers
