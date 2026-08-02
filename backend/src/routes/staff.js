import { Router } from 'express';
import AdminUser from '../models/AdminUser.js';
import { hashPassword } from '../utils/security.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Middleware to restrict access to Club Owners or Super Admins
function requireOwnerOrSuper(req, res, next) {
  if (req.admin.role === 'Club Owner' || req.admin.role === 'superadmin') {
    return next();
  }
  return res.status(403).json({ detail: 'Access denied: Only Club Owners can manage staff.' });
}

/**
 * GET /staff
 * List all employees/sub-admins for the current club.
 */
router.get('/', requireAuth, requireOwnerOrSuper, async (req, res) => {
  try {
    const staff = await AdminUser.find({
      clubId: req.admin.clubId,
      _id: { $ne: req.admin._id }
    }).sort({ createdAt: -1 });

    return res.json(staff.map(user => ({
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions || {},
      plainPassword: user.plainPassword || ''
    })));
  } catch (err) {
    console.error('GET /staff', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /staff
 * Create a new employee/sub-admin under the current club.
 */
router.post('/', requireAuth, requireOwnerOrSuper, async (req, res) => {
  try {
    const { username, fullName, password, permissions } = req.body;

    if (!username || !fullName || !password) {
      return res.status(422).json({ detail: 'Username, Full Name, and Password are required.' });
    }

    // Check if username already exists globally
    const existingUser = await AdminUser.findOne({ username });
    if (existingUser) {
      return res.status(422).json({ detail: 'Username is already taken.' });
    }

    const hashedPassword = await hashPassword(password);

    const newStaff = await AdminUser.create({
      username: username.trim(),
      hashedPassword,
      fullName: fullName.trim(),
      clubId: req.admin.clubId,
      role: 'employee',
      plainPassword: password, // For owner convenience to view in list
      permissions: permissions || {}
    });

    return res.status(201).json({
      id: newStaff._id.toString(),
      username: newStaff.username,
      fullName: newStaff.fullName,
      role: newStaff.role,
      permissions: newStaff.permissions || {},
      plainPassword: newStaff.plainPassword || ''
    });
  } catch (err) {
    console.error('POST /staff', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * PUT /staff/:id
 * Update employee/sub-admin details and permissions.
 */
router.put('/:id', requireAuth, requireOwnerOrSuper, async (req, res) => {
  try {
    const { fullName, password, permissions } = req.body;
    const { id } = req.params;

    const staffUser = await AdminUser.findOne({ _id: id, clubId: req.admin.clubId });
    if (!staffUser) {
      return res.status(404).json({ detail: 'Sub-admin user not found.' });
    }

    if (fullName) {
      staffUser.fullName = fullName.trim();
    }

    if (password && password.trim() !== '') {
      staffUser.hashedPassword = await hashPassword(password);
      staffUser.plainPassword = password;
    }

    if (permissions) {
      staffUser.permissions = permissions;
    }

    await staffUser.save();

    return res.json({
      id: staffUser._id.toString(),
      username: staffUser.username,
      fullName: staffUser.fullName,
      role: staffUser.role,
      permissions: staffUser.permissions || {},
      plainPassword: staffUser.plainPassword || ''
    });
  } catch (err) {
    console.error('PUT /staff/:id', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * DELETE /staff/:id
 * Remove a sub-admin.
 */
router.delete('/:id', requireAuth, requireOwnerOrSuper, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await AdminUser.deleteOne({ _id: id, clubId: req.admin.clubId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'Sub-admin user not found.' });
    }

    return res.json({ success: true, message: 'Sub-admin removed successfully.' });
  } catch (err) {
    console.error('DELETE /staff/:id', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
