import { Router, Request, Response } from 'express';
import { ConversationAgent } from '../agents/conversation-agent';
import { generateMediaStreamTwiML } from '../services/twilio-service';
import {
  createConversation,
  closeConversation,
  findConversationByCallSid,
  upsertUser,
} from '../database/models';
import { config } from '../config';

export const voiceRouter = Router();

// Active agent sessions keyed by call SID
const activeSessions = new Map<string, ConversationAgent>();

/**
 * POST /voice/incoming
 * Twilio calls this when an inbound call arrives.
 * Responds with TwiML to connect to a Media Stream WebSocket.
 */
voiceRouter.post('/incoming', async (req: Request, res: Response) => {
  const callSid = req.body.CallSid as string;
  const from = req.body.From as string;

  console.log(`Incoming call: ${callSid} from ${from}`);

  try {
    // Ensure user exists
    await upsertUser(from, {});

    // Create conversation record
    await createConversation({
      callSid,
      phoneNumber: from,
      direction: 'inbound',
    });

    // Build WebSocket URL for media stream
    const wsUrl = `${config.baseUrl.replace(/^http/, 'ws')}/voice/stream/${callSid}`;
    const twiml = generateMediaStreamTwiML(wsUrl);

    res.type('text/xml').send(twiml);
  } catch (err) {
    console.error('Error handling incoming call:', err);
    res.status(500).send('<Response><Say>An error occurred. Please try again later.</Say></Response>');
  }
});

/**
 * POST /voice/status
 * Twilio calls this with call status updates (completed, busy, etc.)
 */
voiceRouter.post('/status', async (req: Request, res: Response) => {
  const callSid = req.body.CallSid as string;
  const callStatus = req.body.CallStatus as string;
  const callDuration = parseInt(req.body.CallDuration || '0', 10);

  console.log(`Call ${callSid} status: ${callStatus} (${callDuration}s)`);

  if (['completed', 'failed', 'busy', 'no-answer'].includes(callStatus)) {
    const conversation = await findConversationByCallSid(callSid);
    if (conversation) {
      await closeConversation(conversation.id, callDuration);
    }

    const agent = activeSessions.get(callSid);
    if (agent) {
      agent.disconnect();
      activeSessions.delete(callSid);
    }
  }

  res.sendStatus(200);
});

/**
 * Export function to handle WebSocket upgrade for media streams.
 * Called from the main index.ts WebSocket server setup.
 */
export function handleMediaStreamWebSocket(
  ws: import('ws'),
  callSid: string
): void {
  console.log(`Media stream WebSocket connected for call: ${callSid}`);

  const agent = new ConversationAgent(callSid, ws);
  activeSessions.set(callSid, agent);

  agent.start().catch((err) => {
    console.error(`Agent error for call ${callSid}:`, err);
  });

  ws.on('close', () => {
    console.log(`Media stream WebSocket closed for call: ${callSid}`);
    agent.disconnect();
    activeSessions.delete(callSid);
  });
}
