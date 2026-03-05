import { Router, Request, Response } from 'express';
import {
  makeBooking,
  getBooking,
  getBookings,
  confirmBooking,
  cancelBooking,
  getAvailableSlots,
} from '../services/booking-service';
import { BookingStatus, CreateBookingRequest } from '../types';

export const bookingsRouter = Router();

/**
 * GET /bookings
 * List bookings with optional filters: ?status=confirmed&date=2024-03-15&userId=<uuid>
 */
bookingsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filters: { status?: BookingStatus; date?: string; userId?: string } = {};
    if (req.query.status) filters.status = req.query.status as BookingStatus;
    if (req.query.date) filters.date = req.query.date as string;
    if (req.query.userId) filters.userId = req.query.userId as string;

    const bookings = await getBookings(filters);
    res.json({ data: bookings });
  } catch (err) {
    console.error('Error listing bookings:', err);
    res.status(500).json({ error: 'Failed to list bookings' });
  }
});

/**
 * POST /bookings
 * Create a new booking.
 */
bookingsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateBookingRequest;

    if (!body.date || !body.startTime || !body.endTime || !body.phoneNumber) {
      res.status(400).json({
        error: 'Missing required fields: date, startTime, endTime, phoneNumber',
      });
      return;
    }

    const booking = await makeBooking(body);
    res.status(201).json({ data: booking });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

/**
 * GET /bookings/:id
 * Get a specific booking.
 */
bookingsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const booking = await getBooking(req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    res.json({ data: booking });
  } catch (err) {
    console.error('Error getting booking:', err);
    res.status(500).json({ error: 'Failed to get booking' });
  }
});

/**
 * POST /bookings/:id/confirm
 * Confirm a booking.
 */
bookingsRouter.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    await confirmBooking(req.params.id);
    res.json({ message: 'Booking confirmed' });
  } catch (err) {
    console.error('Error confirming booking:', err);
    const msg = (err as Error).message;
    res.status(400).json({ error: msg });
  }
});

/**
 * POST /bookings/:id/cancel
 * Cancel a booking.
 */
bookingsRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    await cancelBooking(req.params.id);
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    const msg = (err as Error).message;
    res.status(400).json({ error: msg });
  }
});

/**
 * GET /bookings/availability/:date
 * Get available slots for a date. Optional query param: ?hostessId=<uuid>
 */
bookingsRouter.get('/availability/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const hostessId = req.query.hostessId as string | undefined;
    const slots = await getAvailableSlots(date, hostessId);
    res.json({ data: slots });
  } catch (err) {
    console.error('Error getting availability:', err);
    res.status(500).json({ error: 'Failed to get availability' });
  }
});
