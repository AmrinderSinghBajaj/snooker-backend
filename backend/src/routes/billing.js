import { Router } from 'express';
import GameSession from '../models/GameSession.js';
import Asset from '../models/Asset.js';
import Customer from '../models/Customer.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission.js';
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

/** Resolve the asset label and hourly rate for a session - from linked asset or override */
async function resolveLabelAndRate(session) {
  if (session.assetId) {
    const asset = await Asset.findOne({ _id: session.assetId, clubId: session.clubId }).select('label hourlyRate');
    if (asset) return { label: asset.label, hourlyRate: asset.hourlyRate };
  }
  return { label: session.assetLabelOverride || 'Manual Entry', hourlyRate: null };
}

/**
 * POST /billing/:sessionId/stop
 */
router.post('/:sessionId/stop', requireAuth, requirePermission('billing', 'edit'), async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Session not found' });
    if (!['running', 'paused'].includes(session.status)) {
      return res.status(400).json({ detail: 'Session is not active' });
    }

    const asset = session.assetId ? await Asset.findOne({ _id: session.assetId, clubId: req.admin.clubId }) : null;

    session.preStoppedStatus = session.status;
    session.preStoppedPausedAt = session.pausedAt;

    session.stopTime = new Date();
    const { minutes, amount } = computeTimeAmount(session, asset);
    session.timeAmount  = amount;
    session.totalAmount = Math.round((amount + (session.foodAmount ?? 0)) * 100) / 100;

    session.pausedAt = null;
    session.status   = 'stopped';

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
 * POST /billing/:sessionId/cancel-stop
 */
router.post('/:sessionId/cancel-stop', requireAuth, requirePermission('billing', 'edit'), async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Session not found' });
    if (session.status !== 'stopped') {
      return res.status(400).json({ detail: 'Session is not stopped' });
    }

    const asset = session.assetId ? await Asset.findOne({ _id: session.assetId, clubId: req.admin.clubId }) : null;

    // Revert status, pausedAt and clear stop-related fields
    session.status = session.preStoppedStatus || 'running';
    session.pausedAt = session.preStoppedPausedAt || null;
    session.stopTime = null;
    session.timeAmount = null;
    session.totalAmount = session.foodAmount ?? 0;

    session.preStoppedStatus = null;
    session.preStoppedPausedAt = null;

    if (asset) {
      asset.status = 'active';
      await asset.save();
    }
    await session.save();

    return res.json({ ok: true, status: session.status });
  } catch (err) {
    console.error('POST /billing/:id/cancel-stop', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /billing/:sessionId/split
 */
router.post('/:sessionId/split', requireAuth, requirePermission('billing', 'edit'), async (req, res) => {
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
router.post('/:sessionId/done', requireAuth, requirePermission('billing', 'edit'), async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Session not found' });
    if (session.status !== 'stopped') return res.status(400).json({ detail: 'Stop the game before finalizing' });

    const { players, payer_names } = req.body;

    if (players && Array.isArray(players) && players.length > 0) {
      if (players.length > 6) {
        return res.status(422).json({ detail: 'Enter up to 6 player names' });
      }

      // Verify split sum matches totalAmount with small tolerance
      const sum = players.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      if (Math.abs(sum - session.totalAmount) > 0.1) {
        return res.status(422).json({ detail: `Sum of split amounts (₹${sum.toFixed(2)}) must equal total bill amount (₹${session.totalAmount.toFixed(2)})` });
      }

      // Resolve all customers
      const resolvedPlayers = await Promise.all(
        players.map(async (p) => {
          const customer = await getOrCreateCustomer(req.admin.clubId, p.name);
          const share = Number(p.amount) || 0;
          const discType = p.discountType || 'none';
          const discVal = Number(p.discountValue) || 0;
          const discAmt = Number(p.discountAmount) || 0;
          const net = Number(p.netAmount) !== undefined ? Number(p.netAmount) : (share - discAmt);
          return {
            customerId: customer._id,
            displayName: customer.displayName,
            amount: share,
            discountType: discType,
            discountValue: discVal,
            discountAmount: discAmt,
            netAmount: net
          };
        })
      );

      const M = resolvedPlayers.length;
      if (M > 1) {
        // Multi-payer custom split flow
        const totalAmount = session.totalAmount || 1;
        const firstPayer = resolvedPlayers[0];
        const ratio0 = firstPayer.amount / totalAmount;
        const shareTime0 = Math.round((session.timeAmount * ratio0) * 100) / 100;
        const shareFood0 = Math.round((session.foodAmount * ratio0) * 100) / 100;

        session.players = [{
          customerId: firstPayer.customerId,
          displayName: firstPayer.displayName,
          isPayer: true,
          shareAmount: firstPayer.amount,
          discountType: firstPayer.discountType,
          discountValue: firstPayer.discountValue,
          discountAmount: firstPayer.discountAmount,
          netAmount: firstPayer.netAmount,
        }];
        session.timeAmount = shareTime0;
        session.foodAmount = shareFood0;
        session.totalAmount = firstPayer.netAmount;
        session.paymentStatus = firstPayer.netAmount === 0 ? 'paid' : 'unpaid';
        session.paidAmount = 0;
        session.pendingAmount = firstPayer.netAmount === 0 ? 0 : firstPayer.netAmount;
        session.paymentMethod = firstPayer.netAmount === 0 ? 'offline' : null;
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
          const payer = resolvedPlayers[i];
          const ratioI = payer.amount / totalAmount;
          const shareTimeI = Math.round((session.timeAmount * ratioI) * 100) / 100;
          const shareFoodI = Math.round((session.foodAmount * ratioI) * 100) / 100;

          await GameSession.create({
            clubId: req.admin.clubId,
            serialNumber: baseSerial++,
            assetId: session.assetId,
            assetLabelOverride: session.assetLabelOverride,
            startTime: session.startTime,
            stopTime: session.stopTime,
            finalizedAt: session.finalizedAt,
            status: 'billed',
            timeAmount: shareTimeI,
            foodAmount: shareFoodI,
            totalAmount: payer.netAmount,
            paymentStatus: payer.netAmount === 0 ? 'paid' : 'unpaid',
            paidAmount: 0,
            pendingAmount: payer.netAmount === 0 ? 0 : payer.netAmount,
            paymentMethod: payer.netAmount === 0 ? 'offline' : null,
            players: [{
              customerId: payer.customerId,
              displayName: payer.displayName,
              isPayer: true,
              shareAmount: payer.amount,
              discountType: payer.discountType,
              discountValue: payer.discountValue,
              discountAmount: payer.discountAmount,
              netAmount: payer.netAmount,
            }],
            foodOrders: [],
            isManualEntry: session.isManualEntry,
          });
        }
      } else {
        // Single payer custom split flow
        const firstPayer = resolvedPlayers[0];
        session.players = [{
          customerId: firstPayer.customerId,
          displayName: firstPayer.displayName,
          isPayer: true,
          shareAmount: session.totalAmount,
          discountType: firstPayer.discountType,
          discountValue: firstPayer.discountValue,
          discountAmount: firstPayer.discountAmount,
          netAmount: firstPayer.netAmount,
        }];
        session.status        = 'billed';
        session.finalizedAt   = new Date();
        session.paymentStatus = firstPayer.netAmount === 0 ? 'paid' : 'unpaid';
        session.paidAmount    = 0;
        session.totalAmount   = firstPayer.netAmount;
        session.pendingAmount = firstPayer.netAmount === 0 ? 0 : firstPayer.netAmount;
        session.paymentMethod = firstPayer.netAmount === 0 ? 'offline' : null;

        if (session.assetId) {
          const asset = await Asset.findOne({ _id: session.assetId, clubId: req.admin.clubId });
          if (asset) {
            asset.status = 'idle';
            await asset.save();
          }
        }
        await session.save();
      }
    } else {
      // Fallback to equal split / payer names
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
    }

    const { label, hourlyRate } = await resolveLabelAndRate(session);
    return res.json(serializeBillingRecord(session, label, hourlyRate));
  } catch (err) {
    console.error('POST /billing/:id/done', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /billing/records
 */
router.get('/records', requireAuth, requirePermission('billing', 'view'), async (req, res) => {
  try {
    const sessions = await GameSession.find({ clubId: req.admin.clubId, status: 'billed' }).sort({ serialNumber: -1 });

    const result = await Promise.all(sessions.map(async (s) => {
      const { label, hourlyRate } = await resolveLabelAndRate(s);
      return serializeBillingRecord(s, label, hourlyRate);
    }));

    return res.json(result);
  } catch (err) {
    console.error('GET /billing/records', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/:sessionId/paid', requireAuth, requirePermission('billing', 'edit'), async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Session not found' });

    const { payment_method, amount_received, wallet_amount, online_amount, offline_amount, settle_past_outstanding } = req.body || {};
    const method = ['online', 'offline', 'wallet', 'split'].includes(payment_method) ? payment_method : 'offline';

    const billDue = (session.pendingAmount !== undefined && session.pendingAmount > 0)
      ? session.pendingAmount
      : (session.totalAmount ?? 0);

    const receivedNum = amount_received !== undefined && amount_received !== null && amount_received !== ''
      ? Number(amount_received)
      : billDue;

    if (isNaN(receivedNum) || receivedNum <= 0) {
      return res.status(400).json({ detail: 'Amount received must be greater than 0.' });
    }

    let totalWallet = 0;
    let totalOnline = 0;
    let totalOffline = 0;

    if (method === 'wallet') {
      totalWallet = receivedNum;
    } else if (method === 'online') {
      totalOnline = receivedNum;
    } else if (method === 'offline') {
      totalOffline = receivedNum;
    } else if (method === 'split') {
      totalWallet = Math.max(0, Number(wallet_amount) || 0);
      totalOnline = Math.max(0, Number(online_amount) || 0);
      totalOffline = Math.max(0, Number(offline_amount) || 0);
      if (Math.round((totalWallet + totalOnline + totalOffline) * 100) !== Math.round(receivedNum * 100)) {
        return res.status(400).json({ detail: `Split payment amounts (₹${(totalWallet + totalOnline + totalOffline).toFixed(2)}) must equal total amount paid (₹${receivedNum.toFixed(2)})` });
      }
    }

    // Resolve customer for payer
    let customer = null;
    if (session.players && session.players.length > 0) {
      const player = session.players.find(p => p.isPayer) || session.players[0];
      if (player.customerId) {
        customer = await Customer.findOne({ _id: player.customerId, clubId: req.admin.clubId });
      }
      if (!customer && player.displayName) {
        customer = await getOrCreateCustomer(req.admin.clubId, player.displayName);
      }
    }

    let remainingWallet = totalWallet;
    let remainingOnline = totalOnline;
    let remainingOffline = totalOffline;

    const allocateFunds = async (sessionObj, amountNeeded) => {
      let wUsed = Math.min(remainingWallet, amountNeeded);
      remainingWallet = Math.round((remainingWallet - wUsed) * 100) / 100;
      amountNeeded = Math.round((amountNeeded - wUsed) * 100) / 100;

      let oUsed = Math.min(remainingOnline, amountNeeded);
      remainingOnline = Math.round((remainingOnline - oUsed) * 100) / 100;
      amountNeeded = Math.round((amountNeeded - oUsed) * 100) / 100;

      let offUsed = Math.min(remainingOffline, amountNeeded);
      remainingOffline = Math.round((remainingOffline - offUsed) * 100) / 100;
      amountNeeded = Math.round((amountNeeded - offUsed) * 100) / 100;

      const totalPaidThisSession = wUsed + oUsed + offUsed;
      sessionObj.paidAmount = Math.round(((sessionObj.paidAmount || 0) + totalPaidThisSession) * 100) / 100;
      
      const oldPending = (sessionObj.pendingAmount !== undefined && sessionObj.pendingAmount > 0)
        ? sessionObj.pendingAmount
        : (sessionObj.totalAmount ?? 0);
      sessionObj.pendingAmount = Math.max(0, Math.round((oldPending - totalPaidThisSession) * 100) / 100);
      sessionObj.paymentStatus = sessionObj.pendingAmount === 0 ? 'paid' : 'unpaid';

      sessionObj.walletPaidAmount = (sessionObj.walletPaidAmount || 0) + wUsed;
      sessionObj.onlinePaidAmount = (sessionObj.onlinePaidAmount || 0) + oUsed;
      sessionObj.offlinePaidAmount = (sessionObj.offlinePaidAmount || 0) + offUsed;
      
      if (wUsed > 0 && (oUsed > 0 || offUsed > 0)) {
        sessionObj.paymentMethod = 'split';
      } else if (wUsed > 0) {
        sessionObj.paymentMethod = 'wallet';
      } else if (oUsed > 0) {
        sessionObj.paymentMethod = 'online';
      } else {
        sessionObj.paymentMethod = 'offline';
      }

      await sessionObj.save();

      if (wUsed > 0 && customer) {
        const available = customer.walletBalance || 0;
        const newBalance = Math.round((available - wUsed) * 100) / 100;
        customer.walletBalance = newBalance;
        await customer.save();

        await WalletTransaction.create({
          clubId: req.admin.clubId,
          customerId: customer._id,
          type: 'debit',
          amount: wUsed,
          balanceAfter: newBalance,
          description: `Bill #${sessionObj.serialNumber} Payment`,
          sessionId: sessionObj._id,
          paymentMethod: sessionObj.paymentMethod,
        });
      }
    };

    // 1. Pay today's session
    const currentSessionPaidAmount = Math.min(receivedNum, billDue);
    await allocateFunds(session, currentSessionPaidAmount);

    // 2. Settle past outstanding if checked and remaining money is present
    if (settle_past_outstanding && customer) {
      const remainingFunds = Math.round((remainingWallet + remainingOnline + remainingOffline) * 100) / 100;
      if (remainingFunds > 0) {
        const unpaidSessions = await GameSession.find({
          clubId: req.admin.clubId,
          paymentStatus: 'unpaid',
          _id: { $ne: session._id },
          $or: [
            { 'players.customerId': customer._id },
            { 'players.displayName': customer.displayName }
          ]
        }).sort({ startTime: 1 });

        for (const s of unpaidSessions) {
          const fundsAvailable = Math.round((remainingWallet + remainingOnline + remainingOffline) * 100) / 100;
          if (fundsAvailable <= 0) break;
          const due = s.pendingAmount || 0;
          if (due <= 0) continue;
          await allocateFunds(s, Math.min(fundsAvailable, due));
        }
      }
    }

    // 3. Credit remaining surplus to advance wallet
    const surplus = Math.round((remainingWallet + remainingOnline + remainingOffline) * 100) / 100;
    if (surplus > 0 && customer) {
      const curBalance = customer.walletBalance || 0;
      const newBalance = Math.round((curBalance + surplus) * 100) / 100;
      customer.walletBalance = newBalance;
      await customer.save();

      await WalletTransaction.create({
        clubId: req.admin.clubId,
        customerId: customer._id,
        type: 'credit',
        amount: surplus,
        balanceAfter: newBalance,
        description: `Overpayment credit from Bill #${session.serialNumber}`,
        sessionId: session._id,
        paymentMethod: method === 'split' ? 'offline' : method,
      });
    }

    const { label, hourlyRate } = await resolveLabelAndRate(session);
    return res.json(serializeBillingRecord(session, label, hourlyRate));
  } catch (err) {
    console.error('POST /billing/:id/paid', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /billing/outstanding/settle
 * Settle past outstanding dues directly
 */
router.post('/outstanding/settle', requireAuth, requirePermission('billing', 'edit'), async (req, res) => {
  try {
    const { playerName, customerId, amount_received, payment_method, wallet_amount, online_amount, offline_amount } = req.body || {};
    const method = ['online', 'offline', 'wallet', 'split'].includes(payment_method) ? payment_method : 'offline';

    const receivedNum = Number(amount_received);
    if (isNaN(receivedNum) || receivedNum <= 0) {
      return res.status(400).json({ detail: 'Amount received must be greater than 0.' });
    }

    let customer = null;
    if (customerId) {
      customer = await Customer.findOne({ _id: customerId, clubId: req.admin.clubId });
    } else if (playerName) {
      customer = await Customer.findOne({ displayName: playerName.trim(), clubId: req.admin.clubId });
      if (!customer) {
        customer = await getOrCreateCustomer(req.admin.clubId, playerName.trim());
      }
    }

    if (!customer) {
      return res.status(404).json({ detail: 'Customer not found' });
    }

    let totalWallet = 0;
    let totalOnline = 0;
    let totalOffline = 0;

    if (method === 'wallet') {
      totalWallet = receivedNum;
    } else if (method === 'online') {
      totalOnline = receivedNum;
    } else if (method === 'offline') {
      totalOffline = receivedNum;
    } else if (method === 'split') {
      totalWallet = Math.max(0, Number(wallet_amount) || 0);
      totalOnline = Math.max(0, Number(online_amount) || 0);
      totalOffline = Math.max(0, Number(offline_amount) || 0);
      if (Math.round((totalWallet + totalOnline + totalOffline) * 100) !== Math.round(receivedNum * 100)) {
        return res.status(400).json({ detail: `Split payment amounts (₹${(totalWallet + totalOnline + totalOffline).toFixed(2)}) must equal total amount paid (₹${receivedNum.toFixed(2)})` });
      }
    }

    let remainingWallet = totalWallet;
    let remainingOnline = totalOnline;
    let remainingOffline = totalOffline;

    const allocateFunds = async (sessionObj, amountNeeded) => {
      let wUsed = Math.min(remainingWallet, amountNeeded);
      remainingWallet = Math.round((remainingWallet - wUsed) * 100) / 100;
      amountNeeded = Math.round((amountNeeded - wUsed) * 100) / 100;

      let oUsed = Math.min(remainingOnline, amountNeeded);
      remainingOnline = Math.round((remainingOnline - oUsed) * 100) / 100;
      amountNeeded = Math.round((amountNeeded - oUsed) * 100) / 100;

      let offUsed = Math.min(remainingOffline, amountNeeded);
      remainingOffline = Math.round((remainingOffline - offUsed) * 100) / 100;
      amountNeeded = Math.round((amountNeeded - offUsed) * 100) / 100;

      const totalPaidThisSession = wUsed + oUsed + offUsed;
      sessionObj.paidAmount = Math.round(((sessionObj.paidAmount || 0) + totalPaidThisSession) * 100) / 100;
      
      const oldPending = (sessionObj.pendingAmount !== undefined && sessionObj.pendingAmount > 0)
        ? sessionObj.pendingAmount
        : (sessionObj.totalAmount ?? 0);
      sessionObj.pendingAmount = Math.max(0, Math.round((oldPending - totalPaidThisSession) * 100) / 100);
      sessionObj.paymentStatus = sessionObj.pendingAmount === 0 ? 'paid' : 'unpaid';

      sessionObj.walletPaidAmount = (sessionObj.walletPaidAmount || 0) + wUsed;
      sessionObj.onlinePaidAmount = (sessionObj.onlinePaidAmount || 0) + oUsed;
      sessionObj.offlinePaidAmount = (sessionObj.offlinePaidAmount || 0) + offUsed;
      
      if (wUsed > 0 && (oUsed > 0 || offUsed > 0)) {
        sessionObj.paymentMethod = 'split';
      } else if (wUsed > 0) {
        sessionObj.paymentMethod = 'wallet';
      } else if (oUsed > 0) {
        sessionObj.paymentMethod = 'online';
      } else {
        sessionObj.paymentMethod = 'offline';
      }

      await sessionObj.save();

      if (wUsed > 0 && customer) {
        const available = customer.walletBalance || 0;
        const newBalance = Math.round((available - wUsed) * 100) / 100;
        customer.walletBalance = newBalance;
        await customer.save();

        await WalletTransaction.create({
          clubId: req.admin.clubId,
          customerId: customer._id,
          type: 'debit',
          amount: wUsed,
          balanceAfter: newBalance,
          description: `Bill #${sessionObj.serialNumber} Payment`,
          sessionId: sessionObj._id,
          paymentMethod: sessionObj.paymentMethod,
        });
      }
    };

    // Find older unpaid sessions
    const unpaidSessions = await GameSession.find({
      clubId: req.admin.clubId,
      paymentStatus: 'unpaid',
      $or: [
        { 'players.customerId': customer._id },
        { 'players.displayName': customer.displayName }
      ]
    }).sort({ startTime: 1 });

    for (const s of unpaidSessions) {
      const fundsAvailable = Math.round((remainingWallet + remainingOnline + remainingOffline) * 100) / 100;
      if (fundsAvailable <= 0) break;
      const due = s.pendingAmount || 0;
      if (due <= 0) continue;
      await allocateFunds(s, Math.min(fundsAvailable, due));
    }

    // Surplus goes to wallet
    const surplus = Math.round((remainingWallet + remainingOnline + remainingOffline) * 100) / 100;
    if (surplus > 0) {
      const curBalance = customer.walletBalance || 0;
      const newBalance = Math.round((curBalance + surplus) * 100) / 100;
      customer.walletBalance = newBalance;
      await customer.save();

      await WalletTransaction.create({
        clubId: req.admin.clubId,
        customerId: customer._id,
        type: 'credit',
        amount: surplus,
        balanceAfter: newBalance,
        description: `Direct outstanding payment surplus`,
        paymentMethod: method === 'split' ? 'offline' : method,
      });
    }

    return res.json({ success: true, walletBalance: customer.walletBalance });
  } catch (err) {
    console.error('POST /billing/outstanding/settle', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /billing/:sessionId/unpaid
 */
router.post('/:sessionId/unpaid', requireAuth, requirePermission('billing', 'edit'), async (req, res) => {
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

    const { label, hourlyRate } = await resolveLabelAndRate(session);
    return res.json(serializeBillingRecord(session, label, hourlyRate));
  } catch (err) {
    console.error('POST /billing/:id/unpaid', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * GET /billing/:sessionId/detail
 */
router.get('/:sessionId/detail', requireAuth, requirePermission('billing', 'view'), async (req, res) => {
  try {
    const session = await GameSession.findOne({ _id: req.params.sessionId, clubId: req.admin.clubId });
    if (!session) return res.status(404).json({ detail: 'Session not found' });

    const { label } = await resolveLabelAndRate(session);
    return res.json(serializeSessionDetail(session, label));
  } catch (err) {
    console.error('GET /billing/:id/detail', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * PUT /billing/:sessionId/edit
 */
router.put('/:sessionId/edit', requireAuth, requirePermission('billing', 'edit'), async (req, res) => {
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

    const { label, hourlyRate } = await resolveLabelAndRate(session);
    return res.json(serializeBillingRecord(session, label, hourlyRate));
  } catch (err) {
    console.error('PUT /billing/:id/edit', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

/**
 * POST /billing/manual-entry
 */
router.post('/manual-entry', requireAuth, requirePermission('billing', 'edit'), async (req, res) => {
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
router.delete('/:sessionId', requireAuth, requirePermission('billing', 'delete'), async (req, res) => {
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
