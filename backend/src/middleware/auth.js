import { decodeAccessToken } from '../utils/security.js';
import AdminUser from '../models/AdminUser.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  const token = authHeader.slice(7);
  const payload = decodeAccessToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }
  const user = await AdminUser.findOne({ username: payload.sub });
  if (!user) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }
  req.admin = user;
  next();
}
