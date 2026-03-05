import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { getPool } from '../database/database';

export const healthRouter = Router();

const healthRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /health
 * Basic health check endpoint.
 */
healthRouter.get('/', healthRateLimit, async (_req: Request, res: Response) => {
  const health: {
    status: string;
    timestamp: string;
    uptime: number;
    database: string;
  } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'unknown',
  };

  try {
    await getPool().query('SELECT 1');
    health.database = 'connected';
  } catch {
    health.status = 'degraded';
    health.database = 'disconnected';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /health/ping
 * Simple ping endpoint (no DB check).
 */
healthRouter.get('/ping', (_req: Request, res: Response) => {
  res.json({ pong: true, timestamp: new Date().toISOString() });
});
