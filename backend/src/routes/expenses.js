import { Router } from 'express';
import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function getClubId(admin) {
  if (!admin || !admin.clubId) return null;
  const rawId = admin.clubId._id ? admin.clubId._id : admin.clubId;
  return new mongoose.Types.ObjectId(rawId.toString());
}

export function serializeExpense(e) {
  return {
    id:         e._id.toString(),
    title:      e.title,
    amount:     e.amount,
    category:   e.category ?? 'Other',
    note:       e.note ?? '',
    date:       e.date,
    created_by: e.createdBy ?? '',
    created_at: e.createdAt,
  };
}

/**
 * GET /expenses
 * List all expenses for current club with optional category & date filtering
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    if (!clubId) return res.json([]);

    const { category, start_date, end_date } = req.query;
    const query = { clubId };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (start_date || end_date) {
      query.date = {};
      if (start_date) {
        query.date.$gte = new Date(start_date);
      }
      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });
    return res.json(expenses.map(serializeExpense));
  } catch (err) {
    console.error('GET /expenses', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /expenses/summary
 * Total expenses summary (Overall, Current Month, Today)
 */
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const clubIdObj = getClubId(req.admin);
    if (!clubIdObj) {
      return res.json({ total_overall: 0, total_count: 0, total_today: 0, total_month: 0 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [allExpenses, todayExpenses, monthExpenses] = await Promise.all([
      Expense.aggregate([
        { $match: { clubId: clubIdObj } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: { clubId: clubIdObj, date: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { clubId: clubIdObj, date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
    ]);

    const totalOverall = allExpenses[0]?.total || 0;
    const totalCount   = allExpenses[0]?.count || 0;
    const totalToday   = todayExpenses[0]?.total || 0;
    const totalMonth   = monthExpenses[0]?.total || 0;

    return res.json({
      total_overall: totalOverall,
      total_count: totalCount,
      total_today: totalToday,
      total_month: totalMonth,
    });
  } catch (err) {
    console.error('GET /expenses/summary', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /expenses
 * Create a new expense entry
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    if (!clubId) {
      return res.status(400).json({ detail: 'No associated club found for this user' });
    }

    const { title, amount, category, note, date } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(422).json({ detail: 'Expense title/name is required' });
    }

    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      return res.status(422).json({ detail: 'Amount must be greater than 0' });
    }

    const expenseDate = date ? new Date(date) : new Date();
    if (isNaN(expenseDate.getTime())) {
      return res.status(422).json({ detail: 'Invalid expense date' });
    }

    const creatorName = req.admin.fullName || req.admin.full_name || req.admin.displayName || req.admin.username || 'Owner';

    const expense = await Expense.create({
      clubId,
      title:     title.trim().slice(0, 30),
      amount:    Math.round(amtNum * 100) / 100,
      category:  (category && typeof category === 'string' && category.trim()) ? category.trim() : 'Other',
      note:      (note && typeof note === 'string') ? note.trim().slice(0, 60) : '',
      date:      expenseDate,
      createdBy: creatorName,
    });

    return res.status(201).json(serializeExpense(expense));
  } catch (err) {
    console.error('POST /expenses', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * DELETE /expenses/:id
 * Delete an expense entry
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const clubId = getClubId(req.admin);
    const expense = await Expense.findOne({ _id: req.params.id, clubId });
    if (!expense) {
      return res.status(404).json({ detail: 'Expense entry not found' });
    }

    await Expense.deleteOne({ _id: expense._id });
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /expenses/:id', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
