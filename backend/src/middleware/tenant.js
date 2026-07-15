import Club from '../models/Club.js';

export async function resolveTenant(req, res, next) {
  try {
    let identifier = req.headers['x-tenant-id'];

    if (!identifier && req.query.club) {
      identifier = req.query.club;
    }

    if (!identifier) {
      const host = req.hostname;
      // Check if it looks like a subdomain (e.g. metro.billiards-arena.com)
      const parts = host.split('.');
      if (
        parts.length > 1 &&
        parts[0] !== 'www' &&
        parts[0] !== 'localhost' &&
        parts[0] !== '127' &&
        parts[0] !== '0' &&
        !host.includes('onrender.com') &&
        !host.includes('railway.app')
      ) {
        identifier = parts[0];
      }
    }

    // Fallback default
    if (!identifier) {
      identifier = 'arena';
    }

    // First try custom domain matching via request hostname
    let club = await Club.findOne({ customDomain: req.hostname });

    // If not found, try custom domain matching via Origin/Referer headers
    if (!club) {
      const originHeader = req.headers.origin || req.headers.referer;
      if (originHeader) {
        try {
          const originHost = new URL(originHeader).hostname;
          club = await Club.findOne({ customDomain: originHost });
        } catch (e) {
          // ignore parsing errors
        }
      }
    }

    // If not found, fall back to subdomain/identifier lookup
    if (!club) {
      club = await Club.findOne({ subdomain: identifier.toLowerCase() });
    }

    if (!club) {
      return res.status(404).json({ detail: `Club tenant '${identifier}' not found.` });
    }

    req.club = club;
    next();
  } catch (err) {
    console.error('Tenant resolution error:', err);
    return res.status(500).json({ detail: 'Error resolving tenant context.' });
  }
}
