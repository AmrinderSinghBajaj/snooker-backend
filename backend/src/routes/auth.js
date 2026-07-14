import { Router } from 'express';
import AdminUser from '../models/AdminUser.js';
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

    const token = createAccessToken({ sub: user.username });

    return res.json({
      access_token: token,
      token_type:   'bearer',
      club_name:    user.clubId.name,
      full_name:    user.fullName,
      role:         user.role,
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
      club_name: user.clubId.name,
      role:      user.role,
    });
  } catch (err) {
    console.error('GET /auth/me', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
