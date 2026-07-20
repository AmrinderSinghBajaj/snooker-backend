import { Router } from 'express';
import Customer from '../models/Customer.js';
import GameSession from '../models/GameSession.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeCustomer } from '../utils/serializers.js';
import { getOrCreateCustomer } from '../utils/customerHelper.js';
import WalletTransaction from '../models/WalletTransaction.js';

const router = Router();

/**
 * POST /customers
 * Create a new customer manually (with optional initial advance payment).
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { display_name, initial_advance, payment_method, note } = req.body || {};
    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ detail: 'Customer name is required' });
    }

    const customer = await getOrCreateCustomer(req.admin.clubId, display_name.trim());

    const initAmt = Number(initial_advance) || 0;
    if (initAmt > 0) {
      const newBalance = Math.round(((customer.walletBalance || 0) + initAmt) * 100) / 100;
      customer.walletBalance = newBalance;
      await customer.save();

      await WalletTransaction.create({
        clubId: req.admin.clubId,
        customerId: customer._id,
        type: 'credit',
        amount: initAmt,
        balanceAfter: newBalance,
        description: note && note.trim() ? note.trim() : 'Initial advance payment',
        paymentMethod: (payment_method && ['online', 'offline'].includes(payment_method)) ? payment_method : 'offline',
      });
    }

    return res.status(201).json(serializeCustomer(customer));
  } catch (err) {
    console.error('POST /customers', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

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
 * GET /customers/wallet/summary
 * Customers with wallet balance summary.
 */
router.get('/wallet/summary', requireAuth, async (req, res) => {
  try {
    const customers = await Customer.find({ clubId: req.admin.clubId }).sort({ walletBalance: -1, displayName: 1 });
    const totalAdvance = customers.reduce((sum, c) => sum + (c.walletBalance || 0), 0);
    return res.json({
      total_advance: Math.round(totalAdvance * 100) / 100,
      customers: customers.map(serializeCustomer),
    });
  } catch (err) {
    console.error('GET /customers/wallet/summary', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /customers/:id/wallet/add
 * Add advance money to a customer's wallet.
 */
router.post('/:id/wallet/add', requireAuth, async (req, res) => {
  try {
    const { amount, payment_method, note } = req.body || {};
    const addAmt = Number(amount);
    if (!addAmt || addAmt <= 0) {
      return res.status(400).json({ detail: 'Amount must be greater than 0' });
    }

    const customer = await Customer.findOne({ _id: req.params.id, clubId: req.admin.clubId });
    if (!customer) {
      return res.status(404).json({ detail: 'Customer not found' });
    }

    const newBalance = Math.round(((customer.walletBalance || 0) + addAmt) * 100) / 100;
    customer.walletBalance = newBalance;
    await customer.save();

    const tx = await WalletTransaction.create({
      clubId: req.admin.clubId,
      customerId: customer._id,
      type: 'credit',
      amount: addAmt,
      balanceAfter: newBalance,
      description: note ? note.trim() : 'Advance payment top-up',
      paymentMethod: (payment_method && ['online', 'offline'].includes(payment_method)) ? payment_method : 'offline',
    });

    return res.json({
      customer: serializeCustomer(customer),
      transaction: {
        id: tx._id.toString(),
        type: tx.type,
        amount: tx.amount,
        balance_after: tx.balanceAfter,
        description: tx.description,
        payment_method: tx.paymentMethod,
        created_at: tx.createdAt,
      },
    });
  } catch (err) {
    console.error('POST /customers/:id/wallet/add', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /customers/:id/wallet/history
 * Transaction logs for a customer's wallet.
 */
router.get('/:id/wallet/history', requireAuth, async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, clubId: req.admin.clubId });
    if (!customer) {
      return res.status(404).json({ detail: 'Customer not found' });
    }

    const txs = await WalletTransaction.find({ customerId: customer._id, clubId: req.admin.clubId }).sort({ createdAt: -1 });

    return res.json({
      customer: serializeCustomer(customer),
      history: txs.map((tx) => ({
        id: tx._id.toString(),
        type: tx.type,
        amount: tx.amount,
        balance_after: tx.balanceAfter,
        description: tx.description,
        session_id: tx.sessionId ? tx.sessionId.toString() : null,
        payment_method: tx.paymentMethod,
        created_at: tx.createdAt,
      })),
    });
  } catch (err) {
    console.error('GET /customers/:id/wallet/history', err);
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
        wallet_balance:  c.walletBalance ?? 0,
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
