import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Club from '../models/Club.js';
import AdminUser from '../models/AdminUser.js';
import Asset from '../models/Asset.js';
import Customer from '../models/Customer.js';
import FoodItem from '../models/FoodItem.js';
import GameSession from '../models/GameSession.js';
import { hashPassword } from '../utils/security.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware to restrict access to superadmins only
async function requireSuperAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.admin && req.admin.role === 'superadmin') {
      next();
    } else {
      return res.status(403).json({ detail: 'Forbidden: Super Admin access required' });
    }
  });
}

/**
 * GET /superadmin/clubs
 * Retrieve all clubs and their owner account credentials.
 */
router.get('/clubs', requireSuperAdmin, async (req, res) => {
  try {
    const clubs = await Club.find().sort({ createdAt: -1 });
    
    // For each club, locate the primary owner AdminUser details
    const clubListData = await Promise.all(
      clubs.map(async (club) => {
        const owner = await AdminUser.findOne({ clubId: club._id, role: 'Club Owner' });
        return {
          _id: club._id,
          name: club.name,
          subdomain: club.subdomain,
          ownerName: club.ownerName,
          targetDaily: club.targetDaily,
          themePrimary: club.themePrimary,
          themeSecondary: club.themeSecondary,
          customDomain: club.customDomain,
          logoUrl: club.logoUrl || `/branding/logo?club=${club.subdomain}`,
          isActive: club.isActive,
          expiryDate: club.expiryDate,
          firstLoginAt: club.firstLoginAt,
          trialDurationDays: club.trialDurationDays,
          ownerUsername: owner ? owner.username : '',
          ownerPassword: owner ? owner.plainPassword : '',
          createdAt: club.createdAt,
        };
      })
    );

    return res.json(clubListData);
  } catch (err) {
    console.error('GET /superadmin/clubs error:', err);
    return res.status(500).json({ detail: 'Failed to retrieve clubs list' });
  }
});

/**
 * POST /superadmin/clubs
 * Onboard a new club and create its initial Owner user.
 */
router.post('/clubs', requireSuperAdmin, async (req, res) => {
  try {
    const { name, subdomain, ownerName, username, password, validityDays } = req.body;

    if (!name || !subdomain || !ownerName || !username || !password) {
      return res.status(422).json({ detail: 'Missing required onboarding parameters' });
    }

    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!cleanSubdomain) {
      return res.status(422).json({ detail: 'Invalid subdomain slug' });
    }

    // Check if subdomain is already registered
    const existingClub = await Club.findOne({ subdomain: cleanSubdomain });
    if (existingClub) {
      return res.status(409).json({ detail: `Subdomain '${cleanSubdomain}' is already taken.` });
    }

    // Check if username is already registered
    const existingUser = await AdminUser.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ detail: `Username '${username}' is already taken.` });
    }

    // Set trial duration in days. The actual expiryDate will be calculated
    // when the club owner logs in for the very first time.
    let trialDurationDays = null;
    if (validityDays) {
      const days = parseInt(validityDays, 10);
      if (!isNaN(days) && days > 0) {
        trialDurationDays = days;
      }
    }

    // Create the club
    const club = await Club.create({
      name,
      subdomain: cleanSubdomain,
      ownerName,
      isActive: true,
      expiryDate: null, // Starts off as null until first login
      trialDurationDays,
      firstLoginAt: null,
    });

    // Create the owner user
    const hashedPassword = await hashPassword(password);
    const owner = await AdminUser.create({
      username,
      hashedPassword,
      plainPassword: password,
      fullName: ownerName,
      clubId: club._id,
      role: 'Club Owner',
    });

    return res.status(201).json({
      detail: 'Club successfully onboarded',
      club: {
        _id: club._id,
        name: club.name,
        subdomain: club.subdomain,
        ownerName: club.ownerName,
        isActive: club.isActive,
        expiryDate: club.expiryDate,
      },
      owner: {
        username: owner.username,
        fullName: owner.fullName,
      }
    });
  } catch (err) {
    console.error('POST /superadmin/clubs error:', err);
    return res.status(500).json({ detail: 'Failed to onboard new club' });
  }
});

/**
 * PUT /superadmin/clubs/:id
 * Update club settings, toggle activation status, or extend trial period.
 */
router.put('/clubs/:id', requireSuperAdmin, async (req, res) => {
  try {
    const clubId = req.params.id;
    const { name, ownerName, isActive, expiryDate, username, password, targetDaily, themePrimary, themeSecondary } = req.body;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ detail: 'Club not found' });
    }

    // Update club details
    if (name !== undefined) club.name = name;
    if (ownerName !== undefined) club.ownerName = ownerName;
    if (isActive !== undefined) club.isActive = isActive;
    if (expiryDate !== undefined) club.expiryDate = expiryDate;
    if (targetDaily !== undefined) club.targetDaily = targetDaily;
    if (themePrimary !== undefined) club.themePrimary = themePrimary;
    if (themeSecondary !== undefined) club.themeSecondary = themeSecondary;

    await club.save();

    // Update Owner details if username or password changes
    const owner = await AdminUser.findOne({ clubId: club._id, role: 'Club Owner' });
    if (owner) {
      if (ownerName !== undefined) owner.fullName = ownerName;
      if (username !== undefined && username !== owner.username) {
        // Validate if new username is already taken
        const duplicateUser = await AdminUser.findOne({ username });
        if (duplicateUser) {
          return res.status(409).json({ detail: `Username '${username}' is already taken.` });
        }
        owner.username = username;
      }
      if (password !== undefined && password !== '') {
        owner.hashedPassword = await hashPassword(password);
        owner.plainPassword = password;
      }
      await owner.save();
    }

    return res.json({ detail: 'Club details successfully updated' });
  } catch (err) {
    console.error('PUT /superadmin/clubs error:', err);
    return res.status(500).json({ detail: 'Failed to update club settings' });
  }
});

/**
 * POST /superadmin/clubs/:id/logo
 * Upload new club logo via Base64 format and save to static assets.
 */
router.post('/clubs/:id/logo', requireSuperAdmin, async (req, res) => {
  try {
    const clubId = req.params.id;
    const { logoBase64 } = req.body;

    if (!logoBase64) {
      return res.status(422).json({ detail: 'Base64 image string is required' });
    }

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ detail: 'Club not found' });
    }

    // Parse the base64 string safely without regex to avoid backtracking stack overflow on large files
    if (!logoBase64.startsWith('data:image/')) {
      return res.status(422).json({ detail: 'Invalid image format. Expected "data:image/...;base64,..."' });
    }

    const semicolonIndex = logoBase64.indexOf(';base64,');
    if (semicolonIndex === -1) {
      return res.status(422).json({ detail: 'Invalid Base64 encoding structure.' });
    }

    const mimeType = logoBase64.substring(5, semicolonIndex); // e.g. "image/png" or "image/svg+xml"
    const typeParts = mimeType.split('/');
    if (typeParts.length !== 2) {
      return res.status(422).json({ detail: 'Invalid image mime type.' });
    }

    let extension = typeParts[1].toLowerCase();
    if (extension === 'jpeg') extension = 'jpg';
    if (extension === 'svg+xml') extension = 'svg';

    const base64Data = logoBase64.substring(semicolonIndex + 8); // Skip ";base64,"
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Size check: 10MB limit (10 * 1024 * 1024 bytes)
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return res.status(422).json({ detail: 'Logo file size exceeds the 10MB limit.' });
    }
    
    // Ensure static directory exists
    const staticDir = path.join(__dirname, '../../static');
    if (!fs.existsSync(staticDir)) {
      fs.mkdirSync(staticDir, { recursive: true });
    }

    // Write file to backend static resources with dynamic extension
    const fileName = `logo_${club.subdomain}.${extension}`;
    const filePath = path.join(staticDir, fileName);
    
    await fs.promises.writeFile(filePath, imageBuffer);

    // Save static URL in database so Express static middleware serves all mime formats natively
    club.logoUrl = `/static/logo_${club.subdomain}.${extension}?t=${Date.now()}`;
    await club.save();

    return res.json({ logoUrl: club.logoUrl, detail: 'Club logo updated successfully' });
  } catch (err) {
    console.error('POST /superadmin/logo error:', err);
    return res.status(500).json({ detail: 'Failed to save logo file' });
  }
});

/**
 * DELETE /superadmin/clubs/:id
 * Delete a club and cascade delete all associated user accounts, customers, sessions, tables, and logo files.
 */
router.delete('/clubs/:id', requireSuperAdmin, async (req, res) => {
  try {
    const clubId = req.params.id;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ detail: 'Club not found' });
    }

    // 1. Delete all associated resources in parallel
    await Promise.all([
      Club.deleteOne({ _id: clubId }),
      AdminUser.deleteMany({ clubId }),
      Asset.deleteMany({ clubId }),
      Customer.deleteMany({ clubId }),
      FoodItem.deleteMany({ clubId }),
      GameSession.deleteMany({ clubId }),
    ]);

    // 2. Clean up any uploaded logo files from the disk
    const staticDir = path.join(__dirname, '../../static');
    const extensions = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];
    for (const ext of extensions) {
      const logoPath = path.join(staticDir, `logo_${club.subdomain}.${ext}`);
      if (fs.existsSync(logoPath)) {
        try {
          fs.unlinkSync(logoPath);
        } catch (err) {
          console.error(`Failed to delete logo file ${logoPath}:`, err);
        }
      }
    }

    return res.json({ detail: 'Club and all associated records deleted successfully' });
  } catch (err) {
    console.error('DELETE /superadmin/clubs error:', err);
    return res.status(500).json({ detail: 'Failed to delete club' });
  }
});

export default router;
