import {
  findHostesses,
  findHostessById,
  createHostess,
  findAvailability,
  createAvailability,
} from '../database/models';
import { Hostess, Availability } from '../types';

/**
 * List all active hostesses.
 */
export async function listHostesses(activeOnly = true): Promise<Hostess[]> {
  return findHostesses(activeOnly);
}

/**
 * Get a specific hostess by ID.
 */
export async function getHostess(id: string): Promise<Hostess | null> {
  return findHostessById(id);
}

/**
 * Add a new hostess.
 */
export async function addHostess(
  data: Omit<Hostess, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Hostess> {
  return createHostess(data);
}

/**
 * Get availability for a hostess on a given date.
 */
export async function getHostessAvailability(
  hostessId: string,
  date: string
): Promise<Availability[]> {
  return findAvailability(date, hostessId);
}

/**
 * Add an availability slot for a hostess.
 */
export async function addAvailabilitySlot(
  hostessId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<Availability> {
  const hostess = await findHostessById(hostessId);
  if (!hostess) throw new Error(`Hostess ${hostessId} not found`);

  return createAvailability({
    hostessId,
    date: new Date(date),
    startTime,
    endTime,
    isBooked: false,
  });
}

/**
 * Get a summary of all hostesses with their availability for a date.
 */
export async function getHostessesWithAvailability(date: string): Promise<
  Array<Hostess & { availability: Availability[] }>
> {
  const hostesses = await findHostesses(true);
  const results = await Promise.all(
    hostesses.map(async (h) => ({
      ...h,
      availability: await findAvailability(date, h.id),
    }))
  );
  return results.filter((h) => h.availability.length > 0);
}
