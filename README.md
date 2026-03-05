# RED Booking Agent Platform

AI-powered booking platform with Twilio voice integration, OpenAI Realtime conversational AI, and PostgreSQL backend.

## Features

- **Voice AI**: Real-time conversational booking via phone calls using Twilio + OpenAI Realtime API
- **Booking Management**: Full CRUD for reservations, availability, and scheduling
- **Hostess Management**: Assign and manage hostess staff for bookings
- **Payment Processing**: Integrated Stripe payments for deposits and charges
- **PostgreSQL Backend**: Robust relational data storage with migrations

## Technology Stack

- **Runtime**: Node.js + TypeScript
- **Voice**: Twilio Programmable Voice API (Media Streams)
- **AI**: OpenAI Realtime API (`gpt-4o-realtime-preview`)
- **Database**: PostgreSQL
- **Web Framework**: Express.js
- **WebSocket**: `ws` package (for Twilio Media Streams)
- **Payments**: Stripe

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Twilio account
- OpenAI API key
- Stripe account (for payments)

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Initialize database
npm run init-db

# Seed test data (optional)
npm run seed

# Build
npm run build

# Start server
npm start
```

### Development

```bash
# Run in development mode with ts-node
npm run dev
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for a full architectural overview.

## API Reference

See [docs/api.md](docs/api.md) for full API documentation.

## Project Structure

```
red-booking-agent-platform/
├── src/
│   ├── index.ts              # Application entrypoint
│   ├── config.ts             # Configuration management
│   ├── types.ts              # TypeScript interfaces
│   ├── database/
│   │   ├── database.ts       # PostgreSQL connection
│   │   ├── models.ts         # Data models
│   │   └── migrations.ts     # Schema migrations
│   ├── services/
│   │   ├── twilio-service.ts # Twilio voice management
│   │   ├── openai-service.ts # OpenAI Realtime integration
│   │   ├── booking-service.ts# Booking logic
│   │   ├── hostess-service.ts# Hostess management
│   │   └── payment-service.ts# Payment processing
│   ├── routes/
│   │   ├── voice.ts          # Voice call routes
│   │   ├── bookings.ts       # Booking CRUD routes
│   │   └── health.ts         # Health check
│   └── agents/
│       ├── conversation-agent.ts # Main conversational agent
│       ├── tools.ts              # Agent tools/actions
│       └── prompts.ts            # System prompts
├── scripts/
│   ├── init-db.ts            # Database initialization
│   ├── seed-data.ts          # Test data seeding
│   └── example-call.ts       # Example booking call simulation
├── tests/
│   └── agent.test.ts         # Agent unit tests
├── docs/
│   ├── architecture.md       # Architecture overview
│   └── api.md                # API documentation
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

## Twilio Setup

1. Create a Twilio account and purchase a phone number
2. Set up a TwiML App pointing to your server's `/voice/incoming` endpoint
3. Expose your local server with ngrok: `ngrok http 3000`
4. Update `BASE_URL` in `.env` with your ngrok URL

## License

MIT
