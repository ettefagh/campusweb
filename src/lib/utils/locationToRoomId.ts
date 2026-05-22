import { ROOMS } from '$lib/data/campusData';
import type { Room } from '$lib/data/campusData';

/**
 * Attempts to resolve an iCal event location string (as output by ical-enhancer.ts)
 * to a Room ID from campusData.ts.
 *
 * ical-enhancer.ts produces shortLocation values such as:
 *   "A0.03 - SHED", "1.02 - CUBE", "Cube 1.02", "Hall 1.02", "HALL 1.01",
 *   "2.01 HALL", "Online", "Teams Meeting", etc.
 *
 * It also stores the raw room code (e.g. "A0.03", "1.02") in a location string.
 *
 * campusData.ts room IDs are structured as:
 *   SHED:  "A0.03", "B1.14", "AS.06", "D1.51"
 *   Cube:  "Cube-0.01", "Cube-1.02", "Cube-2.01"
 *   Hall:  "Hall-1.01", "Hall-2.03"
 *
 * Returns the matched Room if found, or null.
 */
export function resolveLocationToRoom(rawLocation: string | undefined | null): Room | null {
  if (!rawLocation || rawLocation.toLowerCase() === 'online') return null;

  const loc = rawLocation.trim();

  // 1. Try direct match against room IDs (e.g. already normalized)
  const directMatch = ROOMS.find(r => r.id.toLowerCase() === loc.toLowerCase());
  if (directMatch) return directMatch;

  // 2. Detect building context from location string
  const upperLoc = loc.toUpperCase();
  const isCube = upperLoc.includes('CUBE');
  const isHall = upperLoc.includes('HALL');
  const isShed = upperLoc.includes('SHED') || (!isCube && !isHall);

  // 3. Extract room number pattern like "1.02", "0.03", "2.01", "S.06"
  // Matches patterns: A0.03, B1.14, Cube 1.02, 1.02, S.06, AS.06 etc.
  const roomCodeMatch = loc.match(/\b([A-DS]?)(\d+\.\d+|\d+)\b/i);
  if (!roomCodeMatch) return null;

  const sectionLetter = roomCodeMatch[1]?.toUpperCase() || '';
  const roomNumber = roomCodeMatch[2]; // e.g. "0.03", "1.02"

  // 4. Attempt to construct the canonical room ID and find it
  let candidateIds: string[] = [];

  if (isCube) {
    // Cube room format: "Cube-{floor}.{room}"
    candidateIds = [`Cube-${roomNumber}`];
  } else if (isHall) {
    // Hall room format: "Hall-{floor}.{room}"
    candidateIds = [`Hall-${roomNumber}`];
  } else {
    // SHED: section letter prefix + room number, or just room number
    if (sectionLetter && ['A', 'B', 'C', 'D'].includes(sectionLetter)) {
      candidateIds = [`${sectionLetter}${roomNumber}`];
    } else {
      // No explicit section — try all SHED sections
      candidateIds = ['A', 'B', 'C', 'D', 'S'].map(s => `${s}${roomNumber}`);
    }
  }

  for (const id of candidateIds) {
    const found = ROOMS.find(r => r.id === id);
    if (found) return found;
  }

  // 5. Fallback: fuzzy search — find a room whose ID ends with the room number
  const fuzzy = ROOMS.find(r => {
    const rId = r.id.toLowerCase();
    if (isCube && !rId.startsWith('cube')) return false;
    if (isHall && !rId.startsWith('hall')) return false;
    if (!isCube && !isHall && (rId.startsWith('cube') || rId.startsWith('hall'))) return false;
    return rId.endsWith(roomNumber.toLowerCase());
  });

  return fuzzy || null;
}

/**
 * Returns true if the location string refers to an on-campus physical room
 * (as opposed to online meetings, external addresses, etc.)
 */
export function isOnCampusLocation(rawLocation: string | undefined | null): boolean {
  if (!rawLocation) return false;
  const lower = rawLocation.toLowerCase().trim();
  if (lower === 'online' || lower.startsWith('http') || lower.includes('teams') ||
      lower.includes('zoom') || lower.includes('meet.google') || lower.includes('webex')) {
    return false;
  }
  return resolveLocationToRoom(rawLocation) !== null;
}
