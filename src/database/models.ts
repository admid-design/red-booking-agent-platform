import { query, queryOne } from './database';
import {
  User,
  Hostess,
  Availability,
  Booking,
  Payment,
  Conversation,
  ConversationMessage,
  BookingStatus,
  PaymentStatus,
  PaymentType,
} from '../types';

// ─── User Model ───────────────────────────────────────────────────────────────

export async function findUserByPhone(phone: string): Promise<User | null> {
  return queryOne<User>(
    `SELECT id, phone, name, email,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM users WHERE phone = $1`,
    [phone]
  );
}

export async function findUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    `SELECT id, phone, name, email,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM users WHERE id = $1`,
    [id]
  );
}

export async function upsertUser(
  phone: string,
  data: Partial<Pick<User, 'name' | 'email'>>
): Promise<User> {
  const result = await queryOne<User>(
    `INSERT INTO users (phone, name, email)
     VALUES ($1, $2, $3)
     ON CONFLICT (phone) DO UPDATE
       SET name = COALESCE(EXCLUDED.name, users.name),
           email = COALESCE(EXCLUDED.email, users.email),
           updated_at = NOW()
     RETURNING id, phone, name, email,
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [phone, data.name ?? null, data.email ?? null]
  );
  if (!result) throw new Error('Failed to upsert user');
  return result;
}

// ─── Hostess Model ────────────────────────────────────────────────────────────

export async function findHostesses(activeOnly = true): Promise<Hostess[]> {
  return query<Hostess>(
    `SELECT id, name, phone, email, bio, photo_url AS "photoUrl",
            is_active AS "isActive", hourly_rate AS "hourlyRate",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM hostesses
     WHERE ($1 = FALSE OR is_active = TRUE)
     ORDER BY name`,
    [activeOnly]
  );
}

export async function findHostessById(id: string): Promise<Hostess | null> {
  return queryOne<Hostess>(
    `SELECT id, name, phone, email, bio, photo_url AS "photoUrl",
            is_active AS "isActive", hourly_rate AS "hourlyRate",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM hostesses WHERE id = $1`,
    [id]
  );
}

export async function createHostess(
  data: Omit<Hostess, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Hostess> {
  const result = await queryOne<Hostess>(
    `INSERT INTO hostesses (name, phone, email, bio, photo_url, is_active, hourly_rate)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, phone, email, bio, photo_url AS "photoUrl",
               is_active AS "isActive", hourly_rate AS "hourlyRate",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      data.name,
      data.phone ?? null,
      data.email ?? null,
      data.bio ?? null,
      data.photoUrl ?? null,
      data.isActive,
      data.hourlyRate,
    ]
  );
  if (!result) throw new Error('Failed to create hostess');
  return result;
}

// ─── Availability Model ───────────────────────────────────────────────────────

export async function findAvailability(
  date: string,
  hostessId?: string
): Promise<Availability[]> {
  const params: unknown[] = [date];
  let where = 'WHERE date = $1 AND is_booked = FALSE';
  if (hostessId) {
    where += ' AND hostess_id = $2';
    params.push(hostessId);
  }

  return query<Availability>(
    `SELECT id, hostess_id AS "hostessId", date,
            start_time AS "startTime", end_time AS "endTime",
            is_booked AS "isBooked", created_at AS "createdAt"
     FROM availability ${where}
     ORDER BY start_time`,
    params
  );
}

export async function markAvailabilityBooked(id: string): Promise<void> {
  await query('UPDATE availability SET is_booked = TRUE WHERE id = $1', [id]);
}

export async function createAvailability(
  data: Omit<Availability, 'id' | 'createdAt'>
): Promise<Availability> {
  const result = await queryOne<Availability>(
    `INSERT INTO availability (hostess_id, date, start_time, end_time, is_booked)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (hostess_id, date, start_time) DO NOTHING
     RETURNING id, hostess_id AS "hostessId", date,
               start_time AS "startTime", end_time AS "endTime",
               is_booked AS "isBooked", created_at AS "createdAt"`,
    [
      data.hostessId,
      data.date,
      data.startTime,
      data.endTime,
      data.isBooked ?? false,
    ]
  );
  if (!result) throw new Error('Failed to create availability slot');
  return result;
}

// ─── Booking Model ────────────────────────────────────────────────────────────

export async function createBooking(
  data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Booking> {
  const result = await queryOne<Booking>(
    `INSERT INTO bookings
       (user_id, hostess_id, availability_id, conversation_id,
        date, start_time, end_time, guest_count,
        status, total_amount, deposit_amount, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id,
               user_id AS "userId",
               hostess_id AS "hostessId",
               availability_id AS "availabilityId",
               conversation_id AS "conversationId",
               date, start_time AS "startTime", end_time AS "endTime",
               guest_count AS "guestCount", status,
               total_amount AS "totalAmount",
               deposit_amount AS "depositAmount",
               notes,
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      data.userId ?? null,
      data.hostessId ?? null,
      data.availabilityId ?? null,
      data.conversationId ?? null,
      data.date,
      data.startTime,
      data.endTime,
      data.guestCount,
      data.status,
      data.totalAmount,
      data.depositAmount,
      data.notes ?? null,
    ]
  );
  if (!result) throw new Error('Failed to create booking');
  return result;
}

export async function findBookingById(id: string): Promise<Booking | null> {
  return queryOne<Booking>(
    `SELECT id,
            user_id AS "userId",
            hostess_id AS "hostessId",
            availability_id AS "availabilityId",
            conversation_id AS "conversationId",
            date, start_time AS "startTime", end_time AS "endTime",
            guest_count AS "guestCount", status,
            total_amount AS "totalAmount",
            deposit_amount AS "depositAmount",
            notes,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM bookings WHERE id = $1`,
    [id]
  );
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<void> {
  await query(
    `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, id]
  );
}

export async function listBookings(filters?: {
  status?: BookingStatus;
  date?: string;
  userId?: string;
}): Promise<Booking[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filters?.date) {
    params.push(filters.date);
    conditions.push(`date = $${params.length}`);
  }
  if (filters?.userId) {
    params.push(filters.userId);
    conditions.push(`user_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return query<Booking>(
    `SELECT id,
            user_id AS "userId",
            hostess_id AS "hostessId",
            availability_id AS "availabilityId",
            conversation_id AS "conversationId",
            date, start_time AS "startTime", end_time AS "endTime",
            guest_count AS "guestCount", status,
            total_amount AS "totalAmount",
            deposit_amount AS "depositAmount",
            notes,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM bookings ${where}
     ORDER BY date DESC, start_time DESC`,
    params
  );
}

// ─── Payment Model ────────────────────────────────────────────────────────────

export async function createPayment(
  data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Payment> {
  const result = await queryOne<Payment>(
    `INSERT INTO payments
       (booking_id, stripe_payment_intent_id, amount, currency, status, type)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id,
               booking_id AS "bookingId",
               stripe_payment_intent_id AS "stripePaymentIntentId",
               amount, currency, status, type,
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      data.bookingId,
      data.stripePaymentIntentId ?? null,
      data.amount,
      data.currency,
      data.status,
      data.type,
    ]
  );
  if (!result) throw new Error('Failed to create payment');
  return result;
}

export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus
): Promise<void> {
  await query(
    'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, id]
  );
}

export async function findPaymentByStripeId(
  stripePaymentIntentId: string
): Promise<Payment | null> {
  return queryOne<Payment>(
    `SELECT id,
            booking_id AS "bookingId",
            stripe_payment_intent_id AS "stripePaymentIntentId",
            amount, currency, status, type,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM payments WHERE stripe_payment_intent_id = $1`,
    [stripePaymentIntentId]
  );
}

// ─── Conversation Model ───────────────────────────────────────────────────────

export async function createConversation(data: {
  callSid: string;
  userId?: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
}): Promise<Conversation> {
  const result = await queryOne<Conversation>(
    `INSERT INTO conversations (call_sid, user_id, phone_number, direction)
     VALUES ($1,$2,$3,$4)
     RETURNING id,
               call_sid AS "callSid",
               user_id AS "userId",
               phone_number AS "phoneNumber",
               direction, status, transcript,
               started_at AS "startedAt",
               ended_at AS "endedAt",
               duration_seconds AS "durationSeconds",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [data.callSid, data.userId ?? null, data.phoneNumber, data.direction]
  );
  if (!result) throw new Error('Failed to create conversation');
  return result;
}

export async function appendConversationMessage(
  id: string,
  message: ConversationMessage
): Promise<void> {
  await query(
    `UPDATE conversations
     SET transcript = transcript || $1::jsonb,
         updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify([message]), id]
  );
}

export async function closeConversation(
  id: string,
  durationSeconds: number
): Promise<void> {
  await query(
    `UPDATE conversations
     SET status = 'completed',
         ended_at = NOW(),
         duration_seconds = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [durationSeconds, id]
  );
}

export async function findConversationByCallSid(
  callSid: string
): Promise<Conversation | null> {
  return queryOne<Conversation>(
    `SELECT id,
            call_sid AS "callSid",
            user_id AS "userId",
            phone_number AS "phoneNumber",
            direction, status, transcript,
            started_at AS "startedAt",
            ended_at AS "endedAt",
            duration_seconds AS "durationSeconds",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM conversations WHERE call_sid = $1`,
    [callSid]
  );
}
