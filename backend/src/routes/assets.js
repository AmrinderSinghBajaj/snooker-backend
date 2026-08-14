// Force deploy: trigger update deployment for assets router
import { Router } from 'express';
import Asset, { ASSET_CATEGORIES } from '../models/Asset.js';
import GameSession from '../models/GameSession.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission.js';
import { resolveTenant } from '../middleware/tenant.js';
import { serializeAsset, serializeActiveSession } from '../utils/serializers.js';
import { getOrCreateCustomer } from '../utils/customerHelper.js';
import { nextSerialNumber } from '../utils/serial.js';

const router = Router();

function getClubId(admin) {
  if (!admin || !admin.clubId) return null;
  return admin.clubId._id ? admin.clubId._id : admin.clubId;
}

/** Auto-generates the next label for a category inside a specific club */
async function nextLabel(category, clubId) {
  const count = await Asset.countDocuments({ clubId, category });
  const isTable = ['Snooker', 'Pool', 'Heyball'].includes(category);
  const prefix = isTable ? 'Table' : category;
  return `${prefix} ${count + 1}`;
}

/**
 * GET /assets
 * Visual Display grid for the Table & PS Setup screen.
 */
router.get('/', requireAuth, (req, res, next) => {
  const user = req.admin;
  if (user.role === 'Club Owner' || user.role === 'superadmin') {
    return next();
  }
  if (user.permissions?.tables?.view || user.permissions?.dashboard?.view) {
    return next();
  }
  return res.status(403).json({ detail: 'Access denied: Insufficient permissions for tables view.' });
}, async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    const assets = await Asset.find({ clubId, isArchived: false }).sort({ sortOrder: 1, category: 1, createdAt: 1 });
    return res.json(assets.map(serializeAsset));
  } catch (err) {
    console.error('GET /assets', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /assets
 * Add a new asset for this club.
 */
router.post('/', requireAuth, requirePermission('tables', 'edit'), async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    const { category, label: customLabel, hourly_rate, image_url } = req.body;
    if (!ASSET_CATEGORIES.includes(category)) {
      return res.status(422).json({ detail: `Invalid category. Must be one of: ${ASSET_CATEGORIES.join(', ')}` });
    }
    if (!hourly_rate || hourly_rate <= 0) {
      return res.status(422).json({ detail: 'hourly_rate must be greater than 0' });
    }
    const autoLabel = await nextLabel(category, clubId);
    const label = (customLabel && typeof customLabel === 'string' && customLabel.trim())
      ? customLabel.trim()
      : autoLabel;

    const asset = await Asset.create({
      clubId,
      category,
      label,
      hourlyRate: hourly_rate,
      imageUrl:   image_url ?? null,
      status:     'idle',
    });
    return res.status(201).json(serializeAsset(asset));
  } catch (err) {
    console.error('POST /assets', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * DELETE /assets/:id
 * Soft-delete (archive) an asset.
 */
router.delete('/:id', requireAuth, requirePermission('tables', 'delete'), async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    const asset = await Asset.findOne({ _id: req.params.id, clubId });
    if (!asset) return res.status(404).json({ detail: 'Asset not found' });
    asset.isArchived = true;
    await asset.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /assets/:id', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * PUT /assets/:id
 * Update an asset's label, hourly rate, or sort order (serial number/position).
 */
router.put('/:id', requireAuth, requirePermission('tables', 'edit'), async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    const { label, hourly_rate, sort_order } = req.body;
    const asset = await Asset.findOne({ _id: req.params.id, clubId });
    if (!asset) return res.status(404).json({ detail: 'Asset not found' });

    if (label !== undefined) {
      if (!label.trim()) {
        return res.status(422).json({ detail: 'Label cannot be empty' });
      }
      asset.label = label.trim();
    }
    if (hourly_rate !== undefined) {
      if (hourly_rate <= 0) {
        return res.status(422).json({ detail: 'hourly_rate must be greater than 0' });
      }
      asset.hourlyRate = hourly_rate;
    }
    if (sort_order !== undefined) {
      asset.sortOrder = Number(sort_order);
    }

    await asset.save();
    return res.json(serializeAsset(asset));
  } catch (err) {
    console.error('PUT /assets/:id', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /assets/active-sessions
 * Powers the Dashboard Table Grid.
 */
router.get('/active-sessions', requireAuth, requirePermission('dashboard', 'view'), async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    const sessions = await GameSession.find({ clubId, status: { $in: ['running', 'paused'] } }).populate('assetId');
    const result = sessions.map((s) => {
      const asset = s.assetId;
      if (!asset) return null;
      return serializeActiveSession(s, asset);
    }).filter(Boolean);
    return res.json(result);
  } catch (err) {
    console.error('GET /assets/active-sessions', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /assets/public-active-sessions
 * Public endpoint for TV dashboard (accessible without credentials).
 */
router.get('/public-active-sessions', resolveTenant, async (req, res) => {
  try {
    const assets = await Asset.find({ clubId: req.club._id, isArchived: false }).sort({ sortOrder: 1, category: 1, createdAt: 1 });
    const sessions = await GameSession.find({ clubId: req.club._id, status: { $in: ['running', 'paused'] } }).populate('assetId');

    const result = assets.map((asset) => {
      const s = sessions.find((session) => session.assetId && session.assetId._id.toString() === asset._id.toString());
      return {
        asset_id: asset._id.toString(),
        label: asset.label,
        category: asset.category,
        hourly_rate: asset.hourlyRate,
        status: asset.status,
        session: s ? serializeActiveSession(s, asset) : null,
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('GET /assets/public-active-sessions', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /assets/:id/start
 * Start a clock on the asset.
 */
router.post('/:id/start', requireAuth, requirePermission('tables', 'edit'), async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    const asset = await Asset.findOne({ _id: req.params.id, clubId });
    if (!asset) return res.status(404).json({ detail: 'Asset not found' });
    if (asset.status === 'active') {
      return res.status(400).json({ detail: 'This table/device already has an active game' });
    }

    const { player_names, start_time, client_now } = req.body;
    let players = [];
    if (player_names !== undefined && player_names !== null) {
      if (!Array.isArray(player_names) || player_names.length > 6) {
        return res.status(422).json({ detail: 'Enter up to 6 player names' });
      }
      players = await Promise.all(
        player_names.map(async (name) => {
          const customer = await getOrCreateCustomer(clubId, name);
          return { customerId: customer._id, displayName: customer.displayName };
        })
      );
    }

    let startTime = new Date();
    if (start_time) {
      let parsedTime = new Date(start_time);
      if (isNaN(parsedTime.getTime())) {
        return res.status(422).json({ detail: 'Invalid start_time format' });
      }

      // Calculate and apply clock drift adjustment if client_now is provided
      if (client_now) {
        const clientNowTime = new Date(client_now);
        if (!isNaN(clientNowTime.getTime())) {
          const drift = Date.now() - clientNowTime.getTime();
          parsedTime = new Date(parsedTime.getTime() + drift);
        }
      }

      // Add 1 minute tolerance for clock drifts between server and client
      if (parsedTime > new Date(Date.now() + 60 * 1000)) {
        return res.status(422).json({ detail: 'Start time cannot be in the future' });
      }
      startTime = parsedTime;
    }

    const serial = await nextSerialNumber(clubId);
    const session = await GameSession.create({
      clubId,
      serialNumber: serial,
      assetId:      asset._id,
      startTime:    startTime,
      status:       'running',
      players,
    });

    asset.status = 'active';
    await asset.save();

    return res.status(201).json(serializeActiveSession(session, asset));
  } catch (err) {
    console.error('POST /assets/:id/start', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /assets/:id/pause
 */
router.post('/:id/pause', requireAuth, requirePermission('tables', 'edit'), async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    const session = await GameSession.findOne({ assetId: req.params.id, clubId, status: { $in: ['running', 'paused'] } }).populate('assetId');
    if (!session) return res.status(404).json({ detail: 'No active session found for this table' });

    if (session.status === 'running') {
      session.status = 'paused';
      session.pausedAt = new Date();
      await session.save();
    }

    const asset = session.assetId;
    return res.json({ ok: true, session: serializeActiveSession(session, asset) });
  } catch (err) {
    console.error('POST /assets/:id/pause', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /assets/:id/resume
 */
router.post('/:id/resume', requireAuth, requirePermission('tables', 'edit'), async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    const session = await GameSession.findOne({ assetId: req.params.id, clubId, status: { $in: ['running', 'paused'] } }).populate('assetId');
    if (!session) return res.status(404).json({ detail: 'No active session found for this table' });

    if (session.status === 'paused') {
      const now = new Date();
      if (session.pausedAt) {
        const pausedFor = now.getTime() - new Date(session.pausedAt).getTime();
        session.pausedDurationMs = Number(session.pausedDurationMs || 0) + pausedFor;
      }
      session.pausedAt = null;
      session.status = 'running';
      await session.save();
    }

    const asset = session.assetId;
    return res.json({ ok: true, session: serializeActiveSession(session, asset) });
  } catch (err) {
    console.error('POST /assets/:id/resume', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /assets/:id/cancel
 * Hard-cancel an accidental start — deletes the session with NO billing record.
 */
router.post('/:id/cancel', requireAuth, requirePermission('tables', 'edit'), async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    const session = await GameSession.findOne({
      assetId: req.params.id,
      clubId,
      status: { $in: ['running', 'paused'] },
    });
    if (!session) return res.status(404).json({ detail: 'No active session found for this table' });

    // Hard-delete the session — no billing record
    await GameSession.deleteOne({ _id: session._id });

    // Reset asset status back to idle
    await Asset.findByIdAndUpdate(req.params.id, { status: 'idle' });

    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /assets/:id/cancel', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * PUT /assets/active-sessions/:sessionId/players
 * Update player names in the middle of a game without stopping the timer.
 */
router.put('/active-sessions/:sessionId/players', requireAuth, requirePermission('tables', 'edit'), async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    const session = await GameSession.findOne({
      _id: req.params.sessionId,
      clubId,
      status: { $in: ['running', 'paused'] },
    }).populate('assetId');

    if (!session) {
      return res.status(404).json({ detail: 'Active session not found' });
    }

    const { player_names } = req.body;
    if (!Array.isArray(player_names) || player_names.length < 1 || player_names.length > 6) {
      return res.status(422).json({ detail: 'Enter between 1 and 6 player names' });
    }

    const players = await Promise.all(
      player_names.map(async (name) => {
        const customer = await getOrCreateCustomer(clubId, name);
        return { customerId: customer._id, displayName: customer.displayName };
      })
    );

    // Track renames by index alignment to cascade to food orders
    const renames = {};
    session.players.forEach((p, idx) => {
      const oldName = p.displayName;
      const newName = player_names[idx];
      if (newName && oldName !== newName) {
        renames[oldName] = newName;
      }
    });

    session.players = players;

    if (session.foodOrders && session.foodOrders.length > 0) {
      session.foodOrders = session.foodOrders.map(line => {
        if (line.orderedBy && renames[line.orderedBy]) {
          line.orderedBy = renames[line.orderedBy];
        }
        return line;
      });
    }

    await session.save();

    const asset = session.assetId;
    if (!asset) {
      return res.status(404).json({ detail: 'Asset not found for session' });
    }

    return res.json(serializeActiveSession(session, asset));
  } catch (err) {
    console.error('PUT /assets/active-sessions/:sessionId/players', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
