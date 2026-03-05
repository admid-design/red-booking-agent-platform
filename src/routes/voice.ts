import express from 'express';
import { TwilioService } from '../services/twilio-service';
import { BookingAgent } from '../agents/booking-agent';
import { ConversationState } from '../types';

const router = express.Router();
const bookingAgent = new BookingAgent();
const conversationStates: Map<string, ConversationState> = new Map();

router.post('/incoming', (req, res) => {
    const callSid = req.body.CallSid || `CALL-${Date.now()}`;
    console.log(`📞 Incoming call: ${callSid}`);

    const conversationState: ConversationState = {
        bookingId: `BK-${Date.now()}`,
        messages: [],
    };
    conversationStates.set(callSid, conversationState);

    const welcomeMessage = 'Welcome to RED Concierge Booking. What date and time are you looking for?';
    const twiml = TwilioService.generateTwiML(welcomeMessage);
    res.type('text/xml').send(twiml);
});

router.post('/handle-input', async (req, res) => {
    const callSid = req.body.CallSid || `CALL-${Date.now()}`;
    const userInput = req.body.SpeechResult || '';

    let conversationState = conversationStates.get(callSid);
    if (!conversationState) {
        conversationState = {
            bookingId: `BK-${Date.now()}`,
            messages: [],
        };
    }

    const { response, updatedState } = await bookingAgent.processInput(userInput, conversationState);
    conversationStates.set(callSid, updatedState);

    const twiml = TwilioService.generateTwiML(response);
    res.type('text/xml').send(twiml);
});

router.post('/status', (req, res) => {
    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus;
    console.log(`📞 Call ${callSid} status: ${callStatus}`);
    res.sendStatus(200);
});

export default router;
