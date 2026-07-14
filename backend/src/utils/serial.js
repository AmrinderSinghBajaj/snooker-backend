import GameSession from '../models/GameSession.js';

/**
 * Returns the next serial number for a new GameSession within a club.
 */
export async function nextSerialNumber(clubId) {
  const last = await GameSession.findOne({ clubId }).sort({ serialNumber: -1 }).select('serialNumber');
  return (last?.serialNumber ?? 0) + 1;
}
