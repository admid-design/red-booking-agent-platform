export interface User {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
}

export interface Hostess {
    id: string;
    name: string;
    availability: boolean;
    bookingCount: number;
}

export interface Booking {
    id: string;
    userId: string;
    hostessId: string;
    startTime: Date;
    endTime: Date;
    status: 'pending' | 'confirmed' | 'cancelled';
}

export interface ConversationState {
    bookingId: string;
    messages: Array<{ sender: string; content: string; timestamp: Date; }>; 
}

export interface VoiceCallState {
    callId: string;
    status: 'initiated' | 'in-progress' | 'ended';
    participants: Array<User>;
}
