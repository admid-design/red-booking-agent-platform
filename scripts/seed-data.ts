import dotenv from 'dotenv';
dotenv.config();

import { createHostess, createAvailability } from '../src/database/models';
import { closePool } from '../src/database/database';

const hostessData = [
  {
    name: 'Sofia Martinez',
    bio: 'Fluent in English and Spanish, specializes in corporate events.',
    isActive: true,
    hourlyRate: 75,
  },
  {
    name: 'Isabelle Chen',
    bio: 'Experienced in luxury events and VIP guest management.',
    isActive: true,
    hourlyRate: 80,
  },
  {
    name: 'Amara Johnson',
    bio: 'Expert in cocktail events and social mixers.',
    isActive: true,
    hourlyRate: 70,
  },
];

async function seedHostesses(): Promise<string[]> {
  const ids: string[] = [];
  for (const data of hostessData) {
    const hostess = await createHostess(data);
    ids.push(hostess.id);
    console.log(`Created hostess: ${hostess.name} (${hostess.id})`);
  }
  return ids;
}

async function seedAvailability(hostessIds: string[]): Promise<void> {
  const dates = getDatesForNextWeek();
  const timeSlots = [
    { startTime: '18:00', endTime: '20:00' },
    { startTime: '20:00', endTime: '22:00' },
    { startTime: '22:00', endTime: '00:00' },
  ];

  for (const hostessId of hostessIds) {
    for (const date of dates) {
      for (const slot of timeSlots) {
        await createAvailability({
          hostessId,
          date: new Date(date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked: false,
        });
      }
    }
  }
  console.log(`Seeded availability for ${hostessIds.length} hostesses over ${dates.length} days`);
}

function getDatesForNextWeek(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

async function main(): Promise<void> {
  console.log('Seeding test data...');
  try {
    const hostessIds = await seedHostesses();
    await seedAvailability(hostessIds);
    console.log('Seed data created successfully!');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
