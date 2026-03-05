// src/types.ts

// Interface representing a User
export interface User {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
}

// Interface representing a Hostess
export interface Hostess {
    id: string;
    name: string;
    availability: boolean;
    bookingCount: number;
}

// Interface representing a Booking
export interface Booking {
    id: string;
    userId: string;
    hostessId: string;
    startTime: Date;
    endTime: Date;
    status: 'pending' | 'confirmed' | 'cancelled';
}

// Interface representing the Conversation State
export interface ConversationState {
    bookingId: string;
    messages: Array<{ sender: string; content: string; timestamp: Date; }>; 
}

// Interface representing the Voice Call State
export interface VoiceCallState {
    callId: string;
    status: 'initiated' | 'in-progress' | 'ended';
    participants: Array<User>;
}