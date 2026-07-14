import Customer from '../models/Customer.js';

/**
 * Find or create a Customer record for a given display name within a club.
 */
export async function getOrCreateCustomer(clubId, displayName) {
  const trimmed = displayName.trim();
  const base = trimmed.toLowerCase().replace(/\s+/g, '_');

  // Check if an exact display-name match already exists for this club
  const byName = await Customer.findOne({
    clubId,
    displayName: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') },
  });
  if (byName) return byName;

  // Find a unique username by incrementing suffix within this club
  let username = base;
  let suffix = 1;
  while (await Customer.findOne({ clubId, username })) {
    suffix++;
    username = `${base}_${suffix}`;
  }

  return Customer.create({ clubId, username, displayName: trimmed });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
