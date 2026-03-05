import { OpenAIService } from '../services/openai-service';
import { BookingService } from '../services/booking-service';
import { ConversationState } from '../types';

const BOOKING_SYSTEM_PROMPT = `You are a professional RED Concierge booking agent.
Your role is to:
1. Greet customers professionally
2. Understand their booking requirements (date, time, duration, location)
3. Suggest suitable hostesses
4. Handle payment arrangements
5. Confirm booking details

Always be respectful, professional, and maintain customer privacy.
Keep responses concise and natural for voice conversations (max 2-3 sentences).`;

export class BookingAgent {
    private bookingService: BookingService;

    constructor() {
        this.bookingService = new BookingService();
    }

    async processInput(
        userMessage: string,
        conversationState: ConversationState
    ): Promise<{ response: string; updatedState: ConversationState }> {
        const history = conversationState.messages.map((msg) => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content,
        })) as any[];

        history.push({
            role: 'user',
            content: userMessage,
        });

        const aiResponse = await OpenAIService.generateResponse(
            history,
            BOOKING_SYSTEM_PROMPT
        );

        const updatedState: ConversationState = {
            ...conversationState,
            messages: [
                ...conversationState.messages,
                {
                    sender: 'user',
                    content: userMessage,
                    timestamp: new Date(),
                },
                {
                    sender: 'assistant',
                    content: aiResponse,
                    timestamp: new Date(),
                },
            ],
        };

        return {
            response: aiResponse,
            updatedState,
        };
    }

    async findHostesses(location: string, date: Date) {
        return await this.bookingService.searchAvailableHostesses(location, date);
    }

    async createBooking(userId: string, hostessId: string, startTime: Date, endTime: Date, amount: number) {
        return await this.bookingService.createBooking(userId, hostessId, startTime, endTime, amount);
    }

    async confirmBooking(bookingId: string) {
        return await this.bookingService.confirmBooking(bookingId);
    }
}
