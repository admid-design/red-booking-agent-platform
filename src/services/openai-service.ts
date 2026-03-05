export class OpenAIService {
    static async generateResponse(
        conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
        systemPrompt: string
    ): Promise<string> {
        const responses = [
            "Great! I can help you with that. What location are you looking for?",
            "Perfect! I found several available professionals. Would you like to hear about them?",
            "Sofia is excellent. I can book her for 3 hours at $600. Shall I confirm?",
            "Your booking has been confirmed! You'll receive a confirmation email shortly."
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    static getRealtimeModel(): string {
        return 'gpt-4-realtime-preview-20241217';
    }
}
