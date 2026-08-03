import { decodeAccessToken } from '../utils/security.js';
import AdminUser from '../models/AdminUser.js';
import BlacklistedToken from '../models/BlacklistedToken.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  const token = authHeader.slice(7);

  // Check if token has been blacklisted (logged out)
  const isBlacklisted = await BlacklistedToken.findOne({ token });
  if (isBlacklisted) {
    return res.status(401).json({ detail: 'Token has been invalidated (logged out)' });
  }

  const payload = decodeAccessToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }
  const user = await AdminUser.findOne({ username: payload.sub }).populate('clubId');
  if (!user) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }

  // If this is a regular club owner/admin, ensure their club is active and not expired
  if (user.role !== 'superadmin' && user.clubId) {
    if (!user.clubId.isActive) {
      return res.status(403).json({ detail: 'This club account has been disabled. Please contact support (Owner: Amrinder Singh Bajaj, Email: amrindersnooker@gmail.com, Phone: 9780871564).' });
    }
    if (user.clubId.expiryDate && new Date() > user.clubId.expiryDate) {
      return res.status(403).json({ detail: 'This club subscription has expired. Please contact support (Owner: Amrinder Singh Bajaj, Email: amrindersnooker@gmail.com, Phone: 9780871564).' });
    }
  }

  req.admin = user;
  next();
}
