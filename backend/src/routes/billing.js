import { Router } from 'express';
import GameSession from '../models/GameSession.js';
import Asset from '../models/Asset.js';
import Customer from '../models/Customer.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeBillingRecord, serializeSessionDetail } from '../utils/serializers.js';
import { getOrCreateCustomer } from '../utils/customerHelper.js';
import { nextSerialNumber } from '../utils/serial.js';
import { getEffectiveElapsedMs } from '../utils/time.js';

const router = Router();

/** Compute minutes played and time charge for a session */
function computeTimeAmount(session, asset) {
  const end = session.stopTime || new Date();
  const elapsedMs = getEffectiveElapsedMs(session, end);
  const minutes = Math.max(elapsedMs / 60000, 0);
  if (!asset) return { minutes, amount: session.timeAmount ?? 0 };
  const perMinute = asset.hourlyRate / 60;
  return { minutes: Math.round(minutes * 100) / 100, amount: Math.round(minutes * perMinute * 100) / 100 };
}

/** Resolve the asset label for a session - from linked asset or override */
async function resolveLabel(session) {
  if (session.assetId) {
    const asset = await Asset.findOne({ _id: session.assetId, clubId: session.clubId }).select('label');
    if (asset) return asset.label;
  }
  return session.assetLabelOverride || 'Manual Entry';
}

/**
 * POST /billing/:sessionId/stop
 */
router.post('/:sessionId/stop', requireAuth, async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Session not found' });
    if (!['running', 'paused'].includes(session.status)) {
      return res.status(400).json({ detail: 'Session is not active' });
    }

    const asset = session.assetId ? await Asset.findOne({ _id: session.assetId, clubId: req.admin.clubId }) : null;

    session.stopTime = new Date();
    session.pausedAt = null;
    session.status   = 'stopped';
    const { minutes, amount } = computeTimeAmount(session, asset);
    session.timeAmount  = amount;
    session.totalAmount = Math.round((amount + (session.foodAmount ?? 0)) * 100) / 100;

    if (asset) {
      asset.status = 'stopped';
      await asset.save();
    }
    await session.save();

    return res.json({
      session_id:    session._id.toString(),
      minutes_played: minutes,
      time_amount:   session.timeAmount,
      food_amount:   session.foodAmount ?? 0,
      total_amount:  session.totalAmount,
    });
  } catch (err) {
    console.error('POST /billing/:id/stop', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /billing/:sessionId/split
 */
router.post('/:sessionId/split', requireAuth, async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Session not found' });

    const { payer_customer_ids, payer_names } = req.body;
    
    let resolvedPayerCids = [];
    if (Array.isArray(payer_names) && payer_names.length > 0) {
      resolvedPayerCids = session.players
          .filter(p => payer_names.includes(p.displayName))
          .map(p => p.customerId.toString());
    } else if (Array.isArray(payer_customer_ids)) {
      resolvedPayerCids = payer_customer_ids;
    }

    if (resolvedPayerCids.length === 0) {
      return res.status(400).json({ detail: 'Select at least one paying player' });
    }

    const validIds = session.players.map((p) => p.customerId.toString());
    for (const cid of resolvedPayerCids) {
      if (!validIds.includes(cid)) {
        return res.status(400).json({ detail: `Customer ${cid} is not part of this session` });
      }
    }

    const share = Math.round((session.totalAmount / resolvedPayerCids.length) * 100) / 100;
    const payersOut = [];

    session.players = session.players.map((p) => {
      const isPayer = resolvedPayerCids.includes(p.customerId.toString());
      if (isPayer) {
        payersOut.push({ customer_id: p.customerId.toString(), name: p.displayName, share_amount: share });
      }
      return { ...p.toObject(), isPayer, shareAmount: isPayer ? share : null };
    });

    await session.save();

    return res.json({
      session_id:   session._id.toString(),
      total_amount: session.totalAmount,
      payers:       payersOut,
    });
  } catch (err) {
    console.error('POST /billing/:id/split', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /billing/:sessionId/done
 */
router.post('/:sessionId/done', requireAuth, async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Session not found' });
    if (session.status !== 'stopped') return res.status(400).json({ detail: 'Stop the game before finalizing' });

    const { payer_names } = req.body;

    let targetNames = [];
    if (Array.isArray(payer_names) && payer_names.length > 0) {
      targetNames = payer_names;
    } else {
      targetNames = session.players.map(p => p.displayName);
    }

    if (targetNames.length > 1) {
      // Split billing between multiple players
      const M = targetNames.length;
      const share = Math.round((session.totalAmount / M) * 100) / 100;
      const shareTime = Math.round((session.timeAmount / M) * 100) / 100;
      const shareFood = Math.round((session.foodAmount / M) * 100) / 100;

      const payerPlayers = session.players.filter(p => targetNames.includes(p.displayName));

      const firstPayer = payerPlayers[0] || session.players[0];
      session.players = [{
        customerId: firstPayer.customerId,
        displayName: firstPayer.displayName,
        isPayer: true,
        shareAmount: share
      }];
      session.timeAmount = shareTime;
      session.foodAmount = shareFood;
      session.totalAmount = share;
      session.paymentStatus = 'unpaid';
      session.paidAmount = 0;
      session.pendingAmount = share;
      session.status = 'billed';
      session.finalizedAt = new Date();

      if (session.assetId) {
        const asset = await Asset.findOne({ _id: session.assetId, clubId: req.admin.clubId });
        if (asset) {
          asset.status = 'idle';
          await asset.save();
        }
      }
      await session.save();

      let baseSerial = await nextSerialNumber(req.admin.clubId);
      for (let i = 1; i < M; i++) {
        const payer = payerPlayers[i];
        if (!payer) continue;
        await GameSession.create({
          clubId: req.admin.clubId,
          serialNumber: baseSerial++,
          assetId: session.assetId,
          assetLabelOverride: session.assetLabelOverride,
          startTime: session.startTime,
          stopTime: session.stopTime,
          finalizedAt: session.finalizedAt,
          status: 'billed',
          timeAmount: shareTime,
          foodAmount: shareFood,
          totalAmount: share,
          paymentStatus: 'unpaid',
          paidAmount: 0,
          pendingAmount: share,
          players: [{
            customerId: payer.customerId,
            displayName: payer.displayName,
            isPayer: true,
            shareAmount: share
          }],
          foodOrders: [],
          isManualEntry: session.isManualEntry,
        });
      }
    } else {
      // Single payer
      const resolvedPayers = session.players.filter(p => targetNames.includes(p.displayName));
      if (resolvedPayers.length > 0) {
        session.players = resolvedPayers.map(p => ({
          customerId: p.customerId,
          displayName: p.displayName,
          isPayer: true,
          shareAmount: session.totalAmount,
        }));
      }

      session.status        = 'billed';
      session.finalizedAt   = new Date();
      session.paymentStatus = 'unpaid';
      session.paidAmount    = 0;
      session.pendingAmount = session.totalAmount;

      if (session.assetId) {
        const asset = await Asset.findOne({ _id: session.assetId, clubId: req.admin.clubId });
        if (asset) {
          asset.status = 'idle';
          await asset.save();
        }
      }
      await session.save();
    }

    const label = await resolveLabel(session);
    return res.json(serializeBillingRecord(session, label));
  } catch (err) {
    console.error('POST /billing/:id/done', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /billing/records
 */
router.get('/records', requireAuth, async (req, res) => {
  try {
    const sessions = await GameSession.find({ clubId: req.admin.clubId, status: 'billed' }).sort({ serialNumber: -1 });

    const result = await Promise.all(sessions.map(async (s) => {
      const label = await resolveLabel(s);
      return serializeBillingRecord(s, label);
    }));

    return res.json(result);
  } catch (err) {
    console.error('GET /billing/records', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /billing/:sessionId/paid
 */
router.post('/:sessionId/paid', requireAuth, async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Session not found' });

    const { payment_method } = req.body || {};
    session.paymentStatus = 'paid';
    session.paidAmount    = session.totalAmount;
    session.pendingAmount = 0;
    session.paymentMethod = (payment_method && ['online', 'offline'].includes(payment_method))
      ? payment_method
      : 'offline';
    await session.save();

    const label = await resolveLabel(session);
    return res.json(serializeBillingRecord(session, label));
  } catch (err) {
    console.error('POST /billing/:id/paid', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /billing/:sessionId/unpaid
 */
router.post('/:sessionId/unpaid', requireAuth, async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Session not found' });

    const { paid_amount, pending_amount } = req.body;
    const paid    = Number(paid_amount)    ?? 0;
    const pending = Number(pending_amount) ?? 0;

    if (Math.round((paid + pending) * 100) !== Math.round(session.totalAmount * 100)) {
      return res.status(400).json({
        detail: `Paid Amount + Pending Amount must equal the Total Amount (₹${session.totalAmount.toFixed(2)})`,
      });
    }

    session.paymentStatus = 'unpaid';
    session.paidAmount    = paid;
    session.pendingAmount = pending;
    await session.save();

    const label = await resolveLabel(session);
    return res.json(serializeBillingRecord(session, label));
  } catch (err) {
    console.error('POST /billing/:id/unpaid', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /billing/:sessionId/detail
 */
router.get('/:sessionId/detail', requireAuth, async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Session not found' });

    const label = await resolveLabel(session);
    return res.json(serializeSessionDetail(session, label));
  } catch (err) {
    console.error('GET /billing/:id/detail', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * PUT /billing/:sessionId/edit
 */
router.put('/:sessionId/edit', requireAuth, async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Billing record not found' });
    if (session.status !== 'billed') {
      return res.status(400).json({ detail: 'Only finalized (billed) records can be edited here' });
    }

    const {
      asset_label_override, player_names,
      start_time, stop_time, food_amount, total_amount,
      payment_status, paid_amount, pending_amount,
      payment_method,
    } = req.body;

    if (asset_label_override != null) session.assetLabelOverride = asset_label_override;

    if (Array.isArray(player_names)) {
      const cleaned = player_names.map((n) => n.trim()).filter(Boolean);
      if (cleaned.length === 0) return res.status(400).json({ detail: 'At least one player name is required' });
      const players = await Promise.all(cleaned.map(async (name) => {
        const customer = await getOrCreateCustomer(req.admin.clubId, name);
        return { customerId: customer._id, displayName: customer.displayName };
      }));
      session.players = players;
    }

    if (start_time  != null) session.startTime   = new Date(start_time);
    if (stop_time   != null) session.stopTime     = new Date(stop_time);
    if (food_amount != null) session.foodAmount   = Number(food_amount);
    if (total_amount != null) session.totalAmount = Number(total_amount);

    if (payment_status != null) {
      if (!['paid', 'unpaid'].includes(payment_status)) {
        return res.status(400).json({ detail: "payment_status must be 'paid' or 'unpaid'" });
      }
      session.paymentStatus = payment_status;
      if (payment_status === 'unpaid') {
        session.paymentMethod = null;
      }
    }
    if (session.paymentStatus === 'paid') {
      if (payment_method != null) {
        session.paymentMethod = payment_method;
      } else if (!session.paymentMethod) {
        session.paymentMethod = 'offline';
      }
    }
    if (paid_amount    != null) session.paidAmount    = Number(paid_amount);
    if (pending_amount != null) session.pendingAmount = Number(pending_amount);

    session.timeAmount = Math.round(((session.totalAmount ?? 0) - (session.foodAmount ?? 0)) * 100) / 100;

    session.wasEdited    = true;
    session.lastEditedAt = new Date();
    await session.save();

    const label = await resolveLabel(session);
    return res.json(serializeBillingRecord(session, label));
  } catch (err) {
    console.error('PUT /billing/:id/edit', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /billing/manual-entry
 */
router.post('/manual-entry', requireAuth, async (req, res) => {
  try {
    const {
      asset_label, player_names, start_time, stop_time,
      food_amount, total_amount, payment_status, paid_amount, pending_amount,
      payment_method,
    } = req.body;

    const cleaned = (player_names || []).map((n) => n.trim()).filter(Boolean);
    if (cleaned.length === 0) return res.status(400).json({ detail: 'At least one player name is required' });
    if (!asset_label?.trim()) return res.status(400).json({ detail: 'Enter a table or label' });
    if (new Date(stop_time) <= new Date(start_time)) {
      return res.status(400).json({ detail: 'Stop time must be after start time' });
    }
    if (!total_amount || Number(total_amount) <= 0) {
      return res.status(400).json({ detail: 'Enter a total amount greater than 0' });
    }
    if (!['paid', 'unpaid'].includes(payment_status)) {
      return res.status(400).json({ detail: "payment_status must be 'paid' or 'unpaid'" });
    }
    const paid    = Number(paid_amount)    || 0;
    const pending = Number(pending_amount) || 0;
    const total   = Number(total_amount);
    if (Math.round((paid + pending) * 100) !== Math.round(total * 100)) {
      return res.status(400).json({ detail: `Paid + Pending must equal the total (₹${total.toFixed(2)})` });
    }

    const players = await Promise.all(cleaned.map(async (name) => {
      const customer = await getOrCreateCustomer(req.admin.clubId, name);
      return { customerId: customer._id, displayName: customer.displayName };
    }));

    const serial = await nextSerialNumber(req.admin.clubId);
    const session = await GameSession.create({
      clubId:             req.admin.clubId,
      serialNumber:       serial,
      assetId:            null,
      assetLabelOverride: asset_label.trim(),
      startTime:          new Date(start_time),
      stopTime:           new Date(stop_time),
      finalizedAt:        new Date(),
      status:             'billed',
      timeAmount:         Math.round((total - Number(food_amount || 0)) * 100) / 100,
      foodAmount:         Number(food_amount) || 0,
      totalAmount:        total,
      paymentStatus:      payment_status,
      paymentMethod:      payment_status === 'paid' ? (payment_method || 'offline') : null,
      paidAmount:         paid,
      pendingAmount:      pending,
      players,
      isManualEntry:      true,
    });

    return res.status(201).json(serializeBillingRecord(session, asset_label.trim()));
  } catch (err) {
    console.error('POST /billing/manual-entry', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * DELETE /billing/:sessionId
 */
router.delete('/:sessionId', requireAuth, async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Billing record not found' });
    await session.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /billing/:id', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

export default router;
