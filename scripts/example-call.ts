/**
 * Example script that simulates a booking call flow.
 *
 * Usage: npm run example-call
 *
 * This script demonstrates the booking agent's capabilities
 * by simulating the tool calls that would happen during a real call.
 */

import dotenv from 'dotenv';
dotenv.config();

import { listHostesses } from '../src/services/hostess-service';
import { makeBooking, getAvailableSlots } from '../src/services/booking-service';
import { closePool } from '../src/database/database';

async function simulateBookingCall(): Promise<void> {
  console.log('=== Simulating Booking Call ===\n');

  // 1. Check what hostesses are available
  console.log('Step 1: Listing available hostesses...');
  const hostesses = await listHostesses(true);
  console.log(`Found ${hostesses.length} active hostesses:`);
  hostesses.forEach((h) => console.log(`  - ${h.name} (${h.id})`));
  console.log();

  // 2. Check availability for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  console.log(`Step 2: Checking availability for ${dateStr}...`);
  const slots = await getAvailableSlots(dateStr);
  console.log(`Found ${slots.length} available slots:`);
  slots.slice(0, 5).forEach((s) => {
    console.log(`  - ${s.startTime}–${s.endTime} (hostess: ${s.hostessId})`);
  });
  console.log();

  // 3. Create a booking
  if (slots.length > 0) {
    const slot = slots[0];
    console.log('Step 3: Creating booking...');
    const booking = await makeBooking({
      date: dateStr,
      startTime: slot.startTime,
      endTime: slot.endTime,
      guestCount: 4,
      phoneNumber: '+15555550100',
      hostessId: slot.hostessId,
      availabilityId: slot.id,
      notes: 'Birthday celebration',
    });

    console.log('Booking created:');
    console.log(`  ID:        ${booking.id}`);
    console.log(`  Date:      ${booking.date}`);
    console.log(`  Time:      ${booking.startTime} – ${booking.endTime}`);
    console.log(`  Guests:    ${booking.guestCount}`);
    console.log(`  Status:    ${booking.status}`);
    console.log(`  Deposit:   $${booking.depositAmount}`);
    console.log(`  Total:     $${booking.totalAmount}`);
  } else {
    console.log('No slots available — run npm run seed first');
  }
}

async function main(): Promise<void> {
  try {
    await simulateBookingCall();
  } catch (err) {
    console.error('Example call failed:', err);
  } finally {
    await closePool();
  }
}

main();
