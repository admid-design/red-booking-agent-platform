import { RealtimeTool } from '../types';
import { getAvailableSlots } from '../services/booking-service';
import { listHostesses, getHostessesWithAvailability } from '../services/hostess-service';
import { makeBooking } from '../services/booking-service';
import { getBooking } from '../services/booking-service';

export interface ToolDefinition {
  realtimeTool: RealtimeTool;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Check available time slots on a given date.
 */
const checkAvailabilityTool: ToolDefinition = {
  realtimeTool: {
    type: 'function',
    name: 'check_availability',
    description: 'Check available booking slots on a specific date. Returns available time slots and hostesses.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date to check in YYYY-MM-DD format',
        },
        hostess_id: {
          type: 'string',
          description: 'Optional hostess ID to filter by a specific hostess',
        },
      },
      required: ['date'],
    },
  },
  execute: async (args) => {
    const date = args.date as string;
    const hostessId = args.hostess_id as string | undefined;
    const slots = await getAvailableSlots(date, hostessId);
    return {
      date,
      availableSlots: slots.map((s) => ({
        id: s.id,
        hostessId: s.hostessId,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    };
  },
};

/**
 * List available hostesses.
 */
const listHostessesTool: ToolDefinition = {
  realtimeTool: {
    type: 'function',
    name: 'list_hostesses',
    description: 'List available hostesses with their names and details.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Optional date in YYYY-MM-DD format to show only hostesses available on that day',
        },
      },
      required: [],
    },
  },
  execute: async (args) => {
    const date = args.date as string | undefined;
    if (date) {
      const hostessesWithAvailability = await getHostessesWithAvailability(date);
      return {
        hostesses: hostessesWithAvailability.map((h) => ({
          id: h.id,
          name: h.name,
          bio: h.bio,
          availableSlots: h.availability.length,
        })),
      };
    }
    const hostesses = await listHostesses(true);
    return {
      hostesses: hostesses.map((h) => ({
        id: h.id,
        name: h.name,
        bio: h.bio,
      })),
    };
  },
};

/**
 * Create a booking.
 */
const createBookingTool: ToolDefinition = {
  realtimeTool: {
    type: 'function',
    name: 'create_booking',
    description: 'Create a new booking for the caller. Use this after confirming all details with the caller.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Booking date in YYYY-MM-DD format',
        },
        start_time: {
          type: 'string',
          description: 'Start time in HH:MM format (24-hour)',
        },
        end_time: {
          type: 'string',
          description: 'End time in HH:MM format (24-hour)',
        },
        guest_count: {
          type: 'number',
          description: 'Number of guests',
        },
        phone_number: {
          type: 'string',
          description: "Caller's phone number",
        },
        hostess_id: {
          type: 'string',
          description: 'Optional hostess ID if caller selected a specific hostess',
        },
        availability_id: {
          type: 'string',
          description: 'Optional availability slot ID to reserve',
        },
        notes: {
          type: 'string',
          description: 'Any special requests or notes',
        },
      },
      required: ['date', 'start_time', 'end_time', 'guest_count', 'phone_number'],
    },
  },
  execute: async (args) => {
    const booking = await makeBooking({
      date: args.date as string,
      startTime: args.start_time as string,
      endTime: args.end_time as string,
      guestCount: args.guest_count as number,
      phoneNumber: args.phone_number as string,
      hostessId: args.hostess_id as string | undefined,
      availabilityId: args.availability_id as string | undefined,
      notes: args.notes as string | undefined,
    });
    return {
      success: true,
      bookingId: booking.id,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      guestCount: booking.guestCount,
      depositAmount: booking.depositAmount,
      totalAmount: booking.totalAmount,
      status: booking.status,
    };
  },
};

/**
 * Look up an existing booking.
 */
const lookupBookingTool: ToolDefinition = {
  realtimeTool: {
    type: 'function',
    name: 'lookup_booking',
    description: 'Look up an existing booking by its ID.',
    parameters: {
      type: 'object',
      properties: {
        booking_id: {
          type: 'string',
          description: 'The booking ID to look up',
        },
      },
      required: ['booking_id'],
    },
  },
  execute: async (args) => {
    const booking = await getBooking(args.booking_id as string);
    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }
    return {
      success: true,
      bookingId: booking.id,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      guestCount: booking.guestCount,
      status: booking.status,
      depositAmount: booking.depositAmount,
      totalAmount: booking.totalAmount,
    };
  },
};

export const agentTools: ToolDefinition[] = [
  checkAvailabilityTool,
  listHostessesTool,
  createBookingTool,
  lookupBookingTool,
];

export function getRealtimeTools(): RealtimeTool[] {
  return agentTools.map((t) => t.realtimeTool);
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const tool = agentTools.find((t) => t.realtimeTool.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.execute(args);
}
