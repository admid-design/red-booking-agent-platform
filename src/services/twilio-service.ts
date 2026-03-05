import twilio from 'twilio';
import { config } from '../config';

let twilioClient: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return twilioClient;
}

/**
 * Generate TwiML to connect a call to a WebSocket media stream
 * for real-time audio processing with OpenAI Realtime API.
 */
export function generateMediaStreamTwiML(streamUrl: string): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  const connect = response.connect();
  connect.stream({ url: streamUrl });

  return response.toString();
}

/**
 * Generate a simple TwiML response that says a message and hangs up.
 */
export function generateSayTwiML(message: string): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  response.say({ voice: 'alice' }, message);
  response.hangup();
  return response.toString();
}

/**
 * Initiate an outbound call.
 */
export async function makeOutboundCall(
  to: string,
  webhookUrl: string
): Promise<string> {
  const client = getTwilioClient();
  const call = await client.calls.create({
    to,
    from: config.twilio.phoneNumber,
    url: webhookUrl,
  });
  return call.sid;
}

/**
 * Fetch call details by SID.
 */
export async function getCallDetails(callSid: string) {
  const client = getTwilioClient();
  return client.calls(callSid).fetch();
}

/**
 * Validate a Twilio request signature.
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  return twilio.validateRequest(
    config.twilio.authToken,
    signature,
    url,
    params
  );
}
