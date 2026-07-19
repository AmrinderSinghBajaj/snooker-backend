import Club from '../models/Club.js';

export async function resolveTenant(req, res, next) {
  try {
    let identifier = req.headers['x-tenant-id'];

    if (!identifier && req.query.club) {
      identifier = req.query.club;
    }

    // Resolve the actual host, accounting for proxies (e.g. Vercel)
    let host = req.hostname || '';
    const forwardedHost = req.headers['x-forwarded-host'];
    if (forwardedHost) {
      host = forwardedHost.split(',')[0].trim().split(':')[0];
    }

    const cleanHost = host.replace(/^www\./i, '');
    const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(cleanHost);

    if (!identifier) {
      // Check if it looks like a subdomain (e.g. metro.billiards-arena.com)
      if (cleanHost && !isIP) {
        const parts = cleanHost.split('.');
        if (
          parts.length > 1 &&
          parts[0] !== 'localhost' &&
          !cleanHost.includes('onrender.com') &&
          !cleanHost.includes('railway.app')
        ) {
          identifier = parts[0];
        }
      }
    }

    let club = null;
    const explicitIdentifier = req.headers['x-tenant-id'] || req.query.club;

    // 1. If explicit tenant identifier is provided, look it up first
    if (explicitIdentifier) {
      club = await Club.findOne({ subdomain: explicitIdentifier.toLowerCase() });
    }

    // 2. Fall back to custom domain matching via resolved host
    if (!club && cleanHost && !isIP) {
      const hostWithWww = `www.${cleanHost}`;
      club = await Club.findOne({
        $or: [
          { customDomain: cleanHost },
          { customDomain: hostWithWww }
        ]
      });
    }

    // 3. If not found, try custom domain matching via Origin/Referer headers
    if (!club) {
      const originHeader = req.headers.origin || req.headers.referer;
      if (originHeader) {
        try {
          const originHost = new URL(originHeader).hostname.replace(/^www\./i, '');
          const originHostWithWww = `www.${originHost}`;
          const isOriginIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(originHost);
          if (!isOriginIP) {
            club = await Club.findOne({
              $or: [
                { customDomain: originHost },
                { customDomain: originHostWithWww }
              ]
            });
          }
        } catch (e) {
          // ignore parsing errors
        }
      }
    }

    // 4. Fall back to subdomain/identifier lookup
    if (!club) {
      if (!identifier) {
        identifier = 'arena';
      }
      club = await Club.findOne({ subdomain: identifier.toLowerCase() });
    }

    if (!club) {
      return res.status(404).json({ detail: `Club tenant '${identifier || explicitIdentifier}' not found.` });
    }

    req.club = club;
    next();
  } catch (err) {
    console.error('Tenant resolution error:', err);
    return res.status(500).json({ detail: 'Error resolving tenant context.' });
  }
}
