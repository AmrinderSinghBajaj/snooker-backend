import { Router } from 'express';
import Customer from '../models/Customer.js';
import GameSession from '../models/GameSession.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeCustomer } from '../utils/serializers.js';

const router = Router();

/**
 * GET /customers
 * Customer Log filtered by club.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const customers = await Customer.find({ clubId: req.admin.clubId }).sort({ createdAt: -1 });
    return res.json(customers.map(serializeCustomer));
  } catch (err) {
    console.error('GET /customers', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /customers/stats
 * Customer stats aggregated and filtered by club.
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // 1. Aggregate spending per customer from GameSession.players, filtered by clubId
    const agg = await GameSession.aggregate([
      { $match: { clubId: req.admin.clubId, status: { $in: ['billed', 'payment_set'] }, totalAmount: { $gt: 0 } } },
      { $unwind: '$players' },
      { $match: { 'players.customerId': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$players.customerId',
          total_spent:      { $sum: { $ifNull: ['$players.shareAmount', '$totalAmount'] } },
          sessions_played:  { $sum: 1 },
          last_visit:       { $max: '$stopTime' },
          display_name:     { $first: '$players.displayName' },
        },
      },
    ]);

    const statsMap = {};
    for (const row of agg) {
      statsMap[row._id.toString()] = {
        total_spent:     Math.round((row.total_spent ?? 0) * 100) / 100,
        sessions_played: row.sessions_played ?? 0,
        last_visit:      row.last_visit ?? null,
      };
    }

    // 2. Fetch all customers for this club and merge stats
    const customers = await Customer.find({ clubId: req.admin.clubId }).sort({ createdAt: -1 });

    const result = customers.map((c) => {
      const stats = statsMap[c._id.toString()] || { total_spent: 0, sessions_played: 0, last_visit: null };
      return {
        id:              c._id.toString(),
        username:        c.username,
        display_name:    c.displayName,
        created_at:      c.createdAt,
        total_spent:     stats.total_spent,
        sessions_played: stats.sessions_played,
        last_visit:      stats.last_visit,
      };
    });

    result.sort((a, b) => b.total_spent - a.total_spent);

    return res.json(result);
  } catch (err) {
    console.error('GET /customers/stats', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * DELETE /customers/:id
 * Delete a customer record by ID, scoped by clubId.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, clubId: req.admin.clubId });
    if (!customer) {
      return res.status(404).json({ detail: 'Customer not found' });
    }
    return res.json({ status: 'ok', message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('DELETE /customers/:id', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
