import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { healthRouter } from './routes/health';
import { voiceRouter, handleMediaStreamWebSocket } from './routes/voice';
import { bookingsRouter } from './routes/bookings';
import { runMigrations } from './database/migrations';
import { closePool } from './database/database';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Parse raw body for Stripe webhook signature verification
app.use('/payments/webhook', express.raw({ type: 'application/json' }));

// Parse JSON for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/health', healthRouter);
app.use('/voice', voiceRouter);
app.use('/bookings', bookingsRouter);

// ─── HTTP + WebSocket Server ──────────────────────────────────────────────────

const server = http.createServer(app);

// WebSocket server for Twilio Media Streams
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade requests for /voice/stream/:callSid
server.on('upgrade', (request, socket, head) => {
  const url = request.url ?? '';
  const match = url.match(/^\/voice\/stream\/([A-Za-z0-9]+)$/);
  if (match) {
    const callSid = match[1];
    wss.handleUpgrade(request, socket, head, (ws) => {
      handleMediaStreamWebSocket(ws, callSid);
    });
  } else {
    socket.destroy();
  }
});

// ─── Startup ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`Starting ${config.business.name} Booking Agent Platform...`);

  // Run database migrations
  await runMigrations();

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
    console.log(`Health check: http://localhost:${config.port}/health`);
    console.log(`Voice webhook: ${config.baseUrl}/voice/incoming`);
  });
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function shutdown(): Promise<void> {
  console.log('Shutting down...');
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

export { app, server };
