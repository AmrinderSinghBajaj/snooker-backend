import { Router } from 'express';
import GameSession from '../models/GameSession.js';
import Club from '../models/Club.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const WEEKDAY_COLORS = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899'];

/** Returns { start, end } Date objects for a calendar day in UTC */
function dayWindow(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end   = new Date(start.getTime() + 86400000);
  return { start, end };
}

/** Sum of totalAmount for paid/billed sessions in a time window for a specific club */
async function sumInWindow(clubId, start, end) {
  const result = await GameSession.aggregate([
    { $match: { clubId, status: 'billed', paymentStatus: 'paid', finalizedAt: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  return result[0]?.total ?? 0;
}

/** Full session docs for paid sessions in a window, for drilldown lists */
async function sessionsInWindow(clubId, start, end) {
  return GameSession.find({
    clubId,
    status: 'billed',
    paymentStatus: 'paid',
    finalizedAt: { $gte: start, $lt: end },
  }).sort({ finalizedAt: 1 });
}

function formatTransaction(s) {
  const minutes = (s.startTime && s.stopTime)
    ? Math.round((new Date(s.stopTime) - new Date(s.startTime)) / 60000 * 100) / 100
    : 0;
  let payers = s.players.filter((p) => p.isPayer);
  if (payers.length === 0) {
    payers = s.players;
  }
  return {
    serial_number:      s.serialNumber,
    player_names:       payers.map((p) => p.displayName),
    time_played_minutes: minutes,
    total_amount:       s.totalAmount ?? 0,
    payment_method:     s.paymentMethod ?? null,
  };
}

// ─── Donut summaries ─────────────────────────────────────────────────────────

/**
 * GET /revenue/today
 */
router.get('/today', requireAuth, async (req, res) => {
  try {
    const now  = new Date();
    const { start, end } = dayWindow(now);
    const total = await sumInWindow(req.admin.clubId, start, end);
    const club = await Club.findById(req.admin.clubId);
    const threshold = club?.targetDaily || 2000;

    return res.json({
      total,
      is_above_threshold: total >= threshold,
      threshold,
    });
  } catch (err) {
    console.error('GET /revenue/today', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /revenue/weekly
 */
router.get('/weekly', requireAuth, async (req, res) => {
  try {
    const now       = new Date();
    const todayUTC  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart = new Date(todayUTC.getTime() - 6 * 86400000);

    let grandTotal = 0;
    const slices = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(weekStart.getTime() + i * 86400000);
      const dayEnd   = new Date(dayStart.getTime() + 86400000);
      const value    = await sumInWindow(req.admin.clubId, dayStart, dayEnd);
      grandTotal    += value;
      const jsDay  = dayStart.getUTCDay();
      const pyDay  = (jsDay + 6) % 7;
      slices.push({
        label: dayStart.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' }),
        value: Math.round(value * 100) / 100,
        color: WEEKDAY_COLORS[pyDay],
      });
    }
    return res.json({ total: Math.round(grandTotal * 100) / 100, slices });
  } catch (err) {
    console.error('GET /revenue/weekly', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /revenue/monthly
 */
router.get('/monthly', requireAuth, async (req, res) => {
  try {
    const now        = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const total      = await sumInWindow(req.admin.clubId, monthStart, monthEnd);
    const label      = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return res.json({ total: Math.round(total * 100) / 100, month_label: label });
  } catch (err) {
    console.error('GET /revenue/monthly', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ─── Drilldowns ──────────────────────────────────────────────────────────────

/**
 * GET /revenue/drilldown/day
 */
router.get('/drilldown/day', requireAuth, async (req, res) => {
  try {
    const { target_date } = req.query;
    if (!target_date) return res.status(422).json({ detail: 'target_date is required (YYYY-MM-DD)' });
    const d = new Date(target_date + 'T00:00:00Z');
    const { start, end } = dayWindow(d);
    const sessions = await sessionsInWindow(req.admin.clubId, start, end);
    return res.json({ date: target_date, transactions: sessions.map(formatTransaction) });
  } catch (err) {
    console.error('GET /revenue/drilldown/day', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /revenue/drilldown/week
 */
router.get('/drilldown/week', requireAuth, async (req, res) => {
  try {
    const { week_end } = req.query;
    if (!week_end) return res.status(422).json({ detail: 'week_end is required (YYYY-MM-DD)' });

    const endDay   = new Date(week_end + 'T00:00:00Z');
    const endDt    = new Date(endDay.getTime() + 86400000);
    const startDt  = new Date(endDt.getTime() - 7 * 86400000);

    const dailyTotals = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startDt.getTime() + i * 86400000);
      const dayEnd   = new Date(dayStart.getTime() + 86400000);
      const value    = await sumInWindow(req.admin.clubId, dayStart, dayEnd);
      const jsDay    = dayStart.getUTCDay();
      const pyDay    = (jsDay + 6) % 7;
      const label    = dayStart.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });
      dailyTotals.push({ label, value: Math.round(value * 100) / 100, color: WEEKDAY_COLORS[pyDay] });
    }

    return res.json({
      start_date:   startDt.toISOString().slice(0, 10),
      end_date:     week_end,
      daily_totals: dailyTotals,
    });
  } catch (err) {
    console.error('GET /revenue/drilldown/week', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /revenue/drilldown/month
 */
router.get('/drilldown/month', requireAuth, async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(422).json({ detail: 'year and month are required' });

    const y          = parseInt(year, 10);
    const m          = parseInt(month, 10) - 1;
    const monthStart = new Date(Date.UTC(y, m, 1));
    const monthEnd   = new Date(Date.UTC(y, m + 1, 1));
    const numDays    = (monthEnd - monthStart) / 86400000;

    const dailyTotals = [];
    for (let i = 0; i < numDays; i++) {
      const dayStart = new Date(monthStart.getTime() + i * 86400000);
      const dayEnd   = new Date(dayStart.getTime() + 86400000);
      const value    = await sumInWindow(req.admin.clubId, dayStart, dayEnd);
      dailyTotals.push({ label: String(i + 1), value: Math.round(value * 100) / 100 });
    }

    const label = monthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return res.json({ month_label: label, daily_totals: dailyTotals });
  } catch (err) {
    console.error('GET /revenue/drilldown/month', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// ─── Search ──────────────────────────────────────────────────────────────────

/**
 * GET /revenue/search/date
 */
router.get('/search/date', requireAuth, async (req, res) => {
  try {
    const { target_date } = req.query;
    if (!target_date) return res.status(422).json({ detail: 'target_date is required (YYYY-MM-DD)' });
    const d = new Date(target_date + 'T00:00:00Z');
    const { start, end } = dayWindow(d);
    const sessions = await sessionsInWindow(req.admin.clubId, start, end);
    return res.json({ date: target_date, transactions: sessions.map(formatTransaction) });
  } catch (err) {
    console.error('GET /revenue/search/date', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /revenue/search/range
 */
router.get('/search/range', requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) return res.status(422).json({ detail: 'start_date and end_date are required' });

    const startDt = new Date(start_date + 'T00:00:00Z');
    const endDt   = new Date(end_date   + 'T23:59:59.999Z');

    const totalEarnings = await sumInWindow(req.admin.clubId, startDt, new Date(endDt.getTime() + 1));

    const unpaidSessions = await GameSession.find({
      clubId:        req.admin.clubId,
      status:        'billed',
      paymentStatus: 'unpaid',
      finalizedAt:   { $gte: startDt, $lte: endDt },
    });

    const dueBills = unpaidSessions.map((s) => ({
      session_id:   s._id.toString(),
      serial_number: s.serialNumber,
      player_names: s.players.map((p) => p.displayName),
      pending_amount: s.pendingAmount ?? 0,
    }));

    return res.json({
      start_date,
      end_date,
      total_earnings: Math.round(totalEarnings * 100) / 100,
      due_bills:      dueBills,
    });
  } catch (err) {
    console.error('GET /revenue/search/range', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
