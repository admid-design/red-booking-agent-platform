import {
  createBooking,
  findBookingById,
  updateBookingStatus,
  listBookings,
  findAvailability,
  markAvailabilityBooked,
  upsertUser,
} from '../database/models';
import { Booking, BookingStatus, CreateBookingRequest, UpdateBookingRequest } from '../types';
import { config } from '../config';

/**
 * Create a new booking and mark availability as booked.
 */
export async function makeBooking(req: CreateBookingRequest): Promise<Booking> {
  // Ensure the user exists
  const user = await upsertUser(req.phoneNumber, {});

  // Calculate deposit (e.g., 20% of total)
  const totalAmount = calculateTotal(req);
  const depositAmount = Math.round(totalAmount * 0.2 * 100) / 100;

  const booking = await createBooking({
    userId: user.id,
    hostessId: req.hostessId,
    availabilityId: req.availabilityId,
    conversationId: undefined,
    date: new Date(req.date),
    startTime: req.startTime,
    endTime: req.endTime,
    guestCount: req.guestCount,
    status: 'pending',
    totalAmount,
    depositAmount,
    notes: req.notes,
  });

  // Mark availability slot as booked if provided
  if (req.availabilityId) {
    await markAvailabilityBooked(req.availabilityId);
  }

  return booking;
}

/**
 * Retrieve a booking by ID.
 */
export async function getBooking(id: string): Promise<Booking | null> {
  return findBookingById(id);
}

/**
 * List bookings with optional filters.
 */
export async function getBookings(filters?: {
  status?: BookingStatus;
  date?: string;
  userId?: string;
}): Promise<Booking[]> {
  return listBookings(filters);
}

/**
 * Confirm a booking (transition from pending → confirmed).
 */
export async function confirmBooking(id: string): Promise<void> {
  const booking = await findBookingById(id);
  if (!booking) throw new Error(`Booking ${id} not found`);
  if (booking.status !== 'pending') {
    throw new Error(`Booking ${id} is not in pending status`);
  }
  await updateBookingStatus(id, 'confirmed');
}

/**
 * Cancel a booking.
 */
export async function cancelBooking(id: string): Promise<void> {
  const booking = await findBookingById(id);
  if (!booking) throw new Error(`Booking ${id} not found`);
  if (['completed', 'cancelled'].includes(booking.status)) {
    throw new Error(`Booking ${id} cannot be cancelled in status: ${booking.status}`);
  }
  await updateBookingStatus(id, 'cancelled');
}

/**
 * Get available time slots for a given date.
 */
export async function getAvailableSlots(
  date: string,
  hostessId?: string
): Promise<ReturnType<typeof findAvailability>> {
  return findAvailability(date, hostessId);
}

/**
 * Simple pricing calculation based on guest count and duration.
 */
function calculateTotal(req: CreateBookingRequest): number {
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(req.startTime) || !timeRegex.test(req.endTime)) {
    throw new Error('Invalid time format. Expected HH:MM');
  }

  const [startH, startM] = req.startTime.split(':').map(Number);
  const [endH, endM] = req.endTime.split(':').map(Number);
  const durationHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;

  if (durationHours <= 0) {
    throw new Error('End time must be after start time');
  }

  return (
    Math.round(
      (durationHours * config.business.baseRatePerHour +
        req.guestCount * config.business.ratePerGuest) *
        100
    ) / 100
  );
}
