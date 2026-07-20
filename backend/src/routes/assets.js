import { Router } from 'express';
import Asset, { ASSET_CATEGORIES } from '../models/Asset.js';
import GameSession from '../models/GameSession.js';
import { requireAuth } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { serializeAsset, serializeActiveSession } from '../utils/serializers.js';
import { getOrCreateCustomer } from '../utils/customerHelper.js';
import { nextSerialNumber } from '../utils/serial.js';

const router = Router();

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
router.get('/', requireAuth, async (req, res) => {
  try {
    const assets = await Asset.find({ clubId: req.admin.clubId, isArchived: false }).sort({ sortOrder: 1, category: 1, createdAt: 1 });
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
router.post('/', requireAuth, async (req, res) => {
  try {
    const { category, label: customLabel, hourly_rate, image_url } = req.body;
    if (!ASSET_CATEGORIES.includes(category)) {
      return res.status(422).json({ detail: `Invalid category. Must be one of: ${ASSET_CATEGORIES.join(', ')}` });
    }
    if (!hourly_rate || hourly_rate <= 0) {
      return res.status(422).json({ detail: 'hourly_rate must be greater than 0' });
    }
    const autoLabel = await nextLabel(category, req.admin.clubId);
    const label = (customLabel && typeof customLabel === 'string' && customLabel.trim())
      ? customLabel.trim()
      : autoLabel;

    const asset = await Asset.create({
      clubId:     req.admin.clubId,
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
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const asset = await Asset.findOne({ _id: req.params.id, clubId: req.admin.clubId });
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
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { label, hourly_rate, sort_order } = req.body;
    const asset = await Asset.findOne({ _id: req.params.id, clubId: req.admin.clubId });
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
router.get('/active-sessions', requireAuth, async (req, res) => {
  try {
    const sessions = await GameSession.find({ clubId: req.admin.clubId, status: { $in: ['running', 'paused'] } }).populate('assetId');
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
router.post('/:id/start', requireAuth, async (req, res) => {
  try {
    const asset = await Asset.findOne({ _id: req.params.id, clubId: req.admin.clubId });
    if (!asset) return res.status(404).json({ detail: 'Asset not found' });
    if (asset.status === 'active') {
      return res.status(400).json({ detail: 'This table/device already has an active game' });
    }

    const { player_names, start_time } = req.body;
    if (!Array.isArray(player_names) || player_names.length < 1 || player_names.length > 4) {
      return res.status(422).json({ detail: 'Enter between 1 and 4 player names' });
    }

    const players = await Promise.all(
      player_names.map(async (name) => {
        const customer = await getOrCreateCustomer(req.admin.clubId, name);
        return { customerId: customer._id, displayName: customer.displayName };
      })
    );

    let startTime = new Date();
    if (start_time) {
      const parsedTime = new Date(start_time);
      if (isNaN(parsedTime.getTime())) {
        return res.status(422).json({ detail: 'Invalid start_time format' });
      }
      // Add 1 minute tolerance for clock drifts between server and client
      if (parsedTime > new Date(Date.now() + 60 * 1000)) {
        return res.status(422).json({ detail: 'Start time cannot be in the future' });
      }
      startTime = parsedTime;
    }

    const serial = await nextSerialNumber(req.admin.clubId);
    const session = await GameSession.create({
      clubId:       req.admin.clubId,
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
router.post('/:id/pause', requireAuth, async (req, res) => {
  try {
    const session = await GameSession.findOne({ assetId: req.params.id, clubId: req.admin.clubId, status: 'running' });
    if (!session) return res.status(404).json({ detail: 'No active session found for this table' });

    session.status = 'paused';
    session.pausedAt = new Date();
    await session.save();

    return res.json({ ok: true, status: session.status });
  } catch (err) {
    console.error('POST /assets/:id/pause', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /assets/:id/resume
 */
router.post('/:id/resume', requireAuth, async (req, res) => {
  try {
    const session = await GameSession.findOne({ assetId: req.params.id, clubId: req.admin.clubId, status: 'paused' });
    if (!session) return res.status(404).json({ detail: 'No paused session found for this table' });

    const now = new Date();
    if (session.pausedAt) {
      const pausedFor = now.getTime() - new Date(session.pausedAt).getTime();
      session.pausedDurationMs = Number(session.pausedDurationMs || 0) + pausedFor;
    }
    session.pausedAt = null;
    session.status = 'running';
    await session.save();

    return res.json({ ok: true, status: session.status });
  } catch (err) {
    console.error('POST /assets/:id/resume', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * PUT /assets/active-sessions/:sessionId/players
 * Update player names in the middle of a game without stopping the timer.
 */
router.put('/active-sessions/:sessionId/players', requireAuth, async (req, res) => {
  try {
    const session = await GameSession.findOne({
      _id: req.params.sessionId,
      clubId: req.admin.clubId,
      status: { $in: ['running', 'paused'] },
    }).populate('assetId');

    if (!session) {
      return res.status(404).json({ detail: 'Active session not found' });
    }

    const { player_names } = req.body;
    if (!Array.isArray(player_names) || player_names.length < 1 || player_names.length > 4) {
      return res.status(422).json({ detail: 'Enter between 1 and 4 player names' });
    }

    const players = await Promise.all(
      player_names.map(async (name) => {
        const customer = await getOrCreateCustomer(req.admin.clubId, name);
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
