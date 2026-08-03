import { Router } from 'express';
import AdminUser from '../models/AdminUser.js';
import BlacklistedToken from '../models/BlacklistedToken.js';
import { verifyPassword, createAccessToken } from '../utils/security.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * POST /auth/login
 * FRD B.1 - Username and Password login.
 * Returns JWT + club name / owner name shown in the dashboard header.
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(422).json({ detail: 'Username and password are required' });
    }

    const user = await AdminUser.findOne({ username }).populate('clubId');
    if (!user || !(await verifyPassword(password, user.hashedPassword))) {
      return res.status(401).json({ detail: 'Incorrect username or password' });
    }

    // Ensure the club account is active and not expired (bypass for superadmin)
    if (user.role !== 'superadmin' && user.clubId) {
      const club = user.clubId;
      if (!club.isActive) {
        return res.status(403).json({ detail: 'This club account has been disabled. Please contact support (Owner: Amrinder Singh Bajaj, Email: amrindersnooker@gmail.com, Phone: 9780871564).' });
      }

      // If this is the owner's first login and they have a trial duration configured, start the timer now
      if (!club.firstLoginAt && club.trialDurationDays) {
        club.firstLoginAt = new Date();
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + club.trialDurationDays);
        club.expiryDate = expiry;
        await club.save();
      }

      if (club.expiryDate && new Date() > club.expiryDate) {
        return res.status(403).json({ detail: 'This club subscription has expired. Please contact support (Owner: Amrinder Singh Bajaj, Email: amrindersnooker@gmail.com, Phone: 9780871564).' });
      }
    }

    const token = createAccessToken({ sub: user.username });

    return res.json({
      access_token: token,
      token_type:   'bearer',
      club_name:    user.clubId ? user.clubId.name : 'Super Admin',
      full_name:    user.fullName,
      role:         user.role,
      subdomain:    user.clubId ? user.clubId.subdomain : 'superadmin',
      permissions:  user.permissions || {},
    });
  } catch (err) {
    console.error('POST /auth/login', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /auth/me
 * Used by the frontend to repopulate headers after refresh.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await AdminUser.findById(req.admin._id).populate('clubId');
    if (!user) {
      return res.status(401).json({ detail: 'User not found' });
    }
    return res.json({
      username:  user.username,
      full_name: user.fullName,
      club_name: user.clubId ? user.clubId.name : 'Super Admin',
      role:      user.role,
      subdomain: user.clubId ? user.clubId.subdomain : 'superadmin',
      permissions: user.permissions || {},
    });
  } catch (err) {
    console.error('GET /auth/me', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /auth/logout
 * Invalidate the current session token.
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      await BlacklistedToken.create({ token });
    }
    return res.json({ detail: 'Logged out successfully' });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ detail: 'Logged out successfully' });
    }
    console.error('POST /auth/logout error:', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
